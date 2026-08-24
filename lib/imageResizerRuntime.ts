import { TOOLS_DOWNLOADS_BASE_URL } from "@/lib/toolsConfig";

const IMAGE_RESIZER_BROWSER_RUNTIME_URL =
  `${TOOLS_DOWNLOADS_BASE_URL}/image-resizer/browser`;
const imageResizerBrowserRuntimeUrl = new URL(
  IMAGE_RESIZER_BROWSER_RUNTIME_URL,
);
const TRUSTED_RUNTIME_ORIGIN = imageResizerBrowserRuntimeUrl.origin;
const TRUSTED_RUNTIME_PATH_PREFIX =
  `${imageResizerBrowserRuntimeUrl.pathname.replace(/\/+$/, "")}/`;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const SHA256_PATTERN = /^[a-f\d]{64}$/i;

export const IMAGE_RESIZER_BROWSER_MANIFEST_URL =
  `${IMAGE_RESIZER_BROWSER_RUNTIME_URL}/latest.json`;
export const PYODIDE_CDN_ORIGIN = "https://cdn.jsdelivr.net";

export type ImageResizerBrowserManifest = {
  schemaVersion: 1;
  bundleSha256: string;
  bundleSizeBytes: number;
  bundleUrl: string;
  pyodideVersion: string;
  pillowVersion: string;
  sourceVersion?: string;
  gitRevision?: string;
  manifestUrl?: string;
  checksumsUrl?: string;
  generatedAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string when provided.`);
  }

  return value;
}

function optionalTrustedRuntimeUrl(
  value: unknown,
  fieldName: string,
): string | undefined {
  const url = optionalString(value, fieldName);
  if (url === undefined) {
    return undefined;
  }

  const trustedUrl = getSafeImageResizerBrowserRuntimeUrl(url);
  if (!trustedUrl) {
    throw new Error(`${fieldName} is not a trusted browser runtime URL.`);
  }

  return trustedUrl;
}

export function getSafeImageResizerBrowserRuntimeUrl(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.origin !== TRUSTED_RUNTIME_ORIGIN ||
      !url.pathname.startsWith(TRUSTED_RUNTIME_PATH_PREFIX)
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function parseImageResizerBrowserManifest(
  value: unknown,
): ImageResizerBrowserManifest {
  if (!isRecord(value)) {
    throw new Error("Runtime manifest must be an object.");
  }

  if (value.schemaVersion !== 1) {
    throw new Error("Runtime manifest schema is not supported.");
  }

  if (
    typeof value.bundleSha256 !== "string" ||
    !SHA256_PATTERN.test(value.bundleSha256)
  ) {
    throw new Error("Runtime bundle SHA-256 is invalid.");
  }

  if (
    typeof value.bundleSizeBytes !== "number" ||
    !Number.isFinite(value.bundleSizeBytes) ||
    !Number.isInteger(value.bundleSizeBytes) ||
    value.bundleSizeBytes <= 0
  ) {
    throw new Error("Runtime bundle size is invalid.");
  }

  const bundleUrl = getSafeImageResizerBrowserRuntimeUrl(value.bundleUrl);
  if (!bundleUrl) {
    throw new Error("Runtime bundle URL is not trusted.");
  }

  if (
    typeof value.pyodideVersion !== "string" ||
    !VERSION_PATTERN.test(value.pyodideVersion)
  ) {
    throw new Error("Pyodide version is invalid.");
  }

  if (
    typeof value.pillowVersion !== "string" ||
    !VERSION_PATTERN.test(value.pillowVersion)
  ) {
    throw new Error("Pillow version is invalid.");
  }

  return {
    schemaVersion: 1,
    bundleSha256: value.bundleSha256.toLowerCase(),
    bundleSizeBytes: value.bundleSizeBytes,
    bundleUrl,
    pyodideVersion: value.pyodideVersion,
    pillowVersion: value.pillowVersion,
    sourceVersion: optionalString(value.sourceVersion, "sourceVersion"),
    gitRevision: optionalString(value.gitRevision, "gitRevision"),
    manifestUrl: optionalTrustedRuntimeUrl(value.manifestUrl, "manifestUrl"),
    checksumsUrl: optionalTrustedRuntimeUrl(
      value.checksumsUrl,
      "checksumsUrl",
    ),
    generatedAt: optionalString(value.generatedAt, "generatedAt"),
  };
}

export function getPyodideRuntimeUrls(version: string) {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error("Pyodide version is invalid.");
  }

  const indexUrl = `${PYODIDE_CDN_ORIGIN}/pyodide/v${version}/full/`;

  return {
    indexUrl,
    moduleUrl: `${indexUrl}pyodide.mjs`,
  };
}