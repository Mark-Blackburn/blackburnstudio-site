import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PdfReducerApp from "@/components/tools/PdfReducerApp";
import {
  PdfReducerError,
  type PdfReducerErrorCode,
  type PdfReducerMode,
  type PdfReducerResult,
} from "@/lib/pdf-reducer";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const metadata = {
  mode: "reduce-images" as const,
  inspected: 1,
  downsampled: 1,
  recompressed: 0,
  skipped: 0,
  unsupported: 0,
  ambiguous: 0,
  decodedPeakBytes: 100,
  decodedTotalBytes: 100,
};

function reductionResult(overrides: Partial<PdfReducerResult> = {}): PdfReducerResult {
  return {
    output: new ArrayBuffer(5),
    inputBytes: 20,
    outputBytes: 5,
    reductionRecommended: true,
    metadata,
    ...overrides,
  };
}

class FakeRuntime {
  jobs: Array<{
    mode: PdfReducerMode;
    input: ArrayBuffer;
    deferred: Deferred<PdfReducerResult>;
  }> = [];
  cancel = vi.fn(() => true);

  process(mode: PdfReducerMode, input: ArrayBuffer) {
    const job = { mode, input, deferred: deferred<PdfReducerResult>() };
    this.jobs.push(job);
    return job.deferred.promise;
  }
}

function pdfFile(name = "proposal.pdf", size = 20, type = "application/pdf") {
  const file = new File([new Uint8Array([1, 2, 3])], name, { type });
  Object.defineProperty(file, "size", { configurable: true, value: size });
  Object.defineProperty(file, "arrayBuffer", {
    configurable: true,
    value: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
  });
  return file;
}

function choose(file: File) {
  fireEvent.change(screen.getByLabelText("Choose PDF file"), {
    target: { files: [file] },
  });
}

function setup() {
  const runtime = new FakeRuntime();
  const view = render(<PdfReducerApp runtimeFactory={() => runtime} />);
  return { runtime, ...view };
}

describe("PdfReducerApp", () => {
  const createObjectURL = vi.fn<(blob: Blob | MediaSource) => string>(
    () => "blob:reduced-pdf",
  );
  const revokeObjectURL = vi.fn();
  const createdBlobs: Blob[] = [];

  beforeEach(() => {
    createdBlobs.length = 0;
    createObjectURL.mockClear();
    createObjectURL.mockImplementation((blob: Blob | MediaSource) => {
      if (blob instanceof Blob) createdBlobs.push(blob);
      return "blob:reduced-pdf";
    });
    revokeObjectURL.mockClear();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with Reduce images selected and requires a deliberate file action", () => {
    setup();
    expect(screen.getByRole("radio", { name: /Reduce images/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Optimize/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Reduce PDF" })).toBeDisabled();
    expect(screen.getByText("Image reduction can soften fine detail.", { exact: false })).toBeInTheDocument();
  });

  it("selects, replaces, removes, and switches mode without processing automatically", () => {
    const { runtime } = setup();
    choose(pdfFile());
    expect(screen.getByText("proposal.pdf")).toBeInTheDocument();
    expect(screen.getByText("20 bytes")).toBeInTheDocument();
    expect(runtime.jobs).toHaveLength(0);

    fireEvent.click(screen.getByRole("radio", { name: /Optimize/ }));
    expect(screen.getByRole("radio", { name: /Optimize/ })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByText("proposal.pdf")).not.toBeInTheDocument();
  });

  it("rejects non-PDF and multiple-file selections", () => {
    setup();
    choose(pdfFile("notes.txt", 10, "text/plain"));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a PDF file.");

    fireEvent.drop(screen.getByRole("button", { name: "Choose or drop one PDF file" }), {
      dataTransfer: { files: [pdfFile("one.pdf"), pdfFile("two.pdf")] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose exactly one PDF file.");
  });

  it("enforces the selected mode limit and permits a valid switch to Optimize", () => {
    setup();
    choose(pdfFile("large.pdf", 20 * 1024 * 1024));
    expect(screen.getByRole("alert")).toHaveTextContent("15 MB limit");
    expect(screen.getByRole("button", { name: "Reduce PDF" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Switch to Optimize" }));
    expect(screen.queryByText(/15 MB limit/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reduce PDF" })).toBeEnabled();

    choose(pdfFile("too-large.pdf", 26 * 1024 * 1024));
    expect(screen.getByRole("alert")).toHaveTextContent("25 MB limit");
    expect(screen.getByRole("button", { name: "Reduce PDF" })).toBeDisabled();
  });

  it("shows processing, cancels through the runtime, and remains reusable", async () => {
    const { runtime } = setup();
    choose(pdfFile());
    fireEvent.click(screen.getByRole("button", { name: "Reduce PDF" }));
    await waitFor(() => expect(runtime.jobs).toHaveLength(1));
    expect(screen.getByRole("status")).toHaveTextContent("Processing your PDF in this browser");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(runtime.cancel).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Processing cancelled");
    expect(screen.getByRole("button", { name: "Reduce PDF" })).toBeEnabled();
  });

  it("offers a local PDF download only when the result is smaller", async () => {
    const { runtime } = setup();
    choose(pdfFile("Proposal.PDF"));
    fireEvent.click(screen.getByRole("button", { name: "Reduce PDF" }));
    await waitFor(() => expect(runtime.jobs).toHaveLength(1));
    await act(async () => runtime.jobs[0].deferred.resolve(reductionResult()));

    const download = screen.getByRole("link", { name: "Download reduced PDF" });
    expect(download).toHaveAttribute("href", "blob:reduced-pdf");
    expect(download).toHaveAttribute("download", "Proposal-reduced.pdf");
    expect(screen.getByText("75% smaller")).toBeInTheDocument();
    expect(createdBlobs[0].type).toBe("application/pdf");
  });

  it("keeps the original when the processed result is not smaller", async () => {
    const { runtime } = setup();
    choose(pdfFile());
    fireEvent.click(screen.getByRole("button", { name: "Reduce PDF" }));
    await waitFor(() => expect(runtime.jobs).toHaveLength(1));
    await act(async () =>
      runtime.jobs[0].deferred.resolve(
        reductionResult({ outputBytes: 20, reductionRecommended: false }),
      ),
    );

    expect(screen.getByRole("heading", { name: "This PDF is already well optimised." })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Download reduced PDF" })).not.toBeInTheDocument();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Choose another PDF" })).toBeInTheDocument();
  });

  it.each([
    ["INVALID_PDF", "does not appear to be a valid PDF"],
    ["ENCRYPTED_PDF", "Password-protected PDFs are not supported"],
    ["FILE_TOO_LARGE", "too large for the selected mode"],
    ["IMAGE_LIMIT", "exceeds the safe processing limit"],
    ["PROCESSING_FAILED", "could not be processed"],
    ["VALIDATION_FAILED", "couldn't safely create a valid reduced PDF"],
    ["RUNTIME_FAILED", "stopped unexpectedly"],
  ] satisfies Array<[PdfReducerErrorCode, string]>)
  ("maps %s without exposing native diagnostics", async (code, message) => {
    const { runtime } = setup();
    choose(pdfFile());
    fireEvent.click(screen.getByRole("button", { name: "Reduce PDF" }));
    await waitFor(() => expect(runtime.jobs).toHaveLength(1));
    await act(async () => runtime.jobs[0].deferred.reject(new PdfReducerError(code)));
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText(/qpdf|xref|libjpeg/i)).not.toBeInTheDocument();
  });

  it("ignores a stale completion after cancellation and a newer selection", async () => {
    const { runtime } = setup();
    choose(pdfFile("first.pdf"));
    fireEvent.click(screen.getByRole("button", { name: "Reduce PDF" }));
    await waitFor(() => expect(runtime.jobs).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    choose(pdfFile("second.pdf"));
    fireEvent.click(screen.getByRole("button", { name: "Reduce PDF" }));
    await waitFor(() => expect(runtime.jobs).toHaveLength(2));
    await act(async () => runtime.jobs[0].deferred.resolve(reductionResult()));
    expect(screen.queryByRole("link", { name: "Download reduced PDF" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Processing your PDF in this browser");

    await act(async () =>
      runtime.jobs[1].deferred.resolve(
        reductionResult({ outputBytes: 20, reductionRecommended: false }),
      ),
    );
    expect(screen.getByRole("heading", { name: "This PDF is already well optimised." })).toBeInTheDocument();
  });

  it("revokes result object URLs on replacement and unmount", async () => {
    const { runtime, unmount } = setup();
    choose(pdfFile());
    fireEvent.click(screen.getByRole("button", { name: "Reduce PDF" }));
    await waitFor(() => expect(runtime.jobs).toHaveLength(1));
    await act(async () => runtime.jobs[0].deferred.resolve(reductionResult()));

    choose(pdfFile("replacement.pdf"));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:reduced-pdf");

    fireEvent.click(screen.getByRole("button", { name: "Reduce PDF" }));
    await waitFor(() => expect(runtime.jobs).toHaveLength(2));
    await act(async () => runtime.jobs[1].deferred.resolve(reductionResult()));
    revokeObjectURL.mockClear();
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:reduced-pdf");
  });
});
