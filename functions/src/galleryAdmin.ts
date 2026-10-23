import { GalleryUploadValidationError } from "./galleryUploadValidation";
import { randomBytes } from "node:crypto";
import type { HttpRequest, InvocationContext } from "@azure/functions";
import {
  GALLERY_ID,
  hashGalleryToken,
  validRecord,
  type GalleryAccessRecord,
} from "./galleryAccess";
import { galleryResponse } from "./galleryHttp";

export type AdminGallery = Pick<
  GalleryAccessRecord,
  | "id"
  | "title"
  | "clientDisplayName"
  | "message"
  | "status"
  | "expiresAt"
  | "accessTokenVersion"
>;
export const adminGallery = (r: GalleryAccessRecord): AdminGallery => ({
  id: r.id,
  title: r.title,
  clientDisplayName: r.clientDisplayName,
  message: r.message,
  status: r.status,
  expiresAt: r.expiresAt,
  accessTokenVersion: r.accessTokenVersion,
});
export interface GalleryAdminStore {
  get(id: string): Promise<AdminGallery>;
  list(
    cursor?: string,
  ): Promise<{ galleries: AdminGallery[]; cursor?: string }>;
  create(record: GalleryAccessRecord): Promise<void>;
  change(
    id: string,
    action: "revoke" | "replace",
    tokenHash?: string,
  ): Promise<number>;
  upload(id: string, web: Buffer, full: Buffer, altText: string): Promise<void>;
}

// Trust only behind SWA's linked-backend ingress authentication. A gallery cookie
// never grants operator privileges. The platform strips caller-supplied principals.
export function isGalleryAdmin(request: HttpRequest): boolean {
  const header = request.headers.get("x-ms-client-principal");
  if (!header || header.length > 8192) return false;
  try {
    const p = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
    return (
      p.identityProvider === "aad" &&
      typeof p.userId === "string" &&
      p.userId.length > 0 &&
      Array.isArray(p.userRoles) &&
      p.userRoles.includes("authenticated") &&
      p.userRoles.includes("gallery_admin")
    );
  } catch {
    return false;
  }
}

export async function readAdminBody(
  request: HttpRequest,
  limit: number,
): Promise<Buffer> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error("Body too large");
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export function createGalleryAdminHandler(deps: {
  store: GalleryAdminStore;
  origin: string;
  secret: string;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  return async (request: HttpRequest, context: InvocationContext) => {
    if (!isGalleryAdmin(request))
      return galleryResponse(403, {
        message: "Gallery administrator access required.",
      });
    if (
      request.method !== "GET" &&
      request.headers.get("origin") !== deps.origin
    )
      return galleryResponse(403, { message: "Invalid request origin." });
    const id = request.params.galleryId;
    if (id && (!GALLERY_ID.test(id) || id === "g_7Rk3mN9xQ2vL8pT4"))
      return galleryResponse(400, { message: "Invalid gallery." });
    try {
      if (
        request.method === "GET" &&
        id &&
        request.params.action === "details"
      ) {
        return galleryResponse(200, { gallery: await deps.store.get(id) });
      }
      if (request.method === "GET" && !id) {
        const cursor = request.query.get("cursor") ?? undefined;
        if (cursor && cursor.length > 8192)
          return galleryResponse(400, { message: "Invalid page." });
        return galleryResponse(200, await deps.store.list(cursor));
      }
      if (request.method !== "POST")
        return galleryResponse(405, { message: "Method not allowed." });
      if (id && request.params.action === "assets") {
        const type = request.headers.get("content-type") ?? "";
        if (!type.startsWith("multipart/form-data;"))
          return galleryResponse(400, { message: "JPEG upload required." });
        const bytes = await readAdminBody(request, 25 * 1024 * 1024);
        const form = await new Response(new Uint8Array(bytes), {
          headers: { "Content-Type": type },
        }).formData();
        const web = form.get("web");
        const full = form.get("full");
        const altText = form.get("altText");
        if (
          !web ||
          typeof web === "string" ||
          !full ||
          typeof full === "string" ||
          typeof altText !== "string" ||
          altText.length > 500 ||
          form.getAll("web").length !== 1 ||
          form.getAll("full").length !== 1
        )
          return galleryResponse(400, {
            message: "Provide one web and full JPEG pair.",
          });
        await deps.store.upload(
          id,
          Buffer.from(await web.arrayBuffer()),
          Buffer.from(await full.arrayBuffer()),
          altText,
        );
        return galleryResponse(201, { success: true });
      }
      if (
        !(request.headers.get("content-type") ?? "").startsWith(
          "application/json",
        )
      )
        return galleryResponse(400, { message: "JSON required." });
      const input = JSON.parse(
        (await readAdminBody(request, 8192)).toString("utf8"),
      );
      if (!input || typeof input !== "object" || Array.isArray(input))
        return galleryResponse(400, { message: "Invalid gallery details." });
      if (!id) {
        const galleryId = `g_${randomBytes(16).toString("base64url")}`;
        const token = randomBytes(32).toString("base64url");
        const record: GalleryAccessRecord = {
          id: galleryId,
          title: input.title,
          clientDisplayName: input.clientDisplayName ?? "",
          message: input.message ?? "",
          status: "published",
          expiresAt: Date.parse(input.expiresAt),
          accessTokenHash: hashGalleryToken(deps.secret, galleryId, token),
          accessTokenVersion: 1,
          sessionVersion: 1,
        };
        if (
          !validRecord(record, galleryId) ||
          record.expiresAt <= now() ||
          record.expiresAt > now() + 366 * 86400_000
        )
          return galleryResponse(400, {
            message: "Enter a title and an expiry within the next year.",
          });
        await deps.store.create(record);
        return galleryResponse(201, {
          gallery: adminGallery(record),
          accessTokenVersion: record.accessTokenVersion,
          link: `${deps.origin}/clients/${galleryId}#access=${token}`,
        });
      }
      if (request.params.action === "revoke") {
        await deps.store.change(id, "revoke");
        return galleryResponse(200, { success: true });
      }
      if (request.params.action === "replace") {
        const token = randomBytes(32).toString("base64url");
        const accessTokenVersion = await deps.store.change(
          id,
          "replace",
          hashGalleryToken(deps.secret, id, token),
        );
        return galleryResponse(200, {
          accessTokenVersion,
          link: `${deps.origin}/clients/${id}#access=${token}`,
        });
      }
      return galleryResponse(404, { message: "Unknown operation." });
    } catch (error) {
      if (error instanceof GalleryUploadValidationError)
        return galleryResponse(400, { message: error.message });
      if (error instanceof SyntaxError)
        return galleryResponse(400, { message: "Invalid request." });
      context.error("[gallery-admin] Operation failed");
      return galleryResponse(409, {
        message:
          "Operation could not be confirmed. Refresh the gallery list before retrying; an upload may have completed.",
      });
    }
  };
}
