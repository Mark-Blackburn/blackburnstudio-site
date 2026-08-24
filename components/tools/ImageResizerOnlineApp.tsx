"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { SectionEyebrow, StudioButton } from "@/components/studio";

import {
  isImageResizerWorkerResponse,
  type ImageResizerCapabilities,
  type ImageResizerOutputFormat,
  type ImageResizerWorkerRequest,
} from "./imageResizerWorkerProtocol";

type WorkerFactory = () => Worker;

type ImageResizerOnlineAppProps = {
  workerFactory?: WorkerFactory;
};

type RuntimeState = "preparing" | "ready" | "error";
type SelectionState = "empty" | "reading" | "ready" | "error";
type ProcessingState = "idle" | "processing" | "success" | "error";

type SelectedImage = {
  file: File;
  imageId: string;
  width?: number;
  height?: number;
  sourceFormat?: "JPEG" | "PNG" | "WebP";
};

type ProcessedResult = {
  url: string;
  suggestedFilename: string;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  outputFormat: "JPEG" | "PNG" | "WebP";
  outputSize: number;
  processingMs: number;
};

const PRESETS = [
  { label: "Product Large — 2000 px long edge", value: "2000" },
  { label: "Standard — 1600 px long edge", value: "1600" },
  { label: "Small — 1000 px long edge", value: "1000" },
  { label: "Thumbnail — 600 px long edge", value: "600" },
] as const;

const ACCEPTED_EXTENSIONS = /\.(?:jpe?g|png|webp)$/i;
const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function defaultWorkerFactory() {
  return new Worker(new URL("./imageResizer.worker.ts", import.meta.url), {
    type: "module",
    name: "blackburn-image-resizer",
  });
}

function requestId(prefix: string, sequence: number) {
  return `${prefix}-${sequence}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function outputMimeType(format: "JPEG" | "PNG" | "WebP") {
  if (format === "JPEG") {
    return "image/jpeg";
  }

  return `image/${format.toLowerCase()}`;
}

function fileLooksSupported(file: File) {
  return (
    ACCEPTED_MIME_TYPES.has(file.type.toLowerCase()) ||
    ACCEPTED_EXTENSIONS.test(file.name)
  );
}

export default function ImageResizerOnlineApp({
  workerFactory = defaultWorkerFactory,
}: ImageResizerOnlineAppProps) {
  const workerRef = useRef<Worker | null>(null);
  const sequenceRef = useRef(0);
  const selectedImageRef = useRef<SelectedImage | null>(null);
  const activeInitializationRef = useRef("");
  const activeSelectionRef = useRef("");
  const activeProcessingRef = useRef("");
  const resultUrlRef = useRef<string | null>(null);

  const [runtimeState, setRuntimeState] =
    useState<RuntimeState>("preparing");
  const [runtimeError, setRuntimeError] = useState("");
  const [initializationMs, setInitializationMs] = useState<number>();
  const [capabilities, setCapabilities] =
    useState<ImageResizerCapabilities>();
  const [selectionState, setSelectionState] =
    useState<SelectionState>("empty");
  const [selectionError, setSelectionError] = useState("");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );
  const [preset, setPreset] = useState("1600");
  const [customLongEdge, setCustomLongEdge] = useState("1200");
  const [neverEnlarge, setNeverEnlarge] = useState(true);
  const [outputFormat, setOutputFormat] =
    useState<ImageResizerOutputFormat>("original");
  const [quality, setQuality] = useState(85);
  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");
  const [processingError, setProcessingError] = useState("");
  const [result, setResult] = useState<ProcessedResult | null>(null);

  function nextRequestId(prefix: string) {
    sequenceRef.current += 1;
    return requestId(prefix, sequenceRef.current);
  }

  function revokeResultUrl() {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }

  function sendInitializationRequest() {
    const initializationRequestId = nextRequestId("initialize");
    activeInitializationRef.current = initializationRequestId;
    setRuntimeState("preparing");
    setRuntimeError("");
    workerRef.current?.postMessage({
      type: "initialize",
      requestId: initializationRequestId,
    } satisfies ImageResizerWorkerRequest);
  }

  async function sendSelectedFile(file: File, imageId: string) {
    const selectionRequestId = nextRequestId("select");
    activeSelectionRef.current = selectionRequestId;

    try {
      const bytes = await file.arrayBuffer();
      if (selectedImageRef.current?.imageId !== imageId) {
        return;
      }

      const message: ImageResizerWorkerRequest = {
        type: "select-image",
        requestId: selectionRequestId,
        imageId,
        fileName: file.name,
        bytes,
      };
      workerRef.current?.postMessage(message, [bytes]);
    } catch {
      if (selectedImageRef.current?.imageId === imageId) {
        setSelectionState("error");
        setSelectionError("This file could not be read by the browser.");
      }
    }
  }

  function selectFile(file: File) {
    revokeResultUrl();
    setResult(null);
    setProcessingState("idle");
    setProcessingError("");
    setSelectionError("");

    if (!fileLooksSupported(file)) {
      selectedImageRef.current = null;
      setSelectedImage(null);
      setSelectionState("error");
      setSelectionError("Choose a JPEG, PNG or WebP image.");
      return;
    }

    const imageId = nextRequestId("image");
    const nextImage = { file, imageId };
    selectedImageRef.current = nextImage;
    setSelectedImage(nextImage);
    setSelectionState("reading");
    void sendSelectedFile(file, imageId);
  }

  useEffect(() => {
    const worker = workerFactory();
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (!isImageResizerWorkerResponse(event.data)) {
        return;
      }

      const message = event.data;

      if (
        (message.type === "initializing" || message.type === "ready") &&
        message.requestId !== activeInitializationRef.current
      ) {
        return;
      }

      if (message.type === "ready") {
        setCapabilities(message.capabilities);
        setInitializationMs(message.initializationMs);
        setRuntimeState("ready");
        setRuntimeError("");
        return;
      }

      if (message.type === "image-selected") {
        if (
          message.requestId !== activeSelectionRef.current ||
          message.imageId !== selectedImageRef.current?.imageId
        ) {
          return;
        }

        const inspectedImage = {
          ...selectedImageRef.current,
          width: message.width,
          height: message.height,
          sourceFormat: message.sourceFormat,
        };
        selectedImageRef.current = inspectedImage;
        setSelectedImage(inspectedImage);
        setSelectionState("ready");
        setSelectionError("");
        return;
      }

      if (message.type === "processed") {
        if (
          message.requestId !== activeProcessingRef.current ||
          message.imageId !== selectedImageRef.current?.imageId
        ) {
          return;
        }

        revokeResultUrl();
        const blob = new Blob([message.bytes], {
          type: outputMimeType(message.outputFormat),
        });
        const url = URL.createObjectURL(blob);
        resultUrlRef.current = url;
        setResult({
          url,
          suggestedFilename: message.suggestedFilename,
          originalWidth: message.originalWidth,
          originalHeight: message.originalHeight,
          width: message.width,
          height: message.height,
          outputFormat: message.outputFormat,
          outputSize: blob.size,
          processingMs: message.processingMs,
        });
        setProcessingState("success");
        setProcessingError("");
        return;
      }

      if (message.type !== "error") {
        return;
      }

      if (
        message.stage === "initialization" &&
        message.requestId === activeInitializationRef.current
      ) {
        setRuntimeState("error");
        setRuntimeError(message.message);
      } else if (
        message.stage === "selection" &&
        message.requestId === activeSelectionRef.current
      ) {
        setSelectionState("error");
        setSelectionError(message.message);
      } else if (
        message.stage === "processing" &&
        message.requestId === activeProcessingRef.current
      ) {
        setProcessingState("error");
        setProcessingError(message.message);
      }
    };

    const handleWorkerError = () => {
      setRuntimeState("error");
      setRuntimeError(
        "The browser image worker stopped unexpectedly. Reload the page to try again.",
      );
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleWorkerError);
    const initializationRequestId = nextRequestId("initialize");
    activeInitializationRef.current = initializationRequestId;
    worker.postMessage({
      type: "initialize",
      requestId: initializationRequestId,
    } satisfies ImageResizerWorkerRequest);

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleWorkerError);
      worker.terminate();
      workerRef.current = null;
      revokeResultUrl();
    };
    // The worker factory is intentionally fixed for this page session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      selectFile(file);
    }
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      selectFile(file);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedImage || selectionState !== "ready") {
      return;
    }

    const longEdge = Number(preset === "custom" ? customLongEdge : preset);
    if (!Number.isInteger(longEdge) || longEdge <= 0) {
      setProcessingState("error");
      setProcessingError("Enter a positive whole number for the long edge.");
      return;
    }

    revokeResultUrl();
    setResult(null);
    setProcessingState("processing");
    setProcessingError("");
    const processingRequestId = nextRequestId("process");
    activeProcessingRef.current = processingRequestId;
    workerRef.current?.postMessage({
      type: "process-image",
      requestId: processingRequestId,
      imageId: selectedImage.imageId,
      longEdge,
      neverEnlarge,
      outputFormat,
      quality,
    } satisfies ImageResizerWorkerRequest);
  }

  const effectiveOutputFormat =
    outputFormat === "original" ? selectedImage?.sourceFormat : outputFormat;
  const showQuality =
    effectiveOutputFormat === "JPEG" || effectiveOutputFormat === "WebP";
  const customLongEdgeIsValid =
    preset !== "custom" ||
    (Number.isInteger(Number(customLongEdge)) && Number(customLongEdge) > 0);
  const canProcess =
    runtimeState === "ready" &&
    selectionState === "ready" &&
    Boolean(selectedImage) &&
    processingState !== "processing" &&
    customLongEdgeIsValid &&
    (effectiveOutputFormat !== "WebP" || capabilities?.WebP === true);
  const isLargeImage =
    selectedImage?.width &&
    selectedImage.height &&
    selectedImage.width * selectedImage.height > 24_000_000;

  return (
    <>
      <section aria-labelledby="online-resizer-heading" className="max-w-[80ch]">
        <SectionEyebrow>Online tool</SectionEyebrow>
        <h1
          id="online-resizer-heading"
          className="mt-4 max-w-[22ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
        >
          Resize website images in your browser
        </h1>
        <p className="mt-7 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
          Resize one JPEG, PNG or WebP image with the same shared processing
          engine used by the Windows application. Processing happens locally
          in your browser—your image is not uploaded to Blackburn Studio.
        </p>
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-start">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-8"
        >
          <section aria-labelledby="select-image-heading">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-studio-dim">
                  Step 1
                </p>
                <h2
                  id="select-image-heading"
                  className="mt-2 text-2xl font-medium tracking-tight text-studio-text"
                >
                  Choose an image
                </h2>
              </div>
              <p className="text-sm text-studio-dim">JPEG, PNG or WebP</p>
            </div>

            <div
              className="mt-6 rounded-xl border border-dashed border-studio-border bg-studio-surface-soft/45 px-5 py-8 text-center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <label
                htmlFor="image-resizer-file"
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[11px] border border-studio-border px-5 py-2.5 text-sm font-medium text-studio-text transition hover:border-white/35 focus-within:ring-2 focus-within:ring-white/70"
              >
                Select image
                <input
                  id="image-resizer-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </label>
              <p className="mt-3 text-sm text-studio-dim">
                or drop one image here
              </p>
            </div>

            {selectedImage ? (
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-studio-dim">Selected file</dt>
                  <dd className="mt-1 truncate text-studio-text" title={selectedImage.file.name}>
                    {selectedImage.file.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-studio-dim">Original size</dt>
                  <dd className="mt-1 text-studio-text">
                    {formatFileSize(selectedImage.file.size)}
                  </dd>
                </div>
                <div>
                  <dt className="text-studio-dim">Dimensions</dt>
                  <dd className="mt-1 text-studio-text">
                    {selectionState === "reading"
                      ? "Reading…"
                      : selectedImage.width && selectedImage.height
                        ? `${selectedImage.width} × ${selectedImage.height} px`
                        : "Unavailable"}
                  </dd>
                </div>
              </dl>
            ) : null}

            {selectionError ? (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {selectionError}
              </p>
            ) : null}
            {isLargeImage ? (
              <p className="mt-4 rounded-lg border border-amber-200/20 bg-amber-100/5 px-4 py-3 text-sm leading-relaxed text-amber-100/85">
                This is a large image. Resizing may use significant browser
                memory, especially on a phone or tablet.
              </p>
            ) : null}
          </section>

          <section
            aria-labelledby="resize-options-heading"
            className="mt-9 border-t border-studio-border/60 pt-8"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-studio-dim">
              Step 2
            </p>
            <h2
              id="resize-options-heading"
              className="mt-2 text-2xl font-medium tracking-tight text-studio-text"
            >
              Set the output
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="image-resizer-preset" className="text-sm font-medium text-studio-text">
                  Preset
                </label>
                <select
                  id="image-resizer-preset"
                  value={preset}
                  onChange={(event) => setPreset(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {PRESETS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  <option value="custom">Custom long edge</option>
                </select>
              </div>

              {preset === "custom" ? (
                <div>
                  <label htmlFor="image-resizer-custom-edge" className="text-sm font-medium text-studio-text">
                    Custom long edge (px)
                  </label>
                  <input
                    id="image-resizer-custom-edge"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={customLongEdge}
                    onChange={(event) => setCustomLongEdge(event.target.value)}
                    aria-invalid={!customLongEdgeIsValid}
                    className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  />
                </div>
              ) : null}

              <div>
                <label htmlFor="image-resizer-format" className="text-sm font-medium text-studio-text">
                  Output format
                </label>
                <select
                  id="image-resizer-format"
                  value={outputFormat}
                  onChange={(event) =>
                    setOutputFormat(
                      event.target.value as ImageResizerOutputFormat,
                    )
                  }
                  className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <option value="original">Keep original format</option>
                  <option value="JPEG">JPEG</option>
                  <option value="PNG">PNG</option>
                  <option value="WebP" disabled={capabilities?.WebP === false}>
                    WebP{capabilities?.WebP === false ? " — unavailable" : ""}
                  </option>
                </select>
                {capabilities?.WebP === false ? (
                  <p className="mt-2 text-xs leading-relaxed text-studio-dim">
                    WebP output is unavailable in the loaded browser runtime.
                  </p>
                ) : null}
              </div>

              {showQuality ? (
                <div>
                  <label htmlFor="image-resizer-quality" className="flex justify-between gap-4 text-sm font-medium text-studio-text">
                    <span>Quality</span>
                    <span>{quality}</span>
                  </label>
                  <input
                    id="image-resizer-quality"
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(event) => setQuality(Number(event.target.value))}
                    className="mt-3 w-full accent-white"
                  />
                </div>
              ) : null}
            </div>

            <label className="mt-6 flex w-fit items-start gap-3 text-sm text-studio-muted">
              <input
                type="checkbox"
                checked={neverEnlarge}
                onChange={(event) => setNeverEnlarge(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-white"
              />
              <span>
                <span className="font-medium text-studio-text">Never enlarge</span>
                <span className="mt-1 block text-studio-dim">
                  Keep smaller source images at their original dimensions.
                </span>
              </span>
            </label>
          </section>

          <div className="mt-9 border-t border-studio-border/60 pt-7">
            <StudioButton
              type="submit"
              variant="primary"
              disabled={!canProcess}
              className="disabled:cursor-not-allowed disabled:opacity-45"
            >
              {processingState === "processing" ? "Resizing image…" : "Resize image"}
            </StudioButton>
            {!selectedImage ? (
              <p className="mt-3 text-sm text-studio-dim">
                Select an image to continue.
              </p>
            ) : null}
            {processingError ? (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {processingError}
              </p>
            ) : null}
          </div>
        </form>

        <aside className="space-y-6">
          <section
            aria-labelledby="runtime-status-heading"
            className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6"
          >
            <h2
              id="runtime-status-heading"
              className="text-sm font-medium text-studio-text"
            >
              Browser runtime
            </h2>
            <div className="mt-4" role="status" aria-live="polite">
              {runtimeState === "preparing" ? (
                <p className="text-sm text-studio-muted">
                  Preparing image tools…
                </p>
              ) : runtimeState === "ready" ? (
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-studio-text">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />
                    Ready
                  </p>
                  {initializationMs !== undefined ? (
                    <p className="mt-2 text-xs text-studio-dim">
                      Started in {(initializationMs / 1000).toFixed(1)} seconds
                    </p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-red-300">
                    Unable to initialise image tools
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-studio-dim">
                    {runtimeError}
                  </p>
                  <div className="mt-4">
                    <StudioButton variant="secondary" onClick={sendInitializationRequest}>
                      Try again
                    </StudioButton>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section
            aria-labelledby="privacy-note-heading"
            className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6"
          >
            <h2
              id="privacy-note-heading"
              className="text-xl font-medium tracking-tight text-studio-text"
            >
              Your images stay on your device
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-studio-muted">
              Image bytes are sent only to a dedicated worker inside this page.
              The browser downloads the image runtime and shared processing
              engine, but it does not upload your source image or result.
            </p>
          </section>

          <section
            aria-labelledby="result-heading"
            className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6"
            aria-live="polite"
          >
            <h2
              id="result-heading"
              className="text-xl font-medium tracking-tight text-studio-text"
            >
              Result
            </h2>
            {result && selectedImage ? (
              <div className="mt-5">
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-studio-dim">Output filename</dt>
                    <dd className="mt-1 break-all text-studio-text">
                      {result.suggestedFilename}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-studio-dim">Original</dt>
                      <dd className="mt-1 text-studio-text">
                        {result.originalWidth} × {result.originalHeight} px
                      </dd>
                    </div>
                    <div>
                      <dt className="text-studio-dim">Output</dt>
                      <dd className="mt-1 text-studio-text">
                        {result.width} × {result.height} px
                      </dd>
                    </div>
                    <div>
                      <dt className="text-studio-dim">Original size</dt>
                      <dd className="mt-1 text-studio-text">
                        {formatFileSize(selectedImage.file.size)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-studio-dim">Output size</dt>
                      <dd className="mt-1 text-studio-text">
                        {formatFileSize(result.outputSize)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-studio-dim">Format</dt>
                      <dd className="mt-1 text-studio-text">
                        {result.outputFormat}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-studio-dim">Processing time</dt>
                      <dd className="mt-1 text-studio-text">
                        {(result.processingMs / 1000).toFixed(1)} s
                      </dd>
                    </div>
                  </div>
                </dl>
                <a
                  href={result.url}
                  download={result.suggestedFilename}
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[11px] bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
                >
                  Download resized image
                </a>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-studio-dim">
                Your resized image and download link will appear here after
                processing.
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}