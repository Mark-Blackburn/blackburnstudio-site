export const PDF_REDUCER_RUNTIME_VERSION = "1.0.0" as const;
export const PDF_REDUCER_RUNTIME_BASE_PATH =
  `/runtime/pdf-reducer/${PDF_REDUCER_RUNTIME_VERSION}/` as const;
export const PDF_REDUCER_WORKER_URL =
  `${PDF_REDUCER_RUNTIME_BASE_PATH}pdf-reducer-worker.mjs` as const;

export const PDF_REDUCER_SOURCE_LIMITS = {
  optimize: 25 * 1024 * 1024,
  "reduce-images": 15 * 1024 * 1024,
} as const;

export type PdfReducerMode = keyof typeof PDF_REDUCER_SOURCE_LIMITS;

export type PdfReducerErrorCode =
  | "INVALID_PDF"
  | "ENCRYPTED_PDF"
  | "FILE_TOO_LARGE"
  | "IMAGE_LIMIT"
  | "PROCESSING_FAILED"
  | "VALIDATION_FAILED"
  | "RUNTIME_FAILED"
  | "CANCELLED";

export type PdfReducerMetadata = {
  mode: PdfReducerMode;
  inspected: number;
  downsampled: number;
  recompressed: number;
  skipped: number;
  unsupported: number;
  ambiguous: number;
  decodedPeakBytes: number;
  decodedTotalBytes: number;
};

export type PdfReducerResult = {
  output: ArrayBuffer;
  inputBytes: number;
  outputBytes: number;
  reductionRecommended: boolean;
  metadata: PdfReducerMetadata;
};

export type PdfReducerWorkerRequest = {
  type: "process";
  jobId: string;
  mode: PdfReducerMode;
  input: ArrayBuffer;
};

export type PdfReducerWorkerResponse =
  | { type: "ready"; runtimeVersion: typeof PDF_REDUCER_RUNTIME_VERSION }
  | {
      type: "result";
      jobId: string;
      output: ArrayBuffer;
      inputBytes: number;
      outputBytes: number;
      metadata: PdfReducerMetadata;
    }
  | {
      type: "error";
      jobId: string | null;
      code: PdfReducerErrorCode;
    };
