import type { ClientGallery, ClientGalleryAsset } from "./contracts";

const GALLERY_ID = /^g_[A-Za-z0-9_-]{16,64}$/;
const ASSET_ID = /^a_[A-Za-z0-9_-]{16,64}$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

// Call after hydration. Clear even malformed fragments before any API request.
export function takeGalleryFragment(): string | null {
  const fragment = window.location.hash;
  if (!fragment) return null;
  window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  const match = /^#access=([A-Za-z0-9_-]{43})$/.exec(fragment);
  return match?.[1] ?? "";
}

async function jsonRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(path, { ...init, signal: controller.signal,
      credentials: "same-origin", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer" });
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
      throw new Error("Gallery unavailable");
    return await response.json();
  } finally { clearTimeout(timeout); }
}

function validateGallery(value: unknown, id: string): ClientGallery {
  if (!value || typeof value !== "object") throw new Error("Gallery unavailable");
  const g = value as ClientGallery;
  if (g.id !== id || typeof g.title !== "string" || !g.title || g.title.length > 200 ||
      (g.clientDisplayName !== undefined && (typeof g.clientDisplayName !== "string" || g.clientDisplayName.length > 200)) ||
      (g.message !== undefined && (typeof g.message !== "string" || g.message.length > 2000)) ||
      typeof g.expiresAt !== "string" || !Number.isFinite(Date.parse(g.expiresAt)) ||
      !Array.isArray(g.assets) || g.assets.length > 250) throw new Error("Gallery unavailable");
  const seen = new Set<string>();
  const assets: ClientGalleryAsset[] = g.assets.map(a => {
    if (!a || typeof a.id !== "string" || !ASSET_ID.test(a.id) || seen.has(a.id)) throw new Error("Gallery unavailable");
    seen.add(a.id);
    const path = `/api/galleries/${id}/assets/${a.id}`;
    if (typeof a.altText !== "string" || a.altText.length > 500 ||
        !Number.isSafeInteger(a.width) || a.width < 1 || a.width > 30000 ||
        !Number.isSafeInteger(a.height) || a.height < 1 || a.height > 30000 ||
        !Number.isSafeInteger(a.displayOrder) || a.displayOrder < 0 ||
        !["portrait", "landscape", "square"].includes(a.orientation) ||
        a.webImageUrl !== `${path}/view` || a.webDownloadUrl !== `${path}/web` || a.fullDownloadUrl !== `${path}/full`)
      throw new Error("Gallery unavailable");
    return { id: a.id, altText: a.altText, width: a.width, height: a.height,
      orientation: a.orientation, displayOrder: a.displayOrder, webImageUrl: a.webImageUrl,
      webDownloadUrl: a.webDownloadUrl, fullDownloadUrl: a.fullDownloadUrl };
  });
  // Whitelist fields rather than retaining raw API records in component state.
  return { id, title: g.title, clientDisplayName: g.clientDisplayName,
    message: g.message, expiresAt: g.expiresAt, assets };
}

export async function loadClientGallery(id: string, token: string | null = null): Promise<ClientGallery> {
  if (!GALLERY_ID.test(id)) throw new Error("Gallery unavailable");
  if (token !== null) {
    if (!TOKEN.test(token)) throw new Error("Gallery unavailable");
    const result = await jsonRequest(`/api/galleries/${id}/exchange`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
    });
    if (!result || typeof result !== "object" || !("success" in result) || result.success !== true)
      throw new Error("Gallery unavailable");
  }
  return validateGallery(await jsonRequest(`/api/galleries/${id}`), id);
}

export async function logoutClientGallery(id: string): Promise<void> {
  if (!GALLERY_ID.test(id)) throw new Error("Gallery unavailable");
  const result = await jsonRequest(`/api/galleries/${id}/logout`, { method: "POST" });
  if (!result || typeof result !== "object" || !("success" in result) || result.success !== true)
    throw new Error("Gallery unavailable");
}

// One coordinator per shell, shared by every keyed loader. Serialize the whole
// request lifecycle: even an obsolete response can still change HttpOnly cookies.
// Rejections reach the caller but do not poison subsequent operations.
export function createGallerySessionCoordinator() {
  let pending: Promise<unknown> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  }
  return {
    load: (id: string, token: string | null = null) => enqueue(() => loadClientGallery(id, token)),
    logout: (id: string) => enqueue(() => logoutClientGallery(id)),
  };
}
