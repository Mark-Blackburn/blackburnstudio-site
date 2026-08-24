/// <reference lib="webworker" />

import {
  getPyodideRuntimeUrls,
  getSafeImageResizerBrowserRuntimeUrl,
  IMAGE_RESIZER_BROWSER_MANIFEST_URL,
  parseImageResizerBrowserManifest,
  type ImageResizerBrowserManifest,
} from "@/lib/imageResizerRuntime";

import {
  isCreateZipWorkerRequest,
  isProcessImageWorkerRequest,
  type ImageResizerCapabilities,
  type ImageResizerWorkerRequest,
  type ImageResizerWorkerResponse,
} from "./imageResizerWorkerProtocol";
import { createImageZip } from "./imageResizerZip";

type PyProxy = {
  (...args: unknown[]): PyProxy;
  destroy: () => void;
  toJs: (options?: {
    dict_converter?: (entries: Iterable<[string, unknown]>) => unknown;
  }) => unknown;
};

type PyodideApi = {
  version: string;
  globals: {
    get: (name: string) => PyProxy;
  };
  loadPackage: (name: string) => Promise<unknown>;
  runPython: (code: string) => unknown;
  unpackArchive: (
    buffer: ArrayBuffer,
    format: string,
    options: { extractDir: string },
  ) => void;
};

type PyodideModule = {
  loadPyodide: (options: { indexURL: string }) => Promise<PyodideApi>;
};

type SelectedImage = {
  id: string;
  bytes: Uint8Array;
  fileName: string;
  sourceFormat: "JPEG" | "PNG" | "WebP";
  width: number;
  height: number;
};

type Runtime = {
  pyodide: PyodideApi;
  manifest: ImageResizerBrowserManifest;
  capabilities: ImageResizerCapabilities;
  inspectImage: PyProxy;
  processImage: PyProxy;
};

type WorkerFailureOptions = {
  code: string;
  userMessage: string;
  cause?: unknown;
};

class WorkerFailure extends Error {
  code: string;
  userMessage: string;

  constructor({ code, userMessage, cause }: WorkerFailureOptions) {
    super(code, { cause });
    this.name = "WorkerFailure";
    this.code = code;
    this.userMessage = userMessage;
  }
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<Runtime> | null = null;
let selectedImage: SelectedImage | null = null;
let processing = false;

const PYTHON_ADAPTER = String.raw`
import sys
from io import BytesIO

sys.path.insert(0, "/image-resizer-runtime")

from PIL import Image
from image_resizer import (
  ImageMetadata,
    ProcessingOptions,
    ResizeOptions,
  filename_stem_from_input,
    get_image_dimensions,
    process_image,
)


def _browser_bytes(value):
    try:
        value = value.to_py()
    except AttributeError:
        pass
    return bytes(value)


def _browser_capabilities():
    results = {}
    for output_format, pillow_format in (
        ("JPEG", "JPEG"),
        ("PNG", "PNG"),
        ("WebP", "WEBP"),
    ):
        output = BytesIO()
        image = Image.new("RGB", (2, 2), "white")
        try:
            image.save(output, pillow_format)
            results[output_format] = len(output.getvalue()) > 0
        except Exception:
            results[output_format] = False
        finally:
            image.close()
    return results


def _browser_inspect(input_value):
    data = _browser_bytes(input_value)
    with Image.open(BytesIO(data)) as image:
        source_format = image.format
        image.verify()

    canonical = {
        "JPG": "JPEG",
        "JPEG": "JPEG",
        "PNG": "PNG",
        "WEBP": "WebP",
    }.get(source_format)
    if canonical is None:
        raise ValueError("Only JPEG, PNG and WebP images are supported.")

    width, height = get_image_dimensions(data)
    return {
        "sourceFormat": canonical,
        "width": width,
        "height": height,
    }


def _browser_process(
    input_value,
    source_filename,
    long_edge,
    never_enlarge,
    output_format,
    quality,
    output_filename,
    title,
    alt_text,
    creator,
    copyright_text,
    strip_metadata,
):
    data = _browser_bytes(input_value)
    resize = ResizeOptions(
        mode="Long edge",
        primary_value=int(long_edge),
        never_enlarge=bool(never_enlarge),
    )
    options = ProcessingOptions(
        resize=resize,
        output_format=output_format,
        quality=int(quality),
        strip_metadata=bool(strip_metadata),
        web_filenames=True,
        source_filename=source_filename,
        custom_output_stem=filename_stem_from_input(output_filename),
    )
    metadata = ImageMetadata(
        title=title,
        alt_text=alt_text,
        creator=creator,
        copyright=copyright_text,
    )
    processed = process_image(data, options, metadata)
    return {
        "data": processed.data,
        "suggestedFilename": processed.suggested_filename,
        "originalWidth": processed.original_width,
        "originalHeight": processed.original_height,
        "width": processed.width,
        "height": processed.height,
        "outputFormat": processed.output_format,
    }
`;

function postMessage(
  response: ImageResizerWorkerResponse,
  transfer: Transferable[] = [],
) {
  workerScope.postMessage(response, transfer);
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error("Python adapter returned an invalid result.");
  }

  return value as Record<string, unknown>;
}

function fromPython(proxy: PyProxy): Record<string, unknown> {
  try {
    return asObject(
      proxy.toJs({
        dict_converter: Object.fromEntries,
      }),
    );
  } finally {
    proxy.destroy();
  }
}

function workerFailure(
  error: unknown,
  fallback: Pick<WorkerFailureOptions, "code" | "userMessage">,
) {
  if (error instanceof WorkerFailure) {
    return error;
  }

  return new WorkerFailure({ ...fallback, cause: error });
}

function reportError(
  requestId: string,
  stage:
    | "initialization"
    | "selection"
    | "processing"
    | "zip"
    | "protocol",
  error: unknown,
  fallback: Pick<WorkerFailureOptions, "code" | "userMessage">,
) {
  const failure = workerFailure(error, fallback);
  console.error(`[Image Resizer worker: ${failure.code}]`, error);
  postMessage({
    type: "error",
    requestId,
    stage,
    code: failure.code,
    message: failure.userMessage,
  });
}

async function fetchManifest() {
  let response: Response;
  try {
    response = await fetch(IMAGE_RESIZER_BROWSER_MANIFEST_URL, {
      cache: "no-store",
    });
  } catch (error) {
    throw new WorkerFailure({
      code: "MANIFEST_FETCH_FAILED",
      userMessage:
        "The image tools could not be downloaded. Check your connection and try again.",
      cause: error,
    });
  }

  if (
    !response.ok ||
    !getSafeImageResizerBrowserRuntimeUrl(response.url)
  ) {
    throw new WorkerFailure({
      code: "MANIFEST_FETCH_FAILED",
      userMessage: "The image tools manifest could not be downloaded.",
    });
  }

  try {
    return parseImageResizerBrowserManifest(await response.json());
  } catch (error) {
    throw new WorkerFailure({
      code: "INVALID_MANIFEST",
      userMessage:
        "The published image tools information is invalid. Please try again later.",
      cause: error,
    });
  }
}

async function fetchAndVerifyBundle(manifest: ImageResizerBrowserManifest) {
  let response: Response;
  try {
    response = await fetch(manifest.bundleUrl, { cache: "force-cache" });
  } catch (error) {
    throw new WorkerFailure({
      code: "CORE_FETCH_FAILED",
      userMessage: "The image processing engine could not be downloaded.",
      cause: error,
    });
  }

  if (
    !response.ok ||
    !getSafeImageResizerBrowserRuntimeUrl(response.url)
  ) {
    throw new WorkerFailure({
      code: "CORE_FETCH_FAILED",
      userMessage: "The image processing engine could not be downloaded.",
    });
  }

  const bundle = await response.arrayBuffer();
  if (bundle.byteLength !== manifest.bundleSizeBytes) {
    throw new WorkerFailure({
      code: "BUNDLE_SIZE_MISMATCH",
      userMessage:
        "The downloaded image processing engine failed its size check.",
    });
  }

  const digest = await crypto.subtle.digest("SHA-256", bundle);
  const sha256 = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  if (sha256 !== manifest.bundleSha256) {
    throw new WorkerFailure({
      code: "BUNDLE_SHA_MISMATCH",
      userMessage:
        "The downloaded image processing engine failed its integrity check.",
    });
  }

  return bundle;
}

async function initializeRuntime(): Promise<Runtime> {
  const manifest = await fetchManifest();
  const bundle = await fetchAndVerifyBundle(manifest);
  const { indexUrl, moduleUrl } = getPyodideRuntimeUrls(
    manifest.pyodideVersion,
  );

  let pyodideModule: PyodideModule;
  let pyodide: PyodideApi;
  try {
    pyodideModule = (await import(
      /* webpackIgnore: true */
      /* turbopackIgnore: true */
      moduleUrl
    )) as PyodideModule;
    pyodide = await pyodideModule.loadPyodide({ indexURL: indexUrl });
  } catch (error) {
    throw new WorkerFailure({
      code: "PYODIDE_LOAD_FAILED",
      userMessage: "The browser image runtime could not be loaded.",
      cause: error,
    });
  }

  if (pyodide.version !== manifest.pyodideVersion) {
    throw new WorkerFailure({
      code: "PYODIDE_VERSION_MISMATCH",
      userMessage: "The browser image runtime version did not match.",
    });
  }

  try {
    await pyodide.loadPackage("pillow");
    const loadedPillowVersion = pyodide.runPython(
      "import PIL; PIL.__version__",
    );
    if (loadedPillowVersion !== manifest.pillowVersion) {
      throw new Error("Pillow version mismatch.");
    }
  } catch (error) {
    throw new WorkerFailure({
      code: "PILLOW_LOAD_FAILED",
      userMessage: "The browser image library could not be loaded.",
      cause: error,
    });
  }

  try {
    pyodide.unpackArchive(bundle, "zip", {
      extractDir: "/image-resizer-runtime",
    });
    pyodide.runPython(PYTHON_ADAPTER);

    const capabilityProxy = pyodide.globals.get("_browser_capabilities")();
    const rawCapabilities = fromPython(capabilityProxy);
    const capabilities: ImageResizerCapabilities = {
      JPEG: rawCapabilities.JPEG === true,
      PNG: rawCapabilities.PNG === true,
      WebP: rawCapabilities.WebP === true,
    };

    if (!capabilities.JPEG || !capabilities.PNG) {
      throw new Error("Required image formats are unavailable.");
    }

    return {
      pyodide,
      manifest,
      capabilities,
      inspectImage: pyodide.globals.get("_browser_inspect"),
      processImage: pyodide.globals.get("_browser_process"),
    };
  } catch (error) {
    throw new WorkerFailure({
      code: "CORE_IMPORT_FAILED",
      userMessage: "The shared image processing engine could not be started.",
      cause: error,
    });
  }
}

async function handleInitialize(requestId: string) {
  postMessage({ type: "initializing", requestId });
  const startedAt = performance.now();
  runtimePromise ??= initializeRuntime();

  try {
    const runtime = await runtimePromise;
    postMessage({
      type: "ready",
      requestId,
      capabilities: runtime.capabilities,
      pyodideVersion: runtime.manifest.pyodideVersion,
      pillowVersion: runtime.manifest.pillowVersion,
      coreVersion: runtime.manifest.sourceVersion,
      initializationMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    runtimePromise = null;
    reportError(requestId, "initialization", error, {
      code: "INITIALIZATION_FAILED",
      userMessage: "Unable to initialise image tools.",
    });
  }
}

async function handleSelectImage(
  request: Extract<ImageResizerWorkerRequest, { type: "select-image" }>,
) {
  selectedImage = null;

  try {
    const runtime = await runtimePromise;
    if (!runtime) {
      throw new WorkerFailure({
        code: "RUNTIME_NOT_READY",
        userMessage: "The image tools are not ready yet.",
      });
    }

    const bytes = new Uint8Array(request.bytes);
    const details = fromPython(runtime.inspectImage(bytes));
    const sourceFormat = details.sourceFormat;
    const width = details.width;
    const height = details.height;

    if (
      (sourceFormat !== "JPEG" &&
        sourceFormat !== "PNG" &&
        sourceFormat !== "WebP") ||
      typeof width !== "number" ||
      typeof height !== "number"
    ) {
      throw new Error("Image inspection returned invalid details.");
    }

    selectedImage = {
      id: request.imageId,
      bytes,
      fileName: request.fileName,
      sourceFormat,
      width,
      height,
    };

    postMessage({
      type: "image-selected",
      requestId: request.requestId,
      imageId: request.imageId,
      width,
      height,
      sourceFormat,
    });
  } catch (error) {
    reportError(request.requestId, "selection", error, {
      code: "UNSUPPORTED_OR_INVALID_IMAGE",
      userMessage:
        "This file could not be read as a valid JPEG, PNG or WebP image.",
    });
  }
}

async function handleProcessImage(
  request: Extract<ImageResizerWorkerRequest, { type: "process-image" }>,
) {
  if (processing) {
    reportError(request.requestId, "processing", null, {
      code: "PROCESSING_IN_PROGRESS",
      userMessage: "An image is already being resized.",
    });
    return;
  }

  processing = true;
  const startedAt = performance.now();

  try {
    const runtime = await runtimePromise;
    if (!runtime) {
      throw new WorkerFailure({
        code: "RUNTIME_NOT_READY",
        userMessage: "The image tools are not ready yet.",
      });
    }

    if (!selectedImage || selectedImage.id !== request.imageId) {
      throw new WorkerFailure({
        code: "IMAGE_NOT_SELECTED",
        userMessage: "Select the image again before resizing.",
      });
    }

    const outputFormat =
      request.outputFormat === "original"
        ? selectedImage.sourceFormat
        : request.outputFormat;

    if (!runtime.capabilities[outputFormat]) {
      throw new WorkerFailure({
        code: "FORMAT_UNAVAILABLE",
        userMessage: `${outputFormat} output is not available in this browser runtime.`,
      });
    }

    const rawResult = fromPython(
      runtime.processImage(
        selectedImage.bytes,
        selectedImage.fileName,
        request.longEdge,
        request.neverEnlarge,
        outputFormat,
        request.quality,
        request.outputFilename,
        request.title,
        request.altText,
        request.creator,
        request.copyright,
        request.stripMetadata,
      ),
    );
    const outputBytes = rawResult.data;

    if (!(outputBytes instanceof Uint8Array)) {
      throw new Error("Processing returned invalid image bytes.");
    }

    const transferableBytes = outputBytes.slice().buffer;
    postMessage(
      {
        type: "processed",
        requestId: request.requestId,
        imageId: request.imageId,
        bytes: transferableBytes,
        suggestedFilename: String(rawResult.suggestedFilename),
        originalWidth: Number(rawResult.originalWidth),
        originalHeight: Number(rawResult.originalHeight),
        width: Number(rawResult.width),
        height: Number(rawResult.height),
        outputFormat: outputFormat,
        processingMs: Math.round(performance.now() - startedAt),
      },
      [transferableBytes],
    );
  } catch (error) {
    reportError(request.requestId, "processing", error, {
      code: "PROCESSING_FAILED",
      userMessage:
        "The image could not be resized. It may be damaged or use unsupported image data.",
    });
  } finally {
    processing = false;
    selectedImage = null;
  }
}

function handleCreateZip(
  request: Extract<ImageResizerWorkerRequest, { type: "create-zip" }>,
) {
  try {
    const zipBytes = createImageZip(request.entries);
    const transferableBytes = zipBytes.slice().buffer;
    postMessage(
      {
        type: "zip-created",
        requestId: request.requestId,
        bytes: transferableBytes,
        fileCount: request.entries.length,
      },
      [transferableBytes],
    );
  } catch (error) {
    reportError(request.requestId, "zip", error, {
      code: "ZIP_CREATION_FAILED",
      userMessage:
        "The download archive could not be created. Individual downloads are still available.",
    });
  }
}

workerScope.addEventListener("message", (event: MessageEvent<unknown>) => {
  const request = event.data as Partial<ImageResizerWorkerRequest>;

  if (!request || typeof request.requestId !== "string") {
    reportError("unknown", "protocol", null, {
      code: "INVALID_REQUEST",
      userMessage: "The image tool received an invalid request.",
    });
    return;
  }

  if (request.type === "initialize") {
    void handleInitialize(request.requestId);
  } else if (
    request.type === "select-image" &&
    typeof request.imageId === "string" &&
    typeof request.fileName === "string" &&
    request.bytes instanceof ArrayBuffer
  ) {
    void handleSelectImage(
      request as Extract<
        ImageResizerWorkerRequest,
        { type: "select-image" }
      >,
    );
  } else if (isProcessImageWorkerRequest(request)) {
    void handleProcessImage(request);
  } else if (request.type === "process-image") {
    reportError(request.requestId, "protocol", null, {
      code: "INVALID_REQUEST",
      userMessage: "The image tool received an invalid request.",
    });
  } else if (isCreateZipWorkerRequest(request)) {
    handleCreateZip(request);
  } else if (request.type === "create-zip") {
    reportError(request.requestId, "protocol", null, {
      code: "INVALID_REQUEST",
      userMessage: "The image tool received an invalid request.",
    });
  } else {
    reportError(request.requestId, "protocol", null, {
      code: "UNKNOWN_REQUEST",
      userMessage: "The image tool received an unknown request.",
    });
  }
});

workerScope.addEventListener("unload", () => {
  void runtimePromise?.then((runtime) => {
    runtime.inspectImage.destroy();
    runtime.processImage.destroy();
  });
});