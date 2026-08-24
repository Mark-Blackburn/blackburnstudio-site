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
    };

export type ImageResizerWorkerErrorStage =
  | "initialization"
  | "selection"
  | "processing"
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
    typeof candidate.requestId === "string" &&
    candidate.requestId.length > 0 &&
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
    candidate.quality <= MAX_QUALITY
  );
}

const RESPONSE_TYPES = new Set([
  "initializing",
  "ready",
  "image-selected",
  "processed",
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