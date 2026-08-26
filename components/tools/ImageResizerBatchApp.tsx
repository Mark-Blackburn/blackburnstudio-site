"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { SectionEyebrow, StudioButton } from "@/components/studio";

import ImageResizerCropEditor, {
  type CropEditorItem,
} from "./ImageResizerCropEditor";
import {
  defaultOutputFilename,
  effectiveOutputFormat,
  normaliseOutputFilename,
  titleFromFilename,
  type ConcreteImageFormat,
  uniqueOutputFilenames,
} from "./imageResizerBatch";
import {
  cropAspectForRatio,
  cropRatioLabel,
  cropRectForZoom,
  parseCustomCropAspect,
  resetCropPreview,
  zoomForCropRect,
  type CropRatio,
  type CropRect,
} from "./imageResizerCropGeometry";
import {
  isImageResizerWorkerResponse,
  type ImageResizerCapabilities,
  type ImageResizerOutputFormat,
  type ImageResizerWorkerRequest,
  type ImageResizerWorkerResponse,
} from "./imageResizerWorkerProtocol";

type WorkerFactory = () => Worker;

type ImageResizerBatchAppProps = {
  workerFactory?: WorkerFactory;
};

type RuntimeState = "preparing" | "ready" | "error";
type QueueStatus =
  | "inspecting"
  | "queued"
  | "processing"
  | "complete"
  | "failed";

type ProcessedResult = {
  blob: Blob;
  url: string;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  outputFormat: ConcreteImageFormat;
  processingMs: number;
};

type QueueItem = {
  id: string;
  file: File;
  status: QueueStatus;
  detailsExpanded: boolean;
  sourceFormat?: ConcreteImageFormat;
  width?: number;
  height?: number;
  outputFilename: string;
  outputFilenameEdited: boolean;
  title: string;
  altText: string;
  cropEnabled: boolean;
  cropRatio: CropRatio;
  cropCustomWidth: string;
  cropCustomHeight: string;
  cropRect?: CropRect;
  cropZoom: number;
  cropPrediction?: {
    cropWidth: number;
    cropHeight: number;
    outputWidth: number;
    outputHeight: number;
  };
  cropPredictionError?: string;
  cropPreviewError?: string;
  error?: string;
  result?: ProcessedResult;
  copyStatus?: string;
};

type PendingRequest = {
  resolve: (message: ImageResizerWorkerResponse) => void;
  reject: (error: Error) => void;
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
const CREATOR_STORAGE_KEY = "blackburn-image-resizer-creator";
const COPYRIGHT_STORAGE_KEY = "blackburn-image-resizer-copyright";
const WORKER_FAILURE_MESSAGE =
  "The browser image worker stopped unexpectedly. Reload the page to try again.";

function defaultWorkerFactory() {
  return new Worker(new URL("./imageResizer.worker.ts", import.meta.url), {
    type: "module",
    name: "blackburn-image-resizer",
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function outputMimeType(format: ConcreteImageFormat) {
  return format === "JPEG" ? "image/jpeg" : `image/${format.toLowerCase()}`;
}

function sourceFormatFromFile(file: File): ConcreteImageFormat {
  const value = `${file.type} ${file.name}`.toLowerCase();
  if (value.includes("png") || file.name.toLowerCase().endsWith(".png")) {
    return "PNG";
  }
  if (value.includes("webp") || file.name.toLowerCase().endsWith(".webp")) {
    return "WebP";
  }
  return "JPEG";
}

function fileLooksSupported(file: File) {
  return (
    ACCEPTED_MIME_TYPES.has(file.type.toLowerCase()) ||
    ACCEPTED_EXTENSIONS.test(file.name)
  );
}

function statusLabel(status: QueueStatus) {
  return {
    inspecting: "Reading",
    queued: "Queued",
    processing: "Processing",
    complete: "Complete",
    failed: "Failed",
  }[status];
}

function readLocalDefault(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeLocalDefault(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export default function ImageResizerBatchApp({
  workerFactory = defaultWorkerFactory,
}: ImageResizerBatchAppProps) {
  const workerRef = useRef<Worker | null>(null);
  const mountedRef = useRef(true);
  const sequenceRef = useRef(0);
  const queueRef = useRef<QueueItem[]>([]);
  const pendingRequestsRef = useRef(new Map<string, PendingRequest>());
  const inspectionChainRef = useRef(Promise.resolve());
  const batchProcessingRef = useRef(false);
  const zipCreatingRef = useRef(false);
  const zipUrlRef = useRef<string | null>(null);
  const cropPredictionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const cropPredictionRequestsRef = useRef(new Map<string, string>());

  const [runtimeState, setRuntimeState] =
    useState<RuntimeState>("preparing");
  const [runtimeError, setRuntimeError] = useState("");
  const [initializationMs, setInitializationMs] = useState<number>();
  const [capabilities, setCapabilities] =
    useState<ImageResizerCapabilities>();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>();
  const [preset, setPreset] = useState("1600");
  const [customLongEdge, setCustomLongEdge] = useState("1200");
  const [neverEnlarge, setNeverEnlarge] = useState(true);
  const [outputFormat, setOutputFormat] =
    useState<ImageResizerOutputFormat>("original");
  const [quality, setQuality] = useState(85);
  const [creator, setCreator] = useState("");
  const [copyright, setCopyright] = useState("");
  const [stripMetadata, setStripMetadata] = useState(true);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchStatus, setBatchStatus] = useState("");
  const [zipState, setZipState] = useState<
    "idle" | "creating" | "ready" | "error"
  >("idle");
  const [zipError, setZipError] = useState("");
  const [zipUrl, setZipUrl] = useState("");

  const longEdge = Number(preset === "custom" ? customLongEdge : preset);
  const longEdgeIsValid = Number.isSafeInteger(longEdge) && longEdge > 0;
  const settingsRef = useRef({ longEdge, longEdgeIsValid, outputFormat });
  settingsRef.current = { longEdge, longEdgeIsValid, outputFormat };

  function nextId(prefix: string) {
    sequenceRef.current += 1;
    return `${prefix}-${sequenceRef.current}`;
  }

  function replaceQueue(nextQueue: QueueItem[]) {
    queueRef.current = nextQueue;
    if (mountedRef.current) setQueue(nextQueue);
  }

  function updateQueueItem(
    imageId: string,
    updater: (item: QueueItem) => QueueItem,
  ) {
    if (!queueRef.current.some((item) => item.id === imageId)) return;
    replaceQueue(
      queueRef.current.map((item) =>
        item.id === imageId ? updater(item) : item,
      ),
    );
  }

  function revokeResult(result?: ProcessedResult) {
    if (result) URL.revokeObjectURL(result.url);
  }

  function revokeZipUrl() {
    if (zipUrlRef.current) {
      URL.revokeObjectURL(zipUrlRef.current);
      zipUrlRef.current = null;
    }
    setZipUrl("");
    setZipState("idle");
    setZipError("");
  }

  function invalidateItemResult(item: QueueItem) {
    revokeResult(item.result);
    return {
      ...item,
      detailsExpanded: true,
      status:
        item.width && item.height && item.sourceFormat
          ? ("queued" as const)
          : item.status,
      error: undefined,
      result: undefined,
    };
  }

  function invalidateAllResults(
    transform: (item: QueueItem) => QueueItem = (item) => item,
  ) {
    replaceQueue(
      queueRef.current.map((item) => transform(invalidateItemResult(item))),
    );
    revokeZipUrl();
  }

  function sendWorkerRequest(
    request: ImageResizerWorkerRequest,
    transfer: Transferable[] = [],
  ) {
    return new Promise<ImageResizerWorkerResponse>((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) {
        reject(new Error(WORKER_FAILURE_MESSAGE));
        return;
      }
      pendingRequestsRef.current.set(request.requestId, { resolve, reject });
      try {
        worker.postMessage(request, transfer);
      } catch (error) {
        pendingRequestsRef.current.delete(request.requestId);
        reject(
          error instanceof Error
            ? error
            : new Error("The image worker request failed."),
        );
      }
    });
  }

  async function initializeRuntime() {
    setRuntimeState("preparing");
    setRuntimeError("");
    try {
      await sendWorkerRequest({
        type: "initialize",
        requestId: nextId("initialize"),
      });
    } catch {
      if (mountedRef.current) {
        setRuntimeState("error");
        setRuntimeError(
          workerRef.current
            ? "The browser image worker could not be started."
            : WORKER_FAILURE_MESSAGE,
        );
      }
    }
  }

  async function inspectQueueItem(item: QueueItem) {
    if (!queueRef.current.some((queuedItem) => queuedItem.id === item.id)) {
      return;
    }
    updateQueueItem(item.id, (current) => ({
      ...current,
      status: "inspecting",
      error: undefined,
    }));

    try {
      const bytes = await item.file.arrayBuffer();
      if (!queueRef.current.some((queuedItem) => queuedItem.id === item.id)) {
        return;
      }
      const response = await sendWorkerRequest(
        {
          type: "select-image",
          requestId: nextId("select"),
          imageId: item.id,
          fileName: item.file.name,
          bytes,
        },
        [bytes],
      );
      if (response.type === "image-selected" && response.imageId === item.id) {
        const latestSettings = settingsRef.current;
        const initialCrop = resetCropPreview(response.width, response.height, {
          width: response.width,
          height: response.height,
        });
        updateQueueItem(item.id, (current) => ({
          ...current,
          sourceFormat: response.sourceFormat,
          width: response.width,
          height: response.height,
          outputFilename: current.outputFilenameEdited
            ? current.outputFilename
            : defaultOutputFilename(
                current.file.name,
                latestSettings.longEdgeIsValid
                  ? latestSettings.longEdge
                  : 1600,
                latestSettings.outputFormat,
                response.sourceFormat,
              ),
          status: "queued",
          cropRect: current.cropRect ?? initialCrop.rect,
          cropZoom: current.cropRect ? current.cropZoom : initialCrop.zoom,
          error: undefined,
        }));
        setSelectedPreviewId((current) => current ?? item.id);
      } else if (response.type === "error") {
        updateQueueItem(item.id, (current) => ({
          ...current,
          status: "failed",
          detailsExpanded: true,
          error: response.message,
        }));
      }
    } catch {
      updateQueueItem(item.id, (current) => ({
        ...current,
        status: "failed",
        detailsExpanded: true,
        error:
          "This file could not be read. It may be damaged or exceed available browser memory.",
      }));
    }
  }

  function queueInspection(item: QueueItem) {
    inspectionChainRef.current = inspectionChainRef.current
      .catch(() => undefined)
      .then(() => inspectQueueItem(item));
  }

  function addFiles(files: File[]) {
    if (
      batchProcessingRef.current ||
      zipCreatingRef.current ||
      files.length === 0
    ) return;
    const currentLongEdge = longEdgeIsValid ? longEdge : 1600;
    const items = files.map<QueueItem>((file) => {
      const sourceFormat = sourceFormatFromFile(file);
      const supported = fileLooksSupported(file);
      return {
        id: nextId("image"),
        file,
        sourceFormat,
        status: supported ? "inspecting" : "failed",
        detailsExpanded: true,
        outputFilename: defaultOutputFilename(
          file.name,
          currentLongEdge,
          outputFormat,
          sourceFormat,
        ),
        outputFilenameEdited: false,
        title: titleFromFilename(file.name),
        altText: "",
        cropEnabled: false,
        cropRatio: "original",
        cropCustomWidth: "1",
        cropCustomHeight: "1",
        cropZoom: 1,
        error: supported
          ? undefined
          : "Choose a JPEG, PNG or WebP image.",
      };
    });
    replaceQueue([...queueRef.current, ...items]);
    items
      .filter((item) => item.status === "inspecting")
      .forEach(queueInspection);
  }

  useEffect(() => {
    mountedRef.current = true;
    const worker = workerFactory();
    const pendingRequests = pendingRequestsRef.current;
    const cropPredictionRequests = cropPredictionRequestsRef.current;
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (!isImageResizerWorkerResponse(event.data)) return;
      const message = event.data;
      if (message.type === "initializing") return;
      const pending = pendingRequests.get(message.requestId);
      if (!pending) return;
      pendingRequests.delete(message.requestId);
      if (message.type === "ready") {
        setCreator(readLocalDefault(CREATOR_STORAGE_KEY));
        setCopyright(readLocalDefault(COPYRIGHT_STORAGE_KEY));
        setCapabilities(message.capabilities);
        setInitializationMs(message.initializationMs);
        setRuntimeState("ready");
        setRuntimeError("");
      } else if (
        message.type === "error" &&
        message.stage === "initialization"
      ) {
        setRuntimeState("error");
        setRuntimeError(message.message);
      }
      pending.resolve(message);
    };

    const handleWorkerError = () => {
      const error = new Error(WORKER_FAILURE_MESSAGE);
      const wasProcessingBatch = batchProcessingRef.current;
      const wasCreatingZip = zipCreatingRef.current;
      pendingRequests.forEach((pending) => pending.reject(error));
      pendingRequests.clear();
      if (workerRef.current === worker) {
        worker.terminate();
        workerRef.current = null;
      }
      batchProcessingRef.current = false;
      zipCreatingRef.current = false;
      setBatchProcessing(false);
      if (wasProcessingBatch) {
        replaceQueue(
          queueRef.current.map((item) =>
            item.status === "processing"
              ? {
                  ...item,
                  status: "failed",
                  detailsExpanded: true,
                  error: WORKER_FAILURE_MESSAGE,
                }
              : item,
          ),
        );
        setBatchStatus("Batch processing stopped. Reload the page to try again.");
      }
      if (wasCreatingZip) {
        setZipState("error");
        setZipError(WORKER_FAILURE_MESSAGE);
      }
      setRuntimeState("error");
      setRuntimeError(WORKER_FAILURE_MESSAGE);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleWorkerError);
    void initializeRuntime();

    return () => {
      mountedRef.current = false;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleWorkerError);
      pendingRequests.forEach((pending) =>
        pending.reject(new Error("The image resizer was closed.")),
      );
      pendingRequests.clear();
      if (cropPredictionTimerRef.current) {
        clearTimeout(cropPredictionTimerRef.current);
      }
      cropPredictionRequests.clear();
      queueRef.current.forEach((item) => revokeResult(item.result));
      if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
      if (workerRef.current === worker) {
        worker.terminate();
        workerRef.current = null;
      }
    };
    // The worker factory is intentionally fixed for this page session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function removeItem(imageId: string) {
    if (batchProcessingRef.current || zipCreatingRef.current) return;
    const item = queueRef.current.find((candidate) => candidate.id === imageId);
    if (cropPredictionTimerRef.current) {
      clearTimeout(cropPredictionTimerRef.current);
      cropPredictionTimerRef.current = null;
    }
    cropPredictionRequestsRef.current.delete(imageId);
    revokeResult(item?.result);
    const remaining = queueRef.current.filter(
      (candidate) => candidate.id !== imageId,
    );
    replaceQueue(remaining);
    setSelectedPreviewId((current) =>
      current === imageId
        ? remaining.find(
            (candidate) =>
              candidate.width && candidate.height && candidate.sourceFormat,
          )?.id
        : current,
    );
    revokeZipUrl();
  }

  function clearBatch() {
    if (batchProcessingRef.current || zipCreatingRef.current) return;
    queueRef.current.forEach((item) => revokeResult(item.result));
    if (cropPredictionTimerRef.current) {
      clearTimeout(cropPredictionTimerRef.current);
      cropPredictionTimerRef.current = null;
    }
    cropPredictionRequestsRef.current.clear();
    replaceQueue([]);
    setSelectedPreviewId(undefined);
    setBatchStatus("");
    revokeZipUrl();
  }

  function retryItem(item: QueueItem) {
    if (batchProcessingRef.current || zipCreatingRef.current) return;
    if (item.width && item.height && item.sourceFormat) {
      updateQueueItem(item.id, (current) => ({
        ...current,
        detailsExpanded: true,
        status: "queued",
        error: undefined,
      }));
    } else {
      queueInspection(item);
    }
  }

  function updateDefaultFilenames(
    nextOutputFormat: ImageResizerOutputFormat,
    nextLongEdge: number,
  ) {
    invalidateAllResults((item) => ({
      ...item,
      outputFilename:
        !item.outputFilenameEdited && item.sourceFormat
          ? defaultOutputFilename(
              item.file.name,
              nextLongEdge,
              nextOutputFormat,
              item.sourceFormat,
            )
          : item.outputFilename,
    }));
  }

  function handlePresetChange(value: string) {
    setPreset(value);
    const nextLongEdge = Number(value === "custom" ? customLongEdge : value);
    if (Number.isSafeInteger(nextLongEdge) && nextLongEdge > 0) {
      updateDefaultFilenames(outputFormat, nextLongEdge);
    } else {
      invalidateAllResults();
    }
    const selected = queueRef.current.find(
      (item) => item.id === selectedPreviewId,
    );
    if (selected) scheduleCropPrediction(selected, nextLongEdge);
  }

  function handleCustomLongEdgeChange(value: string) {
    setCustomLongEdge(value);
    const nextLongEdge = Number(value);
    if (Number.isSafeInteger(nextLongEdge) && nextLongEdge > 0) {
      updateDefaultFilenames(outputFormat, nextLongEdge);
    } else {
      invalidateAllResults();
    }
    const selected = queueRef.current.find(
      (item) => item.id === selectedPreviewId,
    );
    if (selected) scheduleCropPrediction(selected, nextLongEdge);
  }

  function handleNeverEnlargeChange(value: boolean) {
    setNeverEnlarge(value);
    invalidateAllResults();
    const selected = queueRef.current.find(
      (item) => item.id === selectedPreviewId,
    );
    if (selected) scheduleCropPrediction(selected, longEdge, value);
  }

  function handleOutputFormatChange(value: ImageResizerOutputFormat) {
    setOutputFormat(value);
    updateDefaultFilenames(value, longEdgeIsValid ? longEdge : 1600);
  }

  function updateMetadataDefault(
    type: "creator" | "copyright",
    value: string,
  ) {
    if (type === "creator") {
      setCreator(value);
      writeLocalDefault(CREATOR_STORAGE_KEY, value);
    } else {
      setCopyright(value);
      writeLocalDefault(COPYRIGHT_STORAGE_KEY, value);
    }
    invalidateAllResults();
  }

  function editQueueItem(
    imageId: string,
    field: "outputFilename" | "title" | "altText",
    value: string,
  ) {
    updateQueueItem(imageId, (item) => {
      const next = field === "altText" ? item : invalidateItemResult(item);
      return {
        ...next,
        [field]: value,
        ...(field === "outputFilename"
          ? { outputFilenameEdited: true }
          : {}),
        ...(field === "altText" ? { copyStatus: undefined } : {}),
      };
    });
    if (field !== "altText") revokeZipUrl();
  }

  function repairOutputFilename(item: QueueItem) {
    if (!item.sourceFormat) return;
    updateQueueItem(item.id, (current) => ({
      ...current,
      outputFilename: normaliseOutputFilename(
        current.outputFilename,
        outputFormat,
        current.sourceFormat!,
        current.file.name,
        longEdgeIsValid ? longEdge : 1600,
      ),
    }));
  }

  function toggleItemDetails(item: QueueItem) {
    updateQueueItem(item.id, (current) => ({
      ...current,
      detailsExpanded: !current.detailsExpanded,
    }));
  }

  function cropAspect(item: QueueItem, ratio = item.cropRatio) {
    if (!item.width || !item.height) return null;
    return cropAspectForRatio(
      ratio,
      item.width,
      item.height,
      item.cropCustomWidth,
      item.cropCustomHeight,
    );
  }

  function cropRectsMatch(left?: CropRect, right?: CropRect) {
    if (!left || !right) return left === right;
    return (
      Math.abs(left.x - right.x) < 1e-12 &&
      Math.abs(left.y - right.y) < 1e-12 &&
      Math.abs(left.width - right.width) < 1e-12 &&
      Math.abs(left.height - right.height) < 1e-12
    );
  }

  function scheduleCropPrediction(
    item: QueueItem,
    predictionLongEdge = longEdge,
    predictionNeverEnlarge = neverEnlarge,
  ) {
    if (cropPredictionTimerRef.current) {
      clearTimeout(cropPredictionTimerRef.current);
    }
    if (
      !item.cropEnabled ||
      !item.cropRect ||
      !item.width ||
      !item.height ||
      !Number.isSafeInteger(predictionLongEdge) ||
      predictionLongEdge <= 0 ||
      !workerRef.current
    ) {
      return;
    }

    cropPredictionTimerRef.current = setTimeout(async () => {
      const requestId = nextId("predict");
      cropPredictionRequestsRef.current.set(item.id, requestId);
      try {
        const response = await sendWorkerRequest({
          type: "predict-crop",
          requestId,
          imageId: item.id,
          sourceWidth: item.width!,
          sourceHeight: item.height!,
          longEdge: predictionLongEdge,
          neverEnlarge: predictionNeverEnlarge,
          crop: item.cropRect!,
        });
        if (cropPredictionRequestsRef.current.get(item.id) !== requestId) {
          return;
        }
        if (response.type === "crop-predicted") {
          updateQueueItem(item.id, (current) => ({
            ...current,
            cropPrediction: {
              cropWidth: response.cropWidth,
              cropHeight: response.cropHeight,
              outputWidth: response.outputWidth,
              outputHeight: response.outputHeight,
            },
            cropPredictionError: undefined,
          }));
        } else if (response.type === "error") {
          updateQueueItem(item.id, (current) => ({
            ...current,
            cropPrediction: undefined,
            cropPredictionError: response.message,
          }));
        }
      } catch (error) {
        if (cropPredictionRequestsRef.current.get(item.id) === requestId) {
          updateQueueItem(item.id, (current) => ({
            ...current,
            cropPrediction: undefined,
            cropPredictionError:
              error instanceof Error
                ? error.message
                : "Crop dimensions could not be predicted.",
          }));
        }
      }
    }, 180);
  }

  function commitCropChange(
    imageId: string,
    transform: (item: QueueItem) => QueueItem,
  ) {
    const current = queueRef.current.find((item) => item.id === imageId);
    if (!current) return;
    const transformed = transform(current);
    if (
      transformed.cropEnabled === current.cropEnabled &&
      transformed.cropRatio === current.cropRatio &&
      transformed.cropZoom === current.cropZoom &&
      cropRectsMatch(transformed.cropRect, current.cropRect)
    ) {
      return;
    }
    const next = invalidateItemResult({
      ...transformed,
      cropPrediction: undefined,
      cropPredictionError: undefined,
    });
    replaceQueue(
      queueRef.current.map((item) => (item.id === imageId ? next : item)),
    );
    revokeZipUrl();
    scheduleCropPrediction(next);
  }

  function setCropMode(enabled: boolean) {
    if (!selectedPreviewId) return;
    commitCropChange(selectedPreviewId, (item) => ({
      ...item,
      cropEnabled: enabled,
    }));
  }

  function setCropRatio(ratio: CropRatio) {
    if (!selectedPreviewId) return;
    commitCropChange(selectedPreviewId, (item) => {
      const aspect = cropAspect(item, ratio);
      if (!aspect || !item.width || !item.height) return item;
      const reset = resetCropPreview(item.width, item.height, aspect);
      return {
        ...item,
        cropRatio: ratio,
        cropRect: reset.rect,
        cropZoom: reset.zoom,
      };
    });
  }

  function setCustomCropRatio(dimension: "width" | "height", value: string) {
    if (!selectedPreviewId) return;
    const current = queueRef.current.find(
      (item) => item.id === selectedPreviewId,
    );
    if (!current) return;
    const nextValues = {
      width: dimension === "width" ? value : current.cropCustomWidth,
      height: dimension === "height" ? value : current.cropCustomHeight,
    };
    const aspect = parseCustomCropAspect(nextValues.width, nextValues.height);
    if (!aspect || !current.width || !current.height) {
      updateQueueItem(current.id, (item) => ({
        ...item,
        cropCustomWidth: nextValues.width,
        cropCustomHeight: nextValues.height,
        cropPrediction: undefined,
        cropPredictionError: undefined,
      }));
      return;
    }
    commitCropChange(current.id, (item) => {
      const reset = resetCropPreview(item.width!, item.height!, aspect);
      return {
        ...item,
        cropCustomWidth: nextValues.width,
        cropCustomHeight: nextValues.height,
        cropRect: reset.rect,
        cropZoom: reset.zoom,
      };
    });
  }

  function setCropRect(rect: CropRect) {
    if (!selectedPreviewId) return;
    commitCropChange(selectedPreviewId, (item) => {
      const aspect = cropAspect(item);
      if (!aspect || !item.width || !item.height) return item;
      const baseRect = resetCropPreview(item.width, item.height, aspect).rect;
      return {
        ...item,
        cropRect: rect,
        cropZoom: zoomForCropRect(baseRect, rect),
      };
    });
  }

  function setCropZoom(zoom: number) {
    if (!selectedPreviewId) return;
    commitCropChange(selectedPreviewId, (item) => {
      const aspect = cropAspect(item);
      if (!aspect || !item.width || !item.height || !item.cropRect) return item;
      const baseRect = resetCropPreview(item.width, item.height, aspect).rect;
      const cropRect = cropRectForZoom(
        baseRect,
        zoom,
        item.cropRect.x + item.cropRect.width / 2,
        item.cropRect.y + item.cropRect.height / 2,
      );
      return {
        ...item,
        cropRect,
        cropZoom: zoomForCropRect(baseRect, cropRect),
      };
    });
  }

  function resetSelectedCrop() {
    if (!selectedPreviewId) return;
    commitCropChange(selectedPreviewId, (item) => {
      const aspect = cropAspect(item);
      if (!aspect || !item.width || !item.height) return item;
      const reset = resetCropPreview(item.width, item.height, aspect);
      return { ...item, cropRect: reset.rect, cropZoom: reset.zoom };
    });
  }

  function applySelectedRatioToAll() {
    const selected = queueRef.current.find(
      (item) => item.id === selectedPreviewId,
    );
    if (!selected) return;
    const customAspect = parseCustomCropAspect(
      selected.cropCustomWidth,
      selected.cropCustomHeight,
    );
    if (selected.cropRatio === "custom" && !customAspect) return;

    const nextQueue = queueRef.current.map((item) => {
      if (!item.width || !item.height || !item.sourceFormat) return item;
      const aspect = cropAspectForRatio(
        selected.cropRatio,
        item.width,
        item.height,
        selected.cropCustomWidth,
        selected.cropCustomHeight,
      );
      if (!aspect) return item;
      const reset = resetCropPreview(item.width, item.height, aspect);
      if (
        item.cropRatio === selected.cropRatio &&
        item.cropCustomWidth === selected.cropCustomWidth &&
        item.cropCustomHeight === selected.cropCustomHeight &&
        item.cropZoom === reset.zoom &&
        cropRectsMatch(item.cropRect, reset.rect)
      ) {
        return item;
      }
      return invalidateItemResult({
        ...item,
        cropRatio: selected.cropRatio,
        cropCustomWidth: selected.cropCustomWidth,
        cropCustomHeight: selected.cropCustomHeight,
        cropRect: reset.rect,
        cropZoom: reset.zoom,
        cropPrediction: undefined,
        cropPredictionError: undefined,
      });
    });
    replaceQueue(nextQueue);
    revokeZipUrl();
    const nextSelected = nextQueue.find((item) => item.id === selected.id);
    if (nextSelected) scheduleCropPrediction(nextSelected);
  }

  function selectPreviewImage(imageId: string) {
    const item = queueRef.current.find(
      (candidate) => candidate.id === imageId,
    );
    if (!item?.width || !item.height || !item.sourceFormat) return;
    setSelectedPreviewId(imageId);
    scheduleCropPrediction(item);
  }

  function navigatePreview(direction: -1 | 1) {
    const readable = queueRef.current.filter(
      (item) => item.width && item.height && item.sourceFormat,
    );
    const currentIndex = readable.findIndex(
      (item) => item.id === selectedPreviewId,
    );
    const next = readable[currentIndex + direction];
    if (next) selectPreviewImage(next.id);
  }

  async function processBatch() {
    if (
      batchProcessingRef.current ||
      zipCreatingRef.current ||
      runtimeState !== "ready" ||
      !longEdgeIsValid
    ) {
      return;
    }
    const candidates = queueRef.current.filter(
      (item) =>
        item.status !== "complete" &&
        item.width &&
        item.height &&
        item.sourceFormat,
    );
    if (candidates.length === 0) {
      setBatchStatus("No readable images are ready to process.");
      return;
    }

    batchProcessingRef.current = true;
    setBatchProcessing(true);
    revokeZipUrl();

    const normalisedNames = candidates.map((item) =>
      normaliseOutputFilename(
        item.outputFilename,
        outputFormat,
        item.sourceFormat!,
        item.file.name,
        longEdge,
      ),
    );
    const uniqueNames = uniqueOutputFilenames(normalisedNames);
    const namesById = new Map(
      candidates.map((item, index) => [item.id, uniqueNames[index]]),
    );
    replaceQueue(
      queueRef.current.map((item) => ({
        ...item,
        outputFilename: namesById.get(item.id) ?? item.outputFilename,
      })),
    );

    let completed = 0;
    let failed = queueRef.current.filter(
      (item) =>
        item.status === "failed" &&
        !candidates.some((candidate) => candidate.id === item.id),
    ).length;
    for (const [index, candidate] of candidates.entries()) {
      const current = queueRef.current.find((item) => item.id === candidate.id);
      if (!current || !current.sourceFormat) continue;

      revokeResult(current.result);
      updateQueueItem(current.id, (item) => ({
        ...item,
        status: "processing",
        error: undefined,
        result: undefined,
      }));
      setBatchStatus(`Processing ${index + 1} of ${candidates.length}`);

      try {
        const sourceBytes = await current.file.arrayBuffer();
        const selectionResponse = await sendWorkerRequest(
          {
            type: "select-image",
            requestId: nextId("select"),
            imageId: current.id,
            fileName: current.file.name,
            bytes: sourceBytes,
          },
          [sourceBytes],
        );
        if (
          selectionResponse.type !== "image-selected" ||
          selectionResponse.imageId !== current.id
        ) {
          throw new Error(
            selectionResponse.type === "error"
              ? selectionResponse.message
              : "The image could not be prepared for processing.",
          );
        }

        const processingResponse = await sendWorkerRequest({
          type: "process-image",
          requestId: nextId("process"),
          imageId: current.id,
          longEdge,
          neverEnlarge,
          outputFormat,
          quality,
          outputFilename: namesById.get(current.id)!,
          title: current.title,
          altText: current.altText,
          creator,
          copyright,
          stripMetadata,
          ...(current.cropEnabled && current.cropRect
            ? { crop: current.cropRect }
            : {}),
        });
        if (
          processingResponse.type !== "processed" ||
          processingResponse.imageId !== current.id
        ) {
          throw new Error(
            processingResponse.type === "error"
              ? processingResponse.message
              : "The image could not be resized.",
          );
        }

        const blob = new Blob([processingResponse.bytes], {
          type: outputMimeType(processingResponse.outputFormat),
        });
        const url = URL.createObjectURL(blob);
        updateQueueItem(current.id, (item) => ({
          ...item,
          status: "complete",
          detailsExpanded: false,
          outputFilename: processingResponse.suggestedFilename,
          error: undefined,
          result: {
            blob,
            url,
            originalWidth: processingResponse.originalWidth,
            originalHeight: processingResponse.originalHeight,
            width: processingResponse.width,
            height: processingResponse.height,
            outputFormat: processingResponse.outputFormat,
            processingMs: processingResponse.processingMs,
          },
        }));
        completed += 1;
      } catch (error) {
        updateQueueItem(current.id, (item) => ({
          ...item,
          status: "failed",
          detailsExpanded: true,
          error:
            error instanceof Error
              ? error.message
              : "The image could not be resized.",
        }));
        failed += 1;
        if (!workerRef.current) break;
      }
    }

    batchProcessingRef.current = false;
    if (mountedRef.current) {
      setBatchProcessing(false);
      setBatchStatus(
        failed > 0
          ? `${completed} complete, ${failed} failed. Failed images can be retried.`
          : `${completed} image${completed === 1 ? "" : "s"} complete.`,
      );
    }
  }

  async function createZipDownload() {
    if (batchProcessingRef.current || zipCreatingRef.current) return;
    const completed = queueRef.current.filter((item) => item.result);
    if (completed.length === 0) return;

    zipCreatingRef.current = true;
    setZipState("creating");
    setZipError("");
    if (zipUrlRef.current) {
      URL.revokeObjectURL(zipUrlRef.current);
      zipUrlRef.current = null;
    }

    try {
      const entries: Extract<
        ImageResizerWorkerRequest,
        { type: "create-zip" }
      >["entries"] = [];
      for (const item of completed) {
        entries.push({
          fileName: item.outputFilename,
          bytes: await item.result!.blob.arrayBuffer(),
        });
      }
      const response = await sendWorkerRequest(
        { type: "create-zip", requestId: nextId("zip"), entries },
        entries.map((entry) => entry.bytes),
      );
      if (response.type !== "zip-created") {
        throw new Error(
          response.type === "error"
            ? response.message
            : "The download archive could not be created.",
        );
      }

      const blob = new Blob([response.bytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      zipUrlRef.current = url;
      setZipUrl(url);
      setZipState("ready");
      const download = document.createElement("a");
      download.href = url;
      download.download = "blackburn-studio-resized-images.zip";
      download.click();
    } catch (error) {
      setZipState("error");
      setZipError(
        error instanceof Error
          ? error.message
          : "The download archive could not be created.",
      );
    } finally {
      zipCreatingRef.current = false;
    }
  }

  async function copyAltText(item: QueueItem) {
    try {
      await navigator.clipboard.writeText(item.altText);
      updateQueueItem(item.id, (current) => ({
        ...current,
        copyStatus: "Alt text copied.",
      }));
    } catch {
      updateQueueItem(item.id, (current) => ({
        ...current,
        copyStatus: "Alt text could not be copied.",
      }));
    }
  }

  const previewItems = queue.filter(
    (item) => item.width && item.height && item.sourceFormat && item.cropRect,
  );
  const selectedPreviewItem = previewItems.find(
    (item) => item.id === selectedPreviewId,
  );
  const cropEditorItem: CropEditorItem | undefined = selectedPreviewItem
    ? {
        id: selectedPreviewItem.id,
        file: selectedPreviewItem.file,
        width: selectedPreviewItem.width!,
        height: selectedPreviewItem.height!,
        cropEnabled: selectedPreviewItem.cropEnabled,
        cropRatio: selectedPreviewItem.cropRatio,
        cropCustomWidth: selectedPreviewItem.cropCustomWidth,
        cropCustomHeight: selectedPreviewItem.cropCustomHeight,
        cropRect: selectedPreviewItem.cropRect!,
        cropZoom: selectedPreviewItem.cropZoom,
        cropPrediction: selectedPreviewItem.cropPrediction,
        cropPredictionError: selectedPreviewItem.cropPredictionError,
        cropPreviewError: selectedPreviewItem.cropPreviewError,
      }
    : undefined;
  const previewPosition = selectedPreviewItem
    ? previewItems.findIndex((item) => item.id === selectedPreviewItem.id) + 1
    : 0;
  const completedCount = queue.filter((item) => item.result).length;
  const completedSize = queue.reduce(
    (total, item) => total + (item.result?.blob.size ?? 0),
    0,
  );
  const inspecting = queue.some((item) => item.status === "inspecting");
  const processableCount = queue.filter(
    (item) =>
      item.status !== "complete" &&
      item.width &&
      item.height &&
      item.sourceFormat,
  ).length;
  const hasInvalidCrop = queue.some(
    (item) =>
      item.cropEnabled &&
      ((item.cropRatio === "custom" &&
        !parseCustomCropAspect(item.cropCustomWidth, item.cropCustomHeight)) ||
        Boolean(item.cropPreviewError)),
  );
  const showQuality = outputFormat !== "PNG";
  const isLargeBatch = queue.some(
    (item) => item.width && item.height && item.width * item.height > 24_000_000,
  );
  const controlsLocked = batchProcessing || zipState === "creating";
  const canProcess =
    runtimeState === "ready" &&
    processableCount > 0 &&
    !inspecting &&
    !controlsLocked &&
    longEdgeIsValid &&
    !hasInvalidCrop &&
    (outputFormat !== "WebP" || capabilities?.WebP === true);

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
        <p className="mt-7 max-w-[70ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
          Prepare a batch of JPEG, PNG or WebP images with the same shared
          processing engine used by the Windows application. Your images and
          metadata stay in this browser.
        </p>
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-start">
        <div className="space-y-8">
          <section aria-labelledby="select-images-heading" className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-studio-dim">Step 1</p>
                <h2 id="select-images-heading" className="mt-2 text-2xl font-medium tracking-tight text-studio-text">Build your batch</h2>
              </div>
              {queue.length > 0 ? (
                <button type="button" onClick={clearBatch} disabled={controlsLocked} className="min-h-11 text-left text-sm text-studio-muted underline decoration-studio-border underline-offset-4 disabled:opacity-45">Clear batch</button>
              ) : null}
            </div>
            <div aria-label="Add images by dropping files" className="mt-6 rounded-xl border border-dashed border-studio-border bg-studio-surface-soft/45 px-5 py-8 text-center" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
              <label htmlFor="image-resizer-files" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[11px] border border-studio-border px-5 py-2.5 text-sm font-medium text-studio-text transition hover:border-white/35 focus-within:ring-2 focus-within:ring-white/70">
                {queue.length > 0 ? "Add more images" : "Select images"}
                <input id="image-resizer-files" type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={handleFileInput} disabled={controlsLocked} />
              </label>
              <p className="mt-3 text-sm text-studio-dim">or drop JPEG, PNG and WebP files here</p>
            </div>
            {isLargeBatch ? <p role="status" className="mt-4 rounded-lg border border-amber-200/20 bg-amber-100/5 px-4 py-3 text-sm leading-relaxed text-amber-100/85">This batch contains a large image. Processing is sequential to reduce memory pressure, but a phone or tablet may still run low on memory.</p> : null}
          </section>

          <section aria-labelledby="batch-settings-heading" className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-studio-dim">Step 2</p>
            <h2 id="batch-settings-heading" className="mt-2 text-2xl font-medium tracking-tight text-studio-text">Batch settings</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="image-resizer-preset" className="text-sm font-medium text-studio-text">Preset</label>
                <select id="image-resizer-preset" value={preset} onChange={(event) => handlePresetChange(event.target.value)} disabled={controlsLocked} className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55">
                  {PRESETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  <option value="custom">Custom long edge</option>
                </select>
              </div>
              {preset === "custom" ? (
                <div>
                  <label htmlFor="image-resizer-custom-edge" className="text-sm font-medium text-studio-text">Custom long edge (px)</label>
                  <input id="image-resizer-custom-edge" type="number" min="1" step="1" inputMode="numeric" value={customLongEdge} onChange={(event) => handleCustomLongEdgeChange(event.target.value)} aria-invalid={!longEdgeIsValid} disabled={controlsLocked} className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55" />
                  {!longEdgeIsValid ? <p className="mt-2 text-xs text-red-300">Enter a positive whole number.</p> : null}
                </div>
              ) : null}
              <div>
                <label htmlFor="image-resizer-format" className="text-sm font-medium text-studio-text">Output format</label>
                <select id="image-resizer-format" value={outputFormat} onChange={(event) => handleOutputFormatChange(event.target.value as ImageResizerOutputFormat)} disabled={controlsLocked} className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55">
                  <option value="original">Keep each original format</option>
                  <option value="JPEG">JPEG</option>
                  <option value="PNG">PNG</option>
                  <option value="WebP" disabled={capabilities?.WebP === false}>WebP{capabilities?.WebP === false ? " — unavailable" : ""}</option>
                </select>
                {capabilities?.WebP === false ? <p className="mt-2 text-xs leading-relaxed text-studio-dim">WebP output is unavailable in the loaded browser runtime.</p> : null}
              </div>
              {showQuality ? (
                <div>
                  <label htmlFor="image-resizer-quality" className="flex justify-between gap-4 text-sm font-medium text-studio-text"><span>JPEG / WebP quality</span><span>{quality}</span></label>
                  <input id="image-resizer-quality" type="range" min="1" max="100" value={quality} aria-valuetext={`${quality} out of 100`} onChange={(event) => { setQuality(Number(event.target.value)); invalidateAllResults(); }} disabled={controlsLocked} className="mt-3 w-full accent-white disabled:opacity-55" />
                </div>
              ) : null}
            </div>
            <label className="mt-6 flex w-fit items-start gap-3 text-sm text-studio-muted">
              <input type="checkbox" checked={neverEnlarge} onChange={(event) => handleNeverEnlargeChange(event.target.checked)} disabled={controlsLocked} className="mt-0.5 h-4 w-4 accent-white" />
              <span><span className="font-medium text-studio-text">Never enlarge</span><span className="mt-1 block text-studio-dim">Keep smaller source images at their original dimensions.</span></span>
            </label>
            <ImageResizerCropEditor
              item={cropEditorItem}
              position={previewPosition}
              total={previewItems.length}
              disabled={controlsLocked}
              onModeChange={setCropMode}
              onRatioChange={setCropRatio}
              onCustomRatioChange={setCustomCropRatio}
              onZoomChange={setCropZoom}
              onRectChange={setCropRect}
              onReset={resetSelectedCrop}
              onApplyRatioToAll={applySelectedRatioToAll}
              onPrevious={() => navigatePreview(-1)}
              onNext={() => navigatePreview(1)}
              onPreviewError={(message) => {
                if (!selectedPreviewId) return;
                updateQueueItem(selectedPreviewId, (item) => ({
                  ...item,
                  cropPreviewError: message,
                }));
              }}
            />
          </section>

          <section aria-labelledby="metadata-heading" className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-studio-dim">Step 3</p>
            <h2 id="metadata-heading" className="mt-2 text-2xl font-medium tracking-tight text-studio-text">Metadata defaults</h2>
            <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-studio-muted">Set batch-level metadata defaults here, then adjust each image&apos;s details in the queue. Creator and copyright are saved only in this browser. Titles are embedded where supported. Alt text remains a companion field for your website—it does not replace HTML alt text and is not embedded as HTML in the image.</p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="image-resizer-creator" className="text-sm font-medium text-studio-text">Creator / Business</label>
                <input id="image-resizer-creator" value={creator} maxLength={2000} onChange={(event) => updateMetadataDefault("creator", event.target.value)} disabled={controlsLocked} className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55" />
              </div>
              <div>
                <label htmlFor="image-resizer-copyright" className="text-sm font-medium text-studio-text">Copyright</label>
                <input id="image-resizer-copyright" value={copyright} maxLength={2000} onChange={(event) => updateMetadataDefault("copyright", event.target.value)} disabled={controlsLocked} className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55" />
              </div>
            </div>
            <label className="mt-6 flex w-fit items-start gap-3 text-sm text-studio-muted">
              <input type="checkbox" checked={stripMetadata} onChange={(event) => { setStripMetadata(event.target.checked); invalidateAllResults(); }} disabled={controlsLocked} className="mt-0.5 h-4 w-4 accent-white" />
              <span><span className="font-medium text-studio-text">Strip existing metadata</span><span className="mt-1 block text-studio-dim">Remove source metadata before applying the supported title, creator and copyright fields.</span></span>
            </label>
            <p className="mt-5 rounded-lg border border-studio-border/70 bg-studio-surface-soft/45 px-4 py-3 text-xs leading-relaxed text-studio-dim">JPEG and WebP use supported EXIF fields. PNG writes supported Title, Author and Copyright text fields. When stripping is off, supported JPEG/WebP EXIF can be retained; arbitrary source PNG text is not carried across by the shared processor.</p>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28">
          <section aria-labelledby="runtime-status-heading" className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6">
            <h2 id="runtime-status-heading" className="text-sm font-medium text-studio-text">Browser runtime</h2>
            <div className="mt-4" role="status" aria-live="polite">
              {runtimeState === "preparing" ? <p className="text-sm text-studio-muted">Preparing image tools…</p> : runtimeState === "ready" ? (
                <div><p className="flex items-center gap-2 text-sm font-medium text-studio-text"><span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />Ready</p>{initializationMs !== undefined ? <p className="mt-2 text-xs text-studio-dim">Started in {(initializationMs / 1000).toFixed(1)} seconds</p> : null}</div>
              ) : (
                <div><p className="text-sm font-medium text-red-300">Unable to initialise image tools</p><p className="mt-2 text-sm leading-relaxed text-studio-dim">{runtimeError}</p><div className="mt-4"><StudioButton variant="secondary" onClick={() => void initializeRuntime()}>Try again</StudioButton></div></div>
              )}
            </div>
          </section>
          <section aria-labelledby="privacy-note-heading" className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6">
            <h2 id="privacy-note-heading" className="text-xl font-medium tracking-tight text-studio-text">Your images stay on your device</h2>
            <p className="mt-3 text-sm leading-relaxed text-studio-muted">Image bytes and metadata are sent only to a dedicated worker inside this page. Runtime assets are downloaded, but source files, results and metadata are not uploaded.</p>
          </section>
          <section aria-labelledby="batch-action-heading" className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6">
            <h2 id="batch-action-heading" className="text-xl font-medium tracking-tight text-studio-text">Process batch</h2>
            <p className="mt-3 text-sm text-studio-dim">{processableCount} readable image{processableCount === 1 ? "" : "s"} ready. Files are processed one at a time.</p>
            <div className="mt-5"><StudioButton type="button" variant="primary" disabled={!canProcess} onClick={() => void processBatch()} className="w-full disabled:cursor-not-allowed disabled:opacity-45">{batchProcessing ? "Processing batch…" : "Process batch"}</StudioButton></div>
            {batchStatus ? <p className="mt-4 text-sm leading-relaxed text-studio-muted" role="status" aria-live="polite">{batchStatus}</p> : null}
            {completedCount > 0 ? (
              <div className="mt-5 border-t border-studio-border/60 pt-5">
                <StudioButton type="button" variant="secondary" disabled={controlsLocked} onClick={() => void createZipDownload()} className="w-full disabled:cursor-not-allowed disabled:opacity-45">{zipState === "creating" ? "Creating ZIP…" : `Download all as ZIP (${completedCount})`}</StudioButton>
                {completedSize > 100 * 1024 * 1024 ? <p role="status" className="mt-3 text-xs leading-relaxed text-amber-100/85">This is a large download archive. ZIP creation temporarily needs additional browser memory; use individual downloads if your device is low on memory.</p> : null}
                {zipUrl ? <a href={zipUrl} download="blackburn-studio-resized-images.zip" className="mt-3 inline-block text-sm text-studio-text underline underline-offset-4">Download ZIP again</a> : null}
                {zipError ? <p role="alert" className="mt-3 text-sm text-red-300">{zipError}</p> : null}
              </div>
            ) : null}
          </section>
        </aside>
      </div>

      <section aria-labelledby="queue-heading" className="mt-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><SectionEyebrow>Batch queue</SectionEyebrow><h2 id="queue-heading" className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl">Images and output details</h2></div>
          <p className="text-sm text-studio-dim">{queue.length} file{queue.length === 1 ? "" : "s"}</p>
        </div>
        {queue.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-studio-border/70 bg-studio-surface/45 px-6 py-10 text-center text-sm text-studio-dim">Select images to build a batch.</div>
        ) : (
          <ol className="mt-8 space-y-5">
            {queue.map((item, index) => {
              const format = item.sourceFormat && effectiveOutputFormat(outputFormat, item.sourceFormat);
              return (
                <li key={item.id} className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-5 md:p-7">
                  <article aria-labelledby={`${item.id}-heading`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.18em] text-studio-dim">Image {index + 1}</p>
                        <h3 id={`${item.id}-heading`} className="mt-2 break-all text-lg font-medium text-studio-text">{item.file.name}</h3>
                        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-studio-dim">
                          <div><dt className="sr-only">Source format</dt><dd>{item.sourceFormat ?? "Reading format…"}</dd></div>
                          <div><dt className="sr-only">Original dimensions</dt><dd>{item.width && item.height ? `${item.width} × ${item.height} px` : "Dimensions unavailable"}</dd></div>
                          <div><dt className="sr-only">Original file size</dt><dd>{formatFileSize(item.file.size)}</dd></div>
                          {item.cropEnabled ? <div><dt className="sr-only">Crop setting</dt><dd>{cropRatioLabel(item.cropRatio, item.cropCustomWidth, item.cropCustomHeight)} crop</dd></div> : null}
                        </dl>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className={`rounded-full border px-3 py-1 text-xs ${item.status === "complete" ? "border-emerald-300/25 text-emerald-200" : item.status === "failed" ? "border-red-300/25 text-red-200" : "border-studio-border text-studio-muted"}`}>{statusLabel(item.status)}</span>
                        {item.width && item.height && item.sourceFormat ? <button type="button" onClick={() => selectPreviewImage(item.id)} disabled={controlsLocked} aria-pressed={selectedPreviewId === item.id} aria-label={`Edit crop for ${item.file.name}`} className="min-h-11 text-sm text-studio-text underline decoration-studio-border underline-offset-4 disabled:opacity-45">{selectedPreviewId === item.id ? "Crop selected" : "Edit crop"}</button> : null}
                        {item.status !== "failed" ? <button type="button" onClick={() => toggleItemDetails(item)} disabled={controlsLocked} aria-expanded={item.detailsExpanded} aria-controls={`${item.id}-details`} aria-label={`${item.detailsExpanded ? "Hide details for" : "Edit details for"} ${item.file.name}`} className="min-h-11 text-sm text-studio-text underline decoration-studio-border underline-offset-4 disabled:opacity-45">{item.detailsExpanded ? "Hide details" : "Edit details"}</button> : null}
                        <button type="button" onClick={() => removeItem(item.id)} disabled={controlsLocked} aria-label={`Remove ${item.file.name}`} className="min-h-11 text-sm text-studio-muted underline decoration-studio-border underline-offset-4 disabled:opacity-45">Remove</button>
                      </div>
                    </div>
                    {item.error ? <div className="mt-4"><p role="alert" className="text-sm text-red-300">{item.error}</p><button type="button" onClick={() => retryItem(item)} disabled={controlsLocked} className="mt-3 min-h-11 text-sm text-studio-text underline underline-offset-4 disabled:opacity-45">Retry this image</button></div> : null}
                    {item.detailsExpanded ? (
                      <div id={`${item.id}-details`} className="mt-6 grid gap-5 border-t border-studio-border/60 pt-6 md:grid-cols-3">
                        <div>
                          <label htmlFor={`${item.id}-filename`} className="text-sm font-medium text-studio-text">Output filename</label>
                          <input id={`${item.id}-filename`} value={item.outputFilename} maxLength={255} onChange={(event) => editQueueItem(item.id, "outputFilename", event.target.value)} onBlur={() => repairOutputFilename(item)} disabled={controlsLocked} aria-invalid={!item.outputFilename.trim()} className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55" />
                        </div>
                        <div>
                          <label htmlFor={`${item.id}-title`} className="text-sm font-medium text-studio-text">Title</label>
                          <input id={`${item.id}-title`} value={item.title} maxLength={2000} onChange={(event) => editQueueItem(item.id, "title", event.target.value)} disabled={controlsLocked} className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55" />
                        </div>
                        <div>
                          <label htmlFor={`${item.id}-alt`} className="text-sm font-medium text-studio-text">Alt text for website</label>
                          <div className="mt-2 flex gap-2">
                            <input id={`${item.id}-alt`} value={item.altText} maxLength={2000} onChange={(event) => editQueueItem(item.id, "altText", event.target.value)} disabled={controlsLocked} className="min-h-11 min-w-0 flex-1 rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55" />
                            <button type="button" onClick={() => void copyAltText(item)} disabled={!item.altText || controlsLocked} className="min-h-11 rounded-lg border border-studio-border px-3 text-sm text-studio-text disabled:opacity-45">Copy</button>
                          </div>
                          {item.copyStatus ? <p className="mt-2 text-xs text-studio-dim" role="status">{item.copyStatus}</p> : null}
                        </div>
                      </div>
                    ) : null}
                    {item.result ? (
                      <div className="mt-6 flex flex-col gap-5 rounded-xl border border-studio-border/60 bg-studio-surface-soft/35 p-4 sm:flex-row sm:items-end sm:justify-between">
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                          <div><dt className="text-studio-dim">Output</dt><dd className="mt-1 text-studio-text">{item.result.width} × {item.result.height} px</dd></div>
                          <div><dt className="text-studio-dim">Output size</dt><dd className="mt-1 text-studio-text">{formatFileSize(item.result.blob.size)}</dd></div>
                          <div><dt className="text-studio-dim">Format</dt><dd className="mt-1 text-studio-text">{item.result.outputFormat}</dd></div>
                          <div><dt className="text-studio-dim">Time</dt><dd className="mt-1 text-studio-text">{(item.result.processingMs / 1000).toFixed(1)} s</dd></div>
                        </dl>
                        <a href={item.result.url} download={item.outputFilename} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[11px] bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base">Download</a>
                      </div>
                    ) : format && item.width && item.height ? (
                      <p className="mt-5 text-xs text-studio-dim">Output format: {format}. Completed dimensions will come from the shared Python processor.</p>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
