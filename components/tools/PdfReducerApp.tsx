"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { SectionEyebrow, StudioButton, StudioTag } from "@/components/studio";
import {
  PDF_REDUCER_SOURCE_LIMITS,
  PdfReducerError,
  PdfReducerRuntime,
  type PdfReducerErrorCode,
  type PdfReducerMode,
  type PdfReducerResult,
} from "@/lib/pdf-reducer";

type PdfReducerRuntimeLike = {
  process(mode: PdfReducerMode, input: ArrayBuffer): Promise<PdfReducerResult>;
  cancel(): boolean;
};

type PdfReducerAppProps = {
  runtimeFactory?: () => PdfReducerRuntimeLike;
};

type Phase = "empty" | "ready" | "processing" | "success" | "no-reduction" | "error";

type ReductionResult = {
  inputBytes: number;
  outputBytes: number;
  percentage: number;
  url: string;
  filename: string;
};

const MODE_OPTIONS: Array<{
  mode: PdfReducerMode;
  title: string;
  description: string;
  limit: string;
}> = [
  {
    mode: "optimize",
    title: "Optimize",
    description: "Reduces PDF overhead without deliberately lowering image quality.",
    limit: "Up to 25 MB",
  },
  {
    mode: "reduce-images",
    title: "Reduce images",
    description:
      "Reduces oversized and high-quality images to make photo and scanned PDFs smaller while keeping text, links and other PDF content intact.",
    limit: "Up to 15 MB",
  },
];

const ERROR_COPY: Record<PdfReducerErrorCode, string> = {
  INVALID_PDF: "This file does not appear to be a valid PDF.",
  ENCRYPTED_PDF: "Password-protected PDFs are not supported.",
  FILE_TOO_LARGE: "This PDF is too large for the selected mode.",
  IMAGE_LIMIT: "An image in this PDF exceeds the safe processing limit.",
  PROCESSING_FAILED: "The PDF could not be processed. Try again or choose another PDF.",
  VALIDATION_FAILED:
    "We couldn't safely create a valid reduced PDF, so no output has been provided.",
  RUNTIME_FAILED: "The browser PDF processor stopped unexpectedly. Try again.",
  CANCELLED: "PDF processing was cancelled.",
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || (file.type === "" && /\.pdf$/i.test(file.name));
}

function reducedFilename(filename: string) {
  const base = filename.replace(/\.pdf$/i, "").trim() || "document";
  return `${base}-reduced.pdf`;
}

function percentageSaved(inputBytes: number, outputBytes: number) {
  if (!Number.isFinite(inputBytes) || inputBytes <= 0 || !Number.isFinite(outputBytes)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((1 - outputBytes / inputBytes) * 100)));
}

export default function PdfReducerApp({
  runtimeFactory = () => new PdfReducerRuntime(),
}: PdfReducerAppProps) {
  const [mode, setMode] = useState<PdfReducerMode>("reduce-images");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("empty");
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<PdfReducerErrorCode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<ReductionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const runtimeRef = useRef<PdfReducerRuntimeLike | null>(null);
  const operationRef = useRef(0);
  const mountedRef = useRef(true);
  const resultUrlRef = useRef<string | null>(null);

  function revokeResultUrl() {
    if (!resultUrlRef.current) return;
    URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
  }

  function clearResult() {
    revokeResultUrl();
    setResult(null);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      runtimeRef.current?.cancel();
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
        resultUrlRef.current = null;
      }
    };
  }, []);

  const modeLimit = PDF_REDUCER_SOURCE_LIMITS[mode];
  const sizeError =
    selectedFile && selectedFile.size > modeLimit
      ? `${selectedFile.name} is larger than the ${mode === "optimize" ? "25 MB" : "15 MB"} limit for ${mode === "optimize" ? "Optimize" : "Reduce images"}.`
      : null;
  const processing = phase === "processing";

  function selectFiles(files: File[]) {
    if (processing) return;
    setSelectionError(null);
    setRuntimeError(null);
    setNotice(null);

    if (files.length !== 1) {
      setSelectionError("Choose exactly one PDF file.");
      return;
    }

    const file = files[0];
    if (!isPdfFile(file)) {
      clearResult();
      setSelectedFile(null);
      setPhase("empty");
      setSelectionError("Choose a PDF file.");
      return;
    }

    operationRef.current += 1;
    clearResult();
    setSelectedFile(file);
    setPhase("ready");
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    selectFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    selectFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function openFilePicker() {
    if (!processing) fileInputRef.current?.click();
  }

  function handleDropZoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }

  function changeMode(nextMode: PdfReducerMode) {
    if (processing || nextMode === mode) return;
    operationRef.current += 1;
    clearResult();
    setMode(nextMode);
    setRuntimeError(null);
    setNotice(null);
    setPhase(selectedFile ? "ready" : "empty");
  }

  async function processPdf() {
    if (!selectedFile || sizeError || processing) return;
    const file = selectedFile;
    const operation = ++operationRef.current;
    clearResult();
    setRuntimeError(null);
    setNotice(null);
    setPhase("processing");

    try {
      const input = await file.arrayBuffer();
      if (!mountedRef.current || operationRef.current !== operation) return;
      const runtime = runtimeRef.current ?? runtimeFactory();
      runtimeRef.current = runtime;
      const response = await runtime.process(mode, input);
      if (!mountedRef.current || operationRef.current !== operation) return;

      if (!response.reductionRecommended) {
        setPhase("no-reduction");
        return;
      }

      const blob = new Blob([response.output], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({
        inputBytes: response.inputBytes,
        outputBytes: response.outputBytes,
        percentage: percentageSaved(response.inputBytes, response.outputBytes),
        url,
        filename: reducedFilename(file.name),
      });
      setPhase("success");
    } catch (error) {
      if (!mountedRef.current || operationRef.current !== operation) return;
      const code = error instanceof PdfReducerError ? error.code : "RUNTIME_FAILED";
      if (code === "CANCELLED") {
        setPhase("ready");
        setNotice("Processing cancelled. Your PDF is still selected.");
        return;
      }
      setRuntimeError(code);
      setPhase("error");
    }
  }

  function cancelProcessing() {
    if (!processing) return;
    operationRef.current += 1;
    runtimeRef.current?.cancel();
    setPhase(selectedFile ? "ready" : "empty");
    setNotice("Processing cancelled. Your PDF is still selected.");
  }

  function removeFile() {
    if (processing) return;
    operationRef.current += 1;
    clearResult();
    setSelectedFile(null);
    setSelectionError(null);
    setRuntimeError(null);
    setNotice(null);
    setPhase("empty");
  }

  function prepareAnother(nextMode = mode) {
    if (processing) return;
    operationRef.current += 1;
    clearResult();
    setSelectedFile(null);
    setMode(nextMode);
    setSelectionError(null);
    setRuntimeError(null);
    setNotice(null);
    setPhase("empty");
  }

  function retryWithMode(nextMode: PdfReducerMode) {
    operationRef.current += 1;
    clearResult();
    setMode(nextMode);
    setRuntimeError(null);
    setNotice(null);
    setPhase(selectedFile ? "ready" : "empty");
  }

  return (
    <div className="pb-24 md:pb-32">
      <header className="max-w-[76ch]">
        <SectionEyebrow>Blackburn Studio Tools</SectionEyebrow>
        <h1 className="mt-4 text-4xl font-medium tracking-tight text-studio-text md:text-5xl">
          Reduce a PDF
        </h1>
        <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
          Choose a PDF and a reduction method. Processing happens locally in this browser,
          and your document is not uploaded to Blackburn Studio.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <StudioTag>PDF only</StudioTag>
          <StudioTag>Local processing</StudioTag>
          <StudioTag>No upload</StudioTag>
        </div>
      </header>

      <section className="mt-10 rounded-3xl border border-studio-border bg-studio-surface p-5 shadow-2xl shadow-black/20 sm:p-7 md:p-9">
        <fieldset disabled={processing}>
          <legend className="text-xl font-medium tracking-tight text-studio-text">
            Choose how to reduce your PDF
          </legend>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {MODE_OPTIONS.map((option) => {
              const selected = option.mode === mode;
              return (
                <label
                  key={option.mode}
                  className={`relative flex cursor-pointer flex-col rounded-2xl border p-5 transition focus-within:ring-2 focus-within:ring-white/70 ${
                    selected
                      ? "border-white/40 bg-studio-surface-raised"
                      : "border-studio-border bg-studio-surface-soft hover:border-white/25"
                  } ${processing ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <input
                    type="radio"
                    name="pdf-reducer-mode"
                    value={option.mode}
                    checked={selected}
                    onChange={() => changeMode(option.mode)}
                    className="sr-only"
                  />
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-lg font-medium text-studio-text">{option.title}</span>
                    <span className="text-xs uppercase tracking-[0.14em] text-studio-dim">
                      {selected ? "Selected" : option.limit}
                    </span>
                  </span>
                  <span className="mt-3 text-sm leading-relaxed text-studio-muted">
                    {option.description}
                  </span>
                  {selected ? (
                    <span className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-studio-text">
                      {option.limit}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        {mode === "reduce-images" ? (
          <p className="mt-4 text-sm leading-relaxed text-studio-dim">
            Image reduction can soften fine detail. Images and formats that cannot be changed
            safely are left untouched.
          </p>
        ) : null}

        <div className="mt-8 border-t border-studio-border/70 pt-8">
          <h2 className="text-xl font-medium tracking-tight text-studio-text">Choose your PDF</h2>
          <input
            ref={fileInputRef}
            id="pdf-reducer-file"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={handleFileInput}
            disabled={processing}
            aria-label="Choose PDF file"
          />

          {!selectedFile ? (
            <div
              role="button"
              tabIndex={processing ? -1 : 0}
              aria-label="Choose or drop one PDF file"
              aria-disabled={processing}
              onClick={openFilePicker}
              onKeyDown={handleDropZoneKeyDown}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="mt-5 cursor-pointer rounded-2xl border border-dashed border-white/20 bg-studio-surface-raised px-5 py-10 text-center transition hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-surface"
            >
              <span className="inline-flex min-h-11 items-center justify-center rounded-[11px] bg-white px-6 py-2.5 text-sm font-semibold text-black">
                Choose PDF
              </span>
              <p className="mt-4 text-sm text-studio-muted">or drop one PDF file here</p>
              <p className="mt-2 text-xs text-studio-dim">
                Accepted file: PDF. Your file stays on your device.
              </p>
            </div>
          ) : (
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="mt-5 rounded-2xl border border-studio-border bg-studio-surface-raised p-5"
            >
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="wrap-break-word font-medium text-studio-text">{selectedFile.name}</p>
                  <p className="mt-1 text-sm text-studio-dim">{formatBytes(selectedFile.size)}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={processing}
                    className="min-h-11 text-studio-muted underline decoration-studio-border underline-offset-4 transition hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50"
                  >
                    Replace PDF
                  </button>
                  <button
                    type="button"
                    onClick={removeFile}
                    disabled={processing}
                    className="min-h-11 text-studio-muted underline decoration-studio-border underline-offset-4 transition hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectionError ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200">
              {selectionError}
            </p>
          ) : null}
          {sizeError ? (
            <div role="alert" className="mt-4 rounded-xl border border-amber-200/20 bg-amber-100/5 px-4 py-3 text-sm leading-relaxed text-amber-100/90">
              <p>{sizeError}</p>
              {mode === "reduce-images" && selectedFile && selectedFile.size <= PDF_REDUCER_SOURCE_LIMITS.optimize ? (
                <button
                  type="button"
                  onClick={() => changeMode("optimize")}
                  className="mt-2 min-h-11 font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Switch to Optimize
                </button>
              ) : null}
            </div>
          ) : null}
          {notice ? <p role="status" className="mt-4 text-sm text-studio-muted">{notice}</p> : null}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-studio-border/70 pt-7">
          {processing ? (
            <>
              <div role="status" aria-live="polite" className="flex min-h-11 items-center gap-3 text-sm text-studio-text">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-studio-border border-t-studio-text" aria-hidden="true" />
                Processing your PDF in this browser…
              </div>
              <StudioButton onClick={cancelProcessing} variant="secondary">
                Cancel
              </StudioButton>
            </>
          ) : (
            <StudioButton
              onClick={() => void processPdf()}
              disabled={!selectedFile || Boolean(sizeError)}
              variant="primary"
            >
              Reduce PDF
            </StudioButton>
          )}
          <p className="text-xs leading-relaxed text-studio-dim">No upload or server processing.</p>
        </div>
      </section>

      {phase === "success" && result ? (
        <section aria-labelledby="pdf-result-heading" aria-live="polite" className="mt-8 rounded-3xl border border-white/20 bg-studio-surface-soft p-6 md:p-9">
          <SectionEyebrow>Reduction complete</SectionEyebrow>
          <h2 id="pdf-result-heading" className="mt-3 text-3xl font-medium tracking-tight text-studio-text">
            Your smaller PDF is ready
          </h2>
          <dl className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["Original", formatBytes(result.inputBytes)],
              ["Reduced", formatBytes(result.outputBytes)],
              ["Saved", `${result.percentage}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-studio-surface-raised px-5 py-4">
                <dt className="text-xs uppercase tracking-[0.16em] text-studio-dim">{label}</dt>
                <dd className="mt-2 text-2xl font-medium text-studio-text">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-studio-muted">{result.percentage}% smaller</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={result.url}
              download={result.filename}
              className="inline-flex min-h-11 items-center justify-center rounded-[11px] bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
            >
              Download reduced PDF
            </a>
            <StudioButton onClick={() => prepareAnother()} variant="secondary">
              Reduce another PDF
            </StudioButton>
            <StudioButton
              onClick={() => retryWithMode(mode === "optimize" ? "reduce-images" : "optimize")}
              variant="secondary"
            >
              Try another mode
            </StudioButton>
          </div>
        </section>
      ) : null}

      {phase === "no-reduction" ? (
        <section aria-labelledby="pdf-no-reduction-heading" aria-live="polite" className="mt-8 rounded-3xl border border-studio-border bg-studio-surface-soft p-6 md:p-9">
          <SectionEyebrow>No smaller output</SectionEyebrow>
          <h2 id="pdf-no-reduction-heading" className="mt-3 text-3xl font-medium tracking-tight text-studio-text">
            This PDF is already well optimised.
          </h2>
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-studio-muted">
            The processed version was not smaller, so your original file remains the better option.
          </p>
          <div className="mt-7">
            {mode === "optimize" ? (
              <StudioButton onClick={() => retryWithMode("reduce-images")} variant="primary">
                Try Reduce images
              </StudioButton>
            ) : (
              <StudioButton onClick={() => prepareAnother()} variant="primary">
                Choose another PDF
              </StudioButton>
            )}
          </div>
        </section>
      ) : null}

      {phase === "error" && runtimeError ? (
        <section role="alert" aria-labelledby="pdf-error-heading" className="mt-8 rounded-3xl border border-red-300/20 bg-red-300/5 p-6 md:p-8">
          <SectionEyebrow>Could not reduce PDF</SectionEyebrow>
          <h2 id="pdf-error-heading" className="mt-3 text-2xl font-medium tracking-tight text-studio-text">
            No output was created
          </h2>
          <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-red-100">{ERROR_COPY[runtimeError]}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <StudioButton onClick={() => setPhase(selectedFile ? "ready" : "empty")} variant="primary">
              Try again
            </StudioButton>
            <StudioButton onClick={() => prepareAnother()} variant="secondary">
              Choose another PDF
            </StudioButton>
            {runtimeError === "FILE_TOO_LARGE" && mode === "reduce-images" && selectedFile && selectedFile.size <= PDF_REDUCER_SOURCE_LIMITS.optimize ? (
              <StudioButton onClick={() => retryWithMode("optimize")} variant="secondary">
                Try Optimize
              </StudioButton>
            ) : null}
          </div>
        </section>
      ) : null}

      <aside className="mt-10 border-l border-studio-border pl-5 text-sm leading-relaxed text-studio-muted">
        <h2 className="font-medium text-studio-text">Your PDF stays on your device</h2>
        <p className="mt-2 max-w-[70ch]">
          Document contents and filenames are not sent to Blackburn Studio for processing.
          Processing stops if you cancel or close this page.
        </p>
      </aside>
    </div>
  );
}
