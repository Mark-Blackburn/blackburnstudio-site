import {
  PDF_REDUCER_RUNTIME_VERSION,
  PDF_REDUCER_SOURCE_LIMITS,
  PDF_REDUCER_WORKER_URL,
  type PdfReducerErrorCode,
  type PdfReducerMode,
  type PdfReducerResult,
  type PdfReducerWorkerRequest,
  type PdfReducerWorkerResponse,
} from "./types";

const ERROR_MESSAGES: Record<PdfReducerErrorCode, string> = {
  INVALID_PDF: "This file is not a valid PDF.",
  ENCRYPTED_PDF: "Password-protected PDFs are not supported.",
  FILE_TOO_LARGE: "This PDF is too large for the selected mode.",
  IMAGE_LIMIT: "An image in this PDF exceeds the safe processing limit.",
  PROCESSING_FAILED: "The PDF could not be processed.",
  VALIDATION_FAILED: "The processed PDF did not pass validation.",
  RUNTIME_FAILED: "The browser PDF runtime stopped unexpectedly.",
  CANCELLED: "PDF processing was cancelled.",
};

export class PdfReducerError extends Error {
  constructor(public readonly code: PdfReducerErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "PdfReducerError";
  }
}

export type PdfReducerWorkerLike = Pick<
  Worker,
  "terminate" | "onmessage" | "onerror" | "onmessageerror"
> & {
  postMessage(
    request: PdfReducerWorkerRequest,
    transfer: Transferable[],
  ): void;
};

export type PdfReducerWorkerFactory = () => PdfReducerWorkerLike;

type ActiveJob = {
  worker: PdfReducerWorkerLike;
  jobId: string;
  resolve: (result: PdfReducerResult) => void;
  reject: (error: PdfReducerError) => void;
};

function defaultWorkerFactory(): PdfReducerWorkerLike {
  return new Worker(PDF_REDUCER_WORKER_URL, {
    type: "module",
    name: "blackburn-pdf-reducer",
  });
}

const PDF_REDUCER_ERROR_CODES = new Set<PdfReducerErrorCode>([
  "INVALID_PDF",
  "ENCRYPTED_PDF",
  "FILE_TOO_LARGE",
  "IMAGE_LIMIT",
  "PROCESSING_FAILED",
  "VALIDATION_FAILED",
  "RUNTIME_FAILED",
  "CANCELLED",
]);

function isFiniteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isMetadata(value: unknown): value is PdfReducerResult["metadata"] {
  if (typeof value !== "object" || value === null) return false;
  const metadata = value as Record<string, unknown>;
  return (
    (metadata.mode === "optimize" || metadata.mode === "reduce-images") &&
    [
      "inspected",
      "downsampled",
      "recompressed",
      "skipped",
      "unsupported",
      "ambiguous",
      "decodedPeakBytes",
      "decodedTotalBytes",
    ].every((key) => isFiniteNonNegativeInteger(metadata[key]))
  );
}

function isWorkerResponse(value: unknown): value is PdfReducerWorkerResponse {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;

  if (response.type === "ready") {
    return response.runtimeVersion === PDF_REDUCER_RUNTIME_VERSION;
  }
  if (response.type === "error") {
    return (
      (typeof response.jobId === "string" || response.jobId === null) &&
      typeof response.code === "string" &&
      PDF_REDUCER_ERROR_CODES.has(response.code as PdfReducerErrorCode)
    );
  }
  if (response.type !== "result") return false;
  return (
    typeof response.jobId === "string" &&
    response.output instanceof ArrayBuffer &&
    isFiniteNonNegativeInteger(response.inputBytes) &&
    isFiniteNonNegativeInteger(response.outputBytes) &&
    response.outputBytes === response.output.byteLength &&
    isMetadata(response.metadata)
  );
}

export class PdfReducerRuntime {
  private active: ActiveJob | null = null;
  private nextJobId = 0;

  constructor(
    private readonly workerFactory: PdfReducerWorkerFactory =
      defaultWorkerFactory,
  ) {}

  optimize(input: ArrayBuffer) {
    return this.process("optimize", input);
  }

  reduceImages(input: ArrayBuffer) {
    return this.process("reduce-images", input);
  }

  process(mode: PdfReducerMode, input: ArrayBuffer): Promise<PdfReducerResult> {
    if (this.active) {
      return Promise.reject(new PdfReducerError("RUNTIME_FAILED"));
    }
    if (input.byteLength > PDF_REDUCER_SOURCE_LIMITS[mode]) {
      return Promise.reject(new PdfReducerError("FILE_TOO_LARGE"));
    }

    const worker = this.workerFactory();
    const jobId = `pdf-reducer-${++this.nextJobId}`;

    return new Promise<PdfReducerResult>((resolve, reject) => {
      const active: ActiveJob = { worker, jobId, resolve, reject };
      this.active = active;

      const fail = (code: PdfReducerErrorCode) => {
        if (this.active !== active) return;
        worker.terminate();
        this.active = null;
        reject(new PdfReducerError(code));
      };

      worker.onmessage = (event: MessageEvent<unknown>) => {
        if (this.active !== active) return;
        if (!isWorkerResponse(event.data)) {
          fail("RUNTIME_FAILED");
          return;
        }
        const response = event.data;
        if (response.type === "ready") return;
        if (response.jobId !== jobId && response.jobId !== null) return;
        if (response.type === "error") {
          fail(response.code);
          return;
        }

        worker.terminate();
        this.active = null;
        resolve({
          output: response.output,
          inputBytes: response.inputBytes,
          outputBytes: response.outputBytes,
          reductionRecommended: response.outputBytes < response.inputBytes,
          metadata: response.metadata,
        });
      };
      worker.onerror = (event) => {
        event.preventDefault();
        fail("RUNTIME_FAILED");
      };
      worker.onmessageerror = () => fail("RUNTIME_FAILED");

      const request: PdfReducerWorkerRequest = {
        type: "process",
        jobId,
        mode,
        input,
      };
      worker.postMessage(request, [input]);
    });
  }

  cancel() {
    const active = this.active;
    if (!active) return false;
    this.active = null;
    active.worker.terminate();
    active.reject(new PdfReducerError("CANCELLED"));
    return true;
  }
}
