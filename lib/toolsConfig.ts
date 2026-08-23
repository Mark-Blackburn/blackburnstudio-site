export const TOOLS_DOWNLOADS_BASE_URL =
  "https://blackburnstudiodl01.blob.core.windows.net/downloads";

const IMAGE_RESIZER_DOWNLOADS_URL = `${TOOLS_DOWNLOADS_BASE_URL}/image-resizer`;
const imageResizerDownloadsUrl = new URL(IMAGE_RESIZER_DOWNLOADS_URL);
const TRUSTED_DOWNLOADS_ORIGIN = imageResizerDownloadsUrl.origin;
const IMAGE_RESIZER_DOWNLOADS_PATH_PREFIX =
  `${imageResizerDownloadsUrl.pathname.replace(/\/+$/, "")}/`;

export const IMAGE_RESIZER_LATEST_URL = `${IMAGE_RESIZER_DOWNLOADS_URL}/latest.json`;
export const IMAGE_RESIZER_RELEASES_URL = `${IMAGE_RESIZER_DOWNLOADS_URL}/releases.json`;

export function getSafeToolDownloadUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.origin !== TRUSTED_DOWNLOADS_ORIGIN ||
      !url.pathname.startsWith(IMAGE_RESIZER_DOWNLOADS_PATH_PREFIX)
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}