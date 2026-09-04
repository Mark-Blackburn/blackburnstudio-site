import { describe, expect, it, vi } from "vitest";

import {
  PdfReducerError,
  PdfReducerRuntime,
  type PdfReducerWorkerLike,
} from "./runtime";
import {
  PDF_REDUCER_SOURCE_LIMITS,
  type PdfReducerErrorCode,
  type PdfReducerMetadata,
  type PdfReducerWorkerRequest,
} from "./types";

const metadata: PdfReducerMetadata = {
  mode: "optimize",
  inspected: 0,
  downsampled: 0,
  recompressed: 0,
  skipped: 0,
  unsupported: 0,
  ambiguous: 0,
  decodedPeakBytes: 0,
  decodedTotalBytes: 0,
};

class FakeWorker implements PdfReducerWorkerLike {
  onmessage: ((this: Worker, event: MessageEvent) => unknown) | null = null;
  onerror: ((this: AbstractWorker, event: ErrorEvent) => unknown) | null = null;
  onmessageerror: ((this: Worker, event: MessageEvent) => unknown) | null = null;
  posted: { request: PdfReducerWorkerRequest; transfer: Transferable[] }[] = [];
  terminate = vi.fn();

  postMessage(
    request: PdfReducerWorkerRequest,
    transfer: Transferable[] = [],
  ) {
    this.posted.push({ request, transfer });
  }

  emit(response: unknown) {
    this.onmessage?.call({} as Worker, { data: response } as MessageEvent);
  }
}

function setup() {
  const workers: FakeWorker[] = [];
  const runtime = new PdfReducerRuntime(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  });
  return { runtime, workers };
}

function expectCode(promise: Promise<unknown>, code: PdfReducerErrorCode) {
  return expect(promise).rejects.toMatchObject({ code } satisfies Partial<PdfReducerError>);
}

describe("PdfReducerRuntime", () => {
  it.each([
    ["optimize", PDF_REDUCER_SOURCE_LIMITS.optimize],
    ["reduce-images", PDF_REDUCER_SOURCE_LIMITS["reduce-images"]],
  ] as const)("enforces the %s source cap before Worker creation", async (mode, cap) => {
    const { runtime, workers } = setup();
    await expectCode(runtime.process(mode, new ArrayBuffer(cap + 1)), "FILE_TOO_LARGE");
    expect(workers).toHaveLength(0);
  });

  it.each(["optimize", "reduce-images"] as const)(
    "posts the fixed %s mode and transfers the input buffer",
    (mode) => {
      const { runtime, workers } = setup();
      const input = new ArrayBuffer(16);
      void runtime.process(mode, input);
      expect(workers[0].posted[0]).toMatchObject({
        request: { type: "process", mode, input },
        transfer: [input],
      });
    },
  );

  it("returns byte metadata, recommends smaller output, and terminates", async () => {
    const { runtime, workers } = setup();
    const pending = runtime.optimize(new ArrayBuffer(20));
    const { jobId } = workers[0].posted[0].request;
    const output = new ArrayBuffer(10);
    workers[0].emit({
      type: "result",
      jobId,
      output,
      inputBytes: 20,
      outputBytes: 10,
      metadata,
    });

    await expect(pending).resolves.toEqual({
      output,
      inputBytes: 20,
      outputBytes: 10,
      reductionRecommended: true,
      metadata,
    });
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });

  it("does not recommend an output that is not smaller", async () => {
    const { runtime, workers } = setup();
    const pending = runtime.optimize(new ArrayBuffer(10));
    const { jobId } = workers[0].posted[0].request;
    workers[0].emit({
      type: "result",
      jobId,
      output: new ArrayBuffer(12),
      inputBytes: 10,
      outputBytes: 12,
      metadata,
    });
    await expect(pending).resolves.toMatchObject({
      reductionRecommended: false,
    });
  });

  it.each([
    { type: "result" },
    { type: "error" },
    { type: "unexpected" },
  ])("fails safely for a malformed active response: %j", async (response) => {
    const { runtime, workers } = setup();
    const pending = runtime.optimize(new ArrayBuffer(10));
    workers[0].emit(response);
    await expectCode(pending, "RUNTIME_FAILED");
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(runtime.cancel()).toBe(false);
  });

  it("fails safely when the Worker sends a malformed ready response", async () => {
    const { runtime, workers } = setup();
    const pending = runtime.optimize(new ArrayBuffer(10));
    workers[0].emit({ type: "ready" });
    await expectCode(pending, "RUNTIME_FAILED");
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });

  it("ignores malformed responses from an old Worker", async () => {
    const { runtime, workers } = setup();
    const first = runtime.optimize(new ArrayBuffer(10));
    runtime.cancel();
    await expectCode(first, "CANCELLED");

    const second = runtime.optimize(new ArrayBuffer(10));
    workers[0].emit({ type: "result" });
    workers[0].emit({ type: "error" });
    expect(runtime.cancel()).toBe(true);
    await expectCode(second, "CANCELLED");
  });

  it("terminates cancellation and permits a fresh job", async () => {
    const { runtime, workers } = setup();
    const cancelled = runtime.optimize(new ArrayBuffer(10));
    expect(runtime.cancel()).toBe(true);
    await expectCode(cancelled, "CANCELLED");
    expect(workers[0].terminate).toHaveBeenCalledOnce();

    const next = runtime.reduceImages(new ArrayBuffer(10));
    expect(workers).toHaveLength(2);
    const { jobId } = workers[1].posted[0].request;
    workers[1].emit({
      type: "error",
      jobId,
      code: "INVALID_PDF",
    });
    await expectCode(next, "INVALID_PDF");
  });

  it("ignores stale responses from a terminated Worker", async () => {
    const { runtime, workers } = setup();
    const first = runtime.optimize(new ArrayBuffer(10));
    const staleJobId = workers[0].posted[0].request.jobId;
    runtime.cancel();
    await expectCode(first, "CANCELLED");

    const second = runtime.optimize(new ArrayBuffer(10));
    workers[0].emit({
      type: "error",
      jobId: staleJobId,
      code: "VALIDATION_FAILED",
    });
    const freshJobId = workers[1].posted[0].request.jobId;
    workers[1].emit({
      type: "error",
      jobId: freshJobId,
      code: "ENCRYPTED_PDF",
    });
    await expectCode(second, "ENCRYPTED_PDF");
  });

  it.each([
    "INVALID_PDF",
    "ENCRYPTED_PDF",
    "VALIDATION_FAILED",
    "RUNTIME_FAILED",
  ] as const)("maps %s without exposing native diagnostics", async (code) => {
    const { runtime, workers } = setup();
    const pending = runtime.optimize(new ArrayBuffer(10));
    const { jobId } = workers[0].posted[0].request;
    workers[0].emit({ type: "error", jobId, code });
    await expectCode(pending, code);
    await pending.catch((error: PdfReducerError) => {
      expect(error.message).not.toMatch(/qpdf|xref|object \d+/i);
    });
  });

  it("maps a Worker initialization failure with a null job id", async () => {
    const { runtime, workers } = setup();
    const pending = runtime.optimize(new ArrayBuffer(10));
    workers[0].emit({ type: "error", jobId: null, code: "RUNTIME_FAILED" });
    await expectCode(pending, "RUNTIME_FAILED");
  });

  it("maps a Worker crash safely and prevents the browser default", async () => {
    const { runtime, workers } = setup();
    const pending = runtime.optimize(new ArrayBuffer(10));
    const preventDefault = vi.fn();
    workers[0].onerror?.call({} as AbstractWorker, {
      preventDefault,
    } as unknown as ErrorEvent);
    await expectCode(pending, "RUNTIME_FAILED");
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });
});
