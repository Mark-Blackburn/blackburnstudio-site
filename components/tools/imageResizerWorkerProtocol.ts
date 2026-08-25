export type ImageResizerOutputFormat =
  | "original"
  | "JPEG"
  | "PNG"
  | "WebP";

export type ImageResizerCapabilities = {
  JPEG: boolean;
  PNG: boolean;
  WebP: boolean;
};

export type ImageResizerWorkerRequest =
  | {
      type: "initialize";
      requestId: string;
    }
  | {
      type: "select-image";
      requestId: string;
      imageId: string;
      fileName: string;
      bytes: ArrayBuffer;
    }
  | {
      type: "process-image";
      requestId: string;
      imageId: string;
      longEdge: number;
      neverEnlarge: boolean;
      outputFormat: ImageResizerOutputFormat;
      quality: number;
      outputFilename: string;
      title: string;
      altText: string;
      creator: string;
      copyright: string;
      stripMetadata: boolean;
    }
  | {
      type: "create-zip";
      requestId: string;
      entries: Array<{
        fileName: string;
        bytes: ArrayBuffer;
      }>;
    };

export type ImageResizerWorkerErrorStage =
  | "initialization"
  | "selection"
  | "processing"
  | "zip"
  | "protocol";

export type ImageResizerWorkerResponse =
  | {
      type: "initializing";
      requestId: string;
    }
  | {
      type: "ready";
      requestId: string;
      capabilities: ImageResizerCapabilities;
      pyodideVersion: string;
      pillowVersion: string;
      coreVersion?: string;
      initializationMs: number;
    }
  | {
      type: "image-selected";
      requestId: string;
      imageId: string;
      width: number;
      height: number;
      sourceFormat: "JPEG" | "PNG" | "WebP";
    }
  | {
      type: "processed";
      requestId: string;
      imageId: string;
      bytes: ArrayBuffer;
      suggestedFilename: string;
      originalWidth: number;
      originalHeight: number;
      width: number;
      height: number;
      outputFormat: "JPEG" | "PNG" | "WebP";
      processingMs: number;
    }
  | {
      type: "zip-created";
      requestId: string;
      bytes: ArrayBuffer;
      fileCount: number;
    }
  | {
      type: "error";
      requestId: string;
      stage: ImageResizerWorkerErrorStage;
      code: string;
      message: string;
    };

const PROCESS_IMAGE_OUTPUT_FORMATS = new Set<string>([
  "original",
  "JPEG",
  "PNG",
  "WebP",
]);
const MIN_LONG_EDGE = 1;
const MIN_QUALITY = 1;
const MAX_QUALITY = 100;
const MAX_REQUEST_ID_LENGTH = 100;
const MAX_FILENAME_LENGTH = 255;
const MAX_METADATA_LENGTH = 2_000;

function isBoundedString(
  value: unknown,
  maximumLength: number,
  allowEmpty = true,
) {
  return (
    typeof value === "string" &&
    (allowEmpty || value.trim().length > 0) &&
    value.length <= maximumLength
  );
}

function isSafeArchiveFilename(value: unknown) {
  return (
    isBoundedString(value, MAX_FILENAME_LENGTH, false) &&
    typeof value === "string" &&
    value !== "." &&
    value !== ".." &&
    !/[\\/\u0000-\u001f]/.test(value)
  );
}

export function isProcessImageWorkerRequest(
  value: unknown,
): value is Extract<
  ImageResizerWorkerRequest,
  { type: "process-image" }
> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === "process-image" &&
    isBoundedString(candidate.requestId, MAX_REQUEST_ID_LENGTH, false) &&
    typeof candidate.imageId === "string" &&
    candidate.imageId.trim().length > 0 &&
    typeof candidate.longEdge === "number" &&
    Number.isSafeInteger(candidate.longEdge) &&
    candidate.longEdge >= MIN_LONG_EDGE &&
    typeof candidate.neverEnlarge === "boolean" &&
    typeof candidate.outputFormat === "string" &&
    PROCESS_IMAGE_OUTPUT_FORMATS.has(candidate.outputFormat) &&
    typeof candidate.quality === "number" &&
    Number.isSafeInteger(candidate.quality) &&
    candidate.quality >= MIN_QUALITY &&
    candidate.quality <= MAX_QUALITY &&
    isBoundedString(
      candidate.outputFilename,
      MAX_FILENAME_LENGTH,
      false,
    ) &&
    isBoundedString(candidate.title, MAX_METADATA_LENGTH) &&
    isBoundedString(candidate.altText, MAX_METADATA_LENGTH) &&
    isBoundedString(candidate.creator, MAX_METADATA_LENGTH) &&
    isBoundedString(candidate.copyright, MAX_METADATA_LENGTH) &&
    typeof candidate.stripMetadata === "boolean"
  );
}

export function isCreateZipWorkerRequest(
  value: unknown,
): value is Extract<ImageResizerWorkerRequest, { type: "create-zip" }> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === "create-zip" &&
    isBoundedString(candidate.requestId, MAX_REQUEST_ID_LENGTH, false) &&
    Array.isArray(candidate.entries) &&
    candidate.entries.length > 0 &&
    candidate.entries.every((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return false;
      }

      const zipEntry = entry as Record<string, unknown>;
      return (
        isSafeArchiveFilename(zipEntry.fileName) &&
        zipEntry.bytes instanceof ArrayBuffer &&
        zipEntry.bytes.byteLength > 0
      );
    })
  );
}

const RESPONSE_TYPES = new Set([
  "initializing",
  "ready",
  "image-selected",
  "processed",
  "zip-created",
  "error",
]);

export function isImageResizerWorkerResponse(
  value: unknown,
): value is ImageResizerWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === "string" &&
    RESPONSE_TYPES.has(candidate.type) &&
    typeof candidate.requestId === "string"
  );
}