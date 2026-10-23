import type { Cookie, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  GALLERY_ID, GALLERY_TOKEN, createGallerySession, galleryCookieName,
  galleryIsAvailable, readGallerySession, sessionMatches, tokenMatches,
  validateGalleryKey, type GalleryAccessStore,
} from "./galleryAccess";

interface Dependencies {
  store: GalleryAccessStore;
  secret: string;
  origin: string;
  now?: () => number;
}

export const GALLERY_HEADERS = {
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export function galleryResponse(status: number, jsonBody: unknown): HttpResponseInit {
  return { status, headers: GALLERY_HEADERS, jsonBody };
}

const unavailable = () => galleryResponse(404, { message: "Gallery unavailable." });

function cookie(id: string, value: string, maxAge: number): Cookie {
  return { name: galleryCookieName(id), value, path: "/", secure: true,
    httpOnly: true, sameSite: "Strict", maxAge };
}

function readCookie(request: HttpRequest, name: string): string {
  const values = (request.headers.get("cookie") ?? "").split(";")
    .map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  // Ambiguous duplicate cookies are never accepted.
  return values.length === 1 ? values[0].slice(name.length + 1) : "";
}

export async function authorizeGalleryRequest(request: HttpRequest, dependencies: Pick<Dependencies, "store" | "secret" | "now">) {
  const id = request.params.galleryId;
  if (!id || !GALLERY_ID.test(id)) return null;
  const time = (dependencies.now ?? Date.now)();
  const session = readGallerySession(readCookie(request, galleryCookieName(id)), id, dependencies.secret, time);
  if (!session) return null;
  const record = await dependencies.store.readGallery(id);
  const checkedAt = (dependencies.now ?? Date.now)();
  return record && sessionMatches(record, session, checkedAt, dependencies.secret) ? record : null;
}

async function boundedJson(request: HttpRequest): Promise<unknown> {
  if (!request.body) throw new Error("Missing body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}

export function createGalleryHandlers(dependencies: Dependencies) {
  validateGalleryKey(dependencies.secret);
  const { store, secret, origin } = dependencies;
  const now = dependencies.now ?? Date.now;
  const sameOrigin = (r: HttpRequest) => r.headers.get("origin") === origin &&
    !["cross-site", "same-site"].includes(r.headers.get("sec-fetch-site") ?? "");

  async function exchange(request: HttpRequest): Promise<HttpResponseInit> {
    if (request.method !== "POST") return galleryResponse(405, { message: "Method not allowed." });
    if (!sameOrigin(request)) return galleryResponse(403, { message: "Request unavailable." });
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
      return galleryResponse(415, { message: "JSON required." });
    let body: unknown;
    try { body = await boundedJson(request); }
    catch { return galleryResponse(400, { message: "Invalid request." }); }
    const { token } = (body && typeof body === "object" ? body : {}) as { token?: unknown };
    const id = request.params.galleryId;
    if (!id || !GALLERY_ID.test(id) || typeof token !== "string" || !GALLERY_TOKEN.test(token)) return unavailable();
    const time = now();
    if (!await store.consumeExchange(time))
      return { ...galleryResponse(429, { message: "Please try again later." }), headers: { ...GALLERY_HEADERS, "Retry-After": "300" } };
    const record = await store.readGallery(id);
    const checkedAt = now();
    if (!record || !galleryIsAvailable(record, checkedAt) || !tokenMatches(record, token, secret)) return unavailable();
    const session = createGallerySession(record, secret, checkedAt);
    return { ...galleryResponse(200, { success: true }),
      cookies: [cookie(id, session.value, Math.floor((session.expiresAt - checkedAt) / 1000))] };
  }

  async function metadata(request: HttpRequest): Promise<HttpResponseInit> {
    if (request.method !== "GET") return galleryResponse(405, { message: "Method not allowed." });
    // No in-process authorization cache: revocation and expiry are rechecked.
    const record = await authorizeGalleryRequest(request, dependencies);
    if (!record) return unavailable();
    return galleryResponse(200, { id: record.id, title: record.title,
      clientDisplayName: record.clientDisplayName, message: record.message,
      expiresAt: new Date(record.expiresAt).toISOString(), assets: [] });
  }

  async function logout(request: HttpRequest): Promise<HttpResponseInit> {
    if (request.method !== "POST") return galleryResponse(405, { message: "Method not allowed." });
    if (!sameOrigin(request)) return galleryResponse(403, { message: "Request unavailable." });
    const id = request.params.galleryId;
    if (!id || !GALLERY_ID.test(id)) return unavailable();
    // Local sign-out. Server-side revocation increments the gallery version.
    return { ...galleryResponse(200, { success: true }), cookies: [cookie(id, "", 0)] };
  }

  function protect(handler: (request: HttpRequest) => Promise<HttpResponseInit>) {
    return async (request: HttpRequest, context: InvocationContext) => {
      try { return await handler(request); }
      catch {
        context.error("[gallery-api] Request failed");
        return galleryResponse(503, { message: "Gallery temporarily unavailable." });
      }
    };
  }
  return { exchange: protect(exchange), metadata: protect(metadata), logout: protect(logout) };
}
