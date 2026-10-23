import type { ClientGalleryAsset } from "./contracts";

export type DownloadSize = "web" | "full";
export const MAX_ZIP_BYTES = 100_000_000;

export function photoDownloadUrl(
  galleryId: string,
  asset: ClientGalleryAsset,
  size: DownloadSize,
) {
  const url = size === "web" ? asset.webDownloadUrl : asset.fullDownloadUrl;
  const expected = `/api/galleries/${encodeURIComponent(galleryId)}/assets/${encodeURIComponent(asset.id)}/${size}`;
  if (url !== expected)
    throw new Error(
      "This photograph is unavailable for download. Refresh the gallery and try again.",
    );
  return url;
}

// Read incrementally: Content-Length alone does not bound a streamed response.
async function readPhoto(
  url: string,
  signal: AbortSignal,
  limit: number,
  onChunk: (bytes: Uint8Array<ArrayBuffer>) => void,
) {
  signal.throwIfAborted();
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal,
  });
  if (
    !response.ok ||
    response.headers.get("content-type")?.split(";")[0].trim() !==
      "image/jpeg" ||
    !response.body
  ) {
    await response.body?.cancel();
    throw new Error(
      "A photograph could not be downloaded. Your gallery access may have expired. Refresh and try again.",
    );
  }
  const tooLarge = () =>
    new Error(
      "This download is too large. ZIP downloads can contain up to 100 MB. Select fewer photographs or choose web size.",
    );
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body.cancel();
    throw tooLarge();
  }
  const reader = response.body.getReader();
  let bytes = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) throw tooLarge();
      onChunk(chunk.value);
    }
    if (!bytes)
      throw new Error(
        "The photograph was empty. Refresh the gallery and try again.",
      );
    return bytes;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function preparePhotoShare(
  galleryId: string,
  asset: ClientGalleryAsset,
  signal: AbortSignal,
) {
  const chunks: BlobPart[] = [];
  await readPhoto(
    photoDownloadUrl(galleryId, asset, "web"),
    signal,
    4 * 1024 * 1024,
    (chunk) => chunks.push(chunk),
  );
  signal.throwIfAborted();
  return new File(chunks, `photo-${asset.displayOrder + 1}-web.jpg`, {
    type: "image/jpeg",
  });
}

export async function prepareGalleryZip(
  galleryId: string,
  assets: ClientGalleryAsset[],
  size: DownloadSize,
  signal: AbortSignal,
  onProgress: (completed: number) => void,
) {
  if (!assets.length || assets.length > 250)
    throw new Error("Select between 1 and 250 photographs.");
  // Validate the entire selection before making a request.
  const urls = assets.map((asset) => photoDownloadUrl(galleryId, asset, size));
  const { Zip, ZipPassThrough } = await import("fflate");
  signal.throwIfAborted();
  const chunks: BlobPart[] = [];
  let zipError: Error | null = null;
  let finished = false;
  const zip = new Zip((error, data, final) => {
    if (error) zipError = error;
    else chunks.push(data);
    if (final) finished = true;
  });
  let total = 0;
  try {
    for (let index = 0; index < assets.length; index++) {
      signal.throwIfAborted();
      const entry = new ZipPassThrough(
        `photo-${String(index + 1).padStart(3, "0")}-${size}.jpg`,
      );
      zip.add(entry);
      total += await readPhoto(
        urls[index],
        signal,
        Math.min(
          size === "web" ? 4 * 1024 * 1024 : 20 * 1024 * 1024,
          MAX_ZIP_BYTES - total,
        ),
        (chunk) => {
          entry.push(chunk);
          if (zipError) throw zipError;
        },
      );
      entry.push(new Uint8Array(0), true);
      if (zipError) throw zipError;
      onProgress(index + 1);
    }
    signal.throwIfAborted();
    zip.end();
    if (zipError) throw zipError;
    if (!finished)
      throw new Error("The ZIP could not be prepared. Please try again.");
    return new Blob(chunks, { type: "application/zip" });
  } finally {
    zip.terminate();
  }
}
