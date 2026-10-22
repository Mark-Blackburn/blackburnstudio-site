import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import type { GalleryAccessStore } from "./galleryAccess";
import type { GalleryAssetStore, GalleryBlobStore } from "./azureGalleryDelivery";
import { ASSET_ID, assetBlobName, toClientAsset } from "./galleryAssets";
import { authorizeGalleryRequest, GALLERY_HEADERS, galleryResponse } from "./galleryHttp";

interface Dependencies {
  store: GalleryAccessStore;
  secret: string;
  assets: GalleryAssetStore;
  blobs: GalleryBlobStore;
  now?: () => number;
}

export function createGalleryDeliveryHandlers(dependencies: Dependencies) {
  const unavailable = () => galleryResponse(404, { message: "Gallery unavailable." });
  async function metadata(request: HttpRequest): Promise<HttpResponseInit> {
    const record = await authorizeGalleryRequest(request, dependencies);
    if (!record) return unavailable();
    const assets = await dependencies.assets.listAssets(record.id);
    if (!await authorizeGalleryRequest(request, dependencies)) return unavailable();
    return galleryResponse(200, { id: record.id, title: record.title,
      clientDisplayName: record.clientDisplayName, message: record.message,
      expiresAt: new Date(record.expiresAt).toISOString(), assets: assets.map(toClientAsset) });
  }

  async function image(request: HttpRequest): Promise<HttpResponseInit> {
    const record = await authorizeGalleryRequest(request, dependencies);
    if (!record) return unavailable();
    const { assetId, variant } = request.params;
    if (!assetId || !ASSET_ID.test(assetId) || !["view", "web", "full"].includes(variant)) return unavailable();
    const asset = await dependencies.assets.readAsset(record.id, assetId);
    if (!asset) return unavailable();
    const full = variant === "full";
    const body = await dependencies.blobs.read(assetBlobName(asset, full), full ? asset.fullByteSize : asset.webByteSize);
    // Recheck after storage IO so a revoked/expired session cannot start a new response.
    if (!await authorizeGalleryRequest(request, dependencies)) return unavailable();
    return { status: 200, body,
      headers: { ...GALLERY_HEADERS, "Content-Type": "image/jpeg", "Content-Length": String(body.length),
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": variant === "view" ? "inline" :
          `attachment; filename="blackburnstudio-${asset.id}-${full ? "full" : "web"}.jpg"` } };
  }

  function protect(handler: (r: HttpRequest) => Promise<HttpResponseInit>) {
    return async (request: HttpRequest, context: InvocationContext) => {
      if (request.method !== "GET") return galleryResponse(405, { message: "Method not allowed." });
      try { return await handler(request); }
      catch {
        context.error("[gallery-api] Request failed");
        return galleryResponse(503, { message: "Gallery temporarily unavailable." });
      }
    };
  }
  return { metadata: protect(metadata), image: protect(image) };
}
