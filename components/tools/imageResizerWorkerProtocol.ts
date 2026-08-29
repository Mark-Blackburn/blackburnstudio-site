export type ImageResizerOutputFormat =
  | "original"
  | "JPEG"
  | "PNG"
  | "WebP";

export type ImageResizerCapabilities = {
  JPEG: boolean;
  PNG: boolean;
  WebP: boolean;
  watermark: boolean;
};

export type ImageResizerWatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ImageResizerTextWatermark = {
  type: "text";
  text: string;
  position: ImageResizerWatermarkPosition;
  opacity: number;
  size: number;
  margin: number;
  colour: string;
};

export type ImageResizerImageWatermark = {
  type: "image";
  bytes: ArrayBuffer;
  position: ImageResizerWatermarkPosition;
  opacity: number;
  scale: number;
  margin: number;
};

export type ImageResizerWatermark =
  | ImageResizerTextWatermark
  | ImageResizerImageWatermark;

export type ImageResizerCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
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
      crop?: ImageResizerCropRect;
      watermark?: ImageResizerWatermark;
    }
  | {
      type: "predict-crop";
      requestId: string;
      imageId: string;
      sourceWidth: number;
      sourceHeight: number;
      longEdge: number;
      neverEnlarge: boolean;
      crop?: ImageResizerCropRect;
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
  | "prediction"
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
      type: "crop-predicted";
      requestId: string;
      imageId: string;
      cropWidth: number;
      cropHeight: number;
      outputWidth: number;
      outputHeight: number;
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
const CROP_BOUNDARY_TOLERANCE = 1e-12;
export const IMAGE_RESIZER_WATERMARK_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const satisfies readonly ImageResizerWatermarkPosition[];
const WATERMARK_POSITIONS = new Set<string>(IMAGE_RESIZER_WATERMARK_POSITIONS);
const WATERMARK_COLOUR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const MAX_WATERMARK_TEXT_LENGTH = 200;
const MIN_TEXT_WATERMARK_SIZE = 0.01;
const MAX_TEXT_WATERMARK_SIZE = 0.25;
const MIN_IMAGE_WATERMARK_SCALE = 0.01;
const MAX_IMAGE_WATERMARK_SCALE = 1;
const MAX_WATERMARK_MARGIN = 0.25;

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

export function isImageResizerCropRect(
  value: unknown,
): value is ImageResizerCropRect {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (
    keys.length !== 4 ||
    !["x", "y", "width", "height"].every((key) => keys.includes(key))
  ) {
    return false;
  }

  const { x, y, width, height } = candidate;
  return (
    typeof x === "number" &&
    Number.isFinite(x) &&
    typeof y === "number" &&
    Number.isFinite(y) &&
    typeof width === "number" &&
    Number.isFinite(width) &&
    typeof height === "number" &&
    Number.isFinite(height) &&
    x >= 0 &&
    y >= 0 &&
    width > 0 &&
    height > 0 &&
    x + width <= 1 + CROP_BOUNDARY_TOLERANCE &&
    y + height <= 1 + CROP_BOUNDARY_TOLERANCE
  );
}

function isFiniteNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  minimumExclusive = false,
) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (minimumExclusive ? value > minimum : value >= minimum) &&
    value <= maximum
  );
}

function hasExactKeys(candidate: Record<string, unknown>, keys: string[]) {
  const candidateKeys = Object.keys(candidate);
  return (
    candidateKeys.length === keys.length &&
    keys.every((key) => candidateKeys.includes(key))
  );
}

export function isImageResizerWatermark(
  value: unknown,
): value is ImageResizerWatermark {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const commonValid =
    typeof candidate.position === "string" &&
    WATERMARK_POSITIONS.has(candidate.position) &&
    isFiniteNumberInRange(candidate.opacity, 0, 1, true) &&
    isFiniteNumberInRange(candidate.margin, 0, MAX_WATERMARK_MARGIN);
  if (!commonValid) return false;

  if (candidate.type === "text") {
    return (
      hasExactKeys(candidate, [
        "type",
        "text",
        "position",
        "opacity",
        "size",
        "margin",
        "colour",
      ]) &&
      typeof candidate.text === "string" &&
      candidate.text.trim().length > 0 &&
      candidate.text.length <= MAX_WATERMARK_TEXT_LENGTH &&
      !/[\r\n]/.test(candidate.text) &&
      isFiniteNumberInRange(
        candidate.size,
        MIN_TEXT_WATERMARK_SIZE,
        MAX_TEXT_WATERMARK_SIZE,
      ) &&
      typeof candidate.colour === "string" &&
      WATERMARK_COLOUR_PATTERN.test(candidate.colour)
    );
  }

  if (candidate.type === "image") {
    return (
      hasExactKeys(candidate, [
        "type",
        "bytes",
        "position",
        "opacity",
        "scale",
        "margin",
      ]) &&
      candidate.bytes instanceof ArrayBuffer &&
      candidate.bytes.byteLength > 0 &&
      isFiniteNumberInRange(
        candidate.scale,
        MIN_IMAGE_WATERMARK_SCALE,
        MAX_IMAGE_WATERMARK_SCALE,
      )
    );
  }

  return false;
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
    typeof candidate.stripMetadata === "boolean" &&
    (candidate.crop === undefined || isImageResizerCropRect(candidate.crop)) &&
    (candidate.watermark === undefined ||
      isImageResizerWatermark(candidate.watermark))
  );
}

export function isPredictCropWorkerRequest(
  value: unknown,
): value is Extract<
  ImageResizerWorkerRequest,
  { type: "predict-crop" }
> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === "predict-crop" &&
    isBoundedString(candidate.requestId, MAX_REQUEST_ID_LENGTH, false) &&
    isBoundedString(candidate.imageId, MAX_REQUEST_ID_LENGTH, false) &&
    typeof candidate.sourceWidth === "number" &&
    Number.isSafeInteger(candidate.sourceWidth) &&
    candidate.sourceWidth > 0 &&
    typeof candidate.sourceHeight === "number" &&
    Number.isSafeInteger(candidate.sourceHeight) &&
    candidate.sourceHeight > 0 &&
    typeof candidate.longEdge === "number" &&
    Number.isSafeInteger(candidate.longEdge) &&
    candidate.longEdge >= MIN_LONG_EDGE &&
    typeof candidate.neverEnlarge === "boolean" &&
    (candidate.crop === undefined || isImageResizerCropRect(candidate.crop))
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
  "crop-predicted",
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