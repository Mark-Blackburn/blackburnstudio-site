import { MAX_GALLERY_ASSETS } from "./galleryAssets";
import type { PrivateGalleryAsset } from "./galleryAssets";

export type ArchiveVariant = "web" | "full";
export interface ArchiveSelection {
  variant: ArchiveVariant;
  assets: { id: string; photoNumber: number; byteSize: number }[];
  totalBytes: number;
}

export class InvalidArchiveSelection extends Error {}

const MAX_ARCHIVE_SOURCE_BYTES = MAX_GALLERY_ASSETS * 25 * 1024 * 1024;

/**
 * Validate a requested archive against server-owned gallery metadata.
 * Never trust caller-supplied byte sizes, filenames, display order or paths.
 * The client supplies only opaque asset IDs and the requested variant.
 */
export function validateArchiveSelection(
  request: unknown,
  publishedAssets: PrivateGalleryAsset[],
): ArchiveSelection {
  if (!request || typeof request !== "object" || Array.isArray(request))
    throw new InvalidArchiveSelection("Invalid archive request");
  const value = request as Record<string, unknown>;
  if (value.variant !== "web" && value.variant !== "full")
    throw new InvalidArchiveSelection("Invalid archive variant");
  if (!Array.isArray(value.assetIds) || value.assetIds.length < 1 ||
      value.assetIds.length > MAX_GALLERY_ASSETS ||
      value.assetIds.some(id => typeof id !== "string"))
    throw new InvalidArchiveSelection("Invalid archive selection");
  const ids = value.assetIds as string[];
  if (new Set(ids).size !== ids.length)
    throw new InvalidArchiveSelection("Duplicate photograph");
  if (publishedAssets.length > MAX_GALLERY_ASSETS)
    throw new InvalidArchiveSelection("Invalid gallery asset collection");
  const indexed = new Map(publishedAssets.map((asset, index) => [asset.id, { asset, photoNumber: index + 1 }]));
  if (indexed.size !== publishedAssets.length)
    throw new InvalidArchiveSelection("Invalid gallery asset collection");
  let totalBytes = 0;
  const assets = ids.map(id => {
    const found = indexed.get(id);
    if (!found) throw new InvalidArchiveSelection("Photograph unavailable");
    const byteSize = value.variant === "full" ? found.asset.fullByteSize : found.asset.webByteSize;
    if (!Number.isSafeInteger(byteSize) || byteSize < 3 || byteSize > (value.variant === "full" ? 25 : 4) * 1024 * 1024)
      throw new InvalidArchiveSelection("Invalid photograph size");
    totalBytes += byteSize;
    return { id, photoNumber: found.photoNumber, byteSize };
  });
  if (!Number.isSafeInteger(totalBytes) || totalBytes > MAX_ARCHIVE_SOURCE_BYTES)
    throw new InvalidArchiveSelection("Archive selection too large");
  return { variant: value.variant, assets, totalBytes };
}

export function archiveEntryName(photoNumber: number, variant: ArchiveVariant): string {
  if (!Number.isInteger(photoNumber) || photoNumber < 1 || photoNumber > MAX_GALLERY_ASSETS ||
      (variant !== "web" && variant !== "full"))
    throw new InvalidArchiveSelection("Invalid archive entry");
  return `photo-${String(photoNumber).padStart(3, "0")}-${variant}.jpg`;
}
