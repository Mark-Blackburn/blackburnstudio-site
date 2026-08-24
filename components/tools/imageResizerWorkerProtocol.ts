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