import type { ClientGalleryAsset } from "../../lib/client-galleries/contracts";

export const ASSET_ID = /^a_[A-Za-z0-9_-]{16,64}$/;
import { MAX_WEB_BYTES, MAX_FULL_BYTES } from "../../lib/client-galleries/limits";
export { MAX_GALLERY_ASSETS, MAX_WEB_BYTES, MAX_FULL_BYTES } from "../../lib/client-galleries/limits";

// Only JPEGs in deterministic gallery/asset namespaces are supported initially.
// No stored URL, filename or Blob path can select a different storage object.
export interface PrivateGalleryAsset {
  galleryId: string;
  id: string;
  altText: string;
  width: number;
  height: number;
  displayOrder: number;
  webByteSize: number;
  fullByteSize: number;
}

export function validAsset(value: unknown, galleryId: string): value is PrivateGalleryAsset {
  if (!value || typeof value !== "object") return false;
  const a = value as PrivateGalleryAsset;
  return a.galleryId === galleryId && typeof a.id === "string" && ASSET_ID.test(a.id) &&
    typeof a.altText === "string" && a.altText.length <= 500 &&
    Number.isSafeInteger(a.width) && a.width > 0 && a.width <= 30000 &&
    Number.isSafeInteger(a.height) && a.height > 0 && a.height <= 30000 &&
    Number.isSafeInteger(a.displayOrder) && a.displayOrder >= 0 &&
    Number.isSafeInteger(a.webByteSize) && a.webByteSize >= 3 && a.webByteSize <= MAX_WEB_BYTES &&
    Number.isSafeInteger(a.fullByteSize) && a.fullByteSize >= 3 && a.fullByteSize <= MAX_FULL_BYTES;
}

export function toClientAsset(asset: PrivateGalleryAsset): ClientGalleryAsset {
  const path = `/api/galleries/${asset.galleryId}/assets/${asset.id}`;
  return { id: asset.id, altText: asset.altText, width: asset.width, height: asset.height,
    displayOrder: asset.displayOrder,
    orientation: asset.width === asset.height ? "square" : asset.width > asset.height ? "landscape" : "portrait",
    webImageUrl: `${path}/view`, webDownloadUrl: `${path}/web`, fullDownloadUrl: `${path}/full` };
}

export function assetBlobName(asset: PrivateGalleryAsset, full: boolean): string {
  return `${asset.galleryId}/${asset.id}/${full ? "full" : "web"}.jpg`;
}
