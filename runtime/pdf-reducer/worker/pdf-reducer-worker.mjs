const RUNTIME_VERSION = "1.0.0";
const RUNTIME_MODULE_URL = new URL("./pdf-reducer.mjs", import.meta.url);
const RUNTIME_WASM_URL = new URL("./pdf-reducer.wasm", import.meta.url);
const INPUT_PATH = "/input.pdf";
const OUTPUT_PATH = "/output.pdf";
const ERROR_PATH = "/blackburn-error-code.txt";
const MODE_LIMITS = Object.freeze({
  optimize: 25 * 1024 * 1024,
  "reduce-images": 15 * 1024 * 1024,
});
const ERROR_CODES = new Set([
  "INVALID_PDF",
  "ENCRYPTED_PDF",
  "FILE_TOO_LARGE",
  "IMAGE_LIMIT",
  "PROCESSING_FAILED",
  "VALIDATION_FAILED",
  "RUNTIME_FAILED",
  "CANCELLED",
]);

let processing = false;
let resultMetadata = null;

function post(response, transfer = []) {
  self.postMessage(response, transfer);
}

function fail(jobId, code) {
  post({
    type: "error",
    jobId,
    code: ERROR_CODES.has(code) ? code : "RUNTIME_FAILED",
  });
}

function removeIfPresent(FS, path) {
  try {
    FS.unlink(path);
  } catch {
    // The per-job worker may not have created this path.
  }
}

async function loadRuntime() {
  const { default: createBlackburnPdfReducer } = await import(
    RUNTIME_MODULE_URL.href
  );
  return createBlackburnPdfReducer({
    locateFile(path) {
      return path.endsWith(".wasm") ? RUNTIME_WASM_URL.href : path;
    },
    print(line) {
      if (typeof line !== "string" || !line.startsWith("BLACKBURN_RESULT ")) {
        return;
      }
      try {
        resultMetadata = JSON.parse(line.slice("BLACKBURN_RESULT ".length));
      } catch {
        resultMetadata = null;
      }
    },
    printErr() {
      // qpdf diagnostics stay inside the Worker and are never exposed as user text.
    },
  });
}

const runtimePromise = loadRuntime();
runtimePromise.then(
  () => post({ type: "ready", runtimeVersion: RUNTIME_VERSION }),
  () => fail(null, "RUNTIME_FAILED"),
);

self.addEventListener("message", async (event) => {
  const request = event.data;
  if (
    processing ||
    typeof request !== "object" ||
    request === null ||
    request.type !== "process" ||
    typeof request.jobId !== "string" ||
    !(request.input instanceof ArrayBuffer) ||
    !Object.hasOwn(MODE_LIMITS, request.mode)
  ) {
    fail(
      typeof request?.jobId === "string" ? request.jobId : null,
      "RUNTIME_FAILED",
    );
    return;
  }

  const { input, jobId, mode } = request;
  if (input.byteLength > MODE_LIMITS[mode]) {
    fail(jobId, "FILE_TOO_LARGE");
    return;
  }

  processing = true;
  try {
    const runtime = await runtimePromise;
    const { FS } = runtime;
    removeIfPresent(FS, INPUT_PATH);
    removeIfPresent(FS, OUTPUT_PATH);
    removeIfPresent(FS, ERROR_PATH);
    resultMetadata = null;

    // MEMFS must copy the transferred browser buffer into the WASM filesystem.
    FS.writeFile(INPUT_PATH, new Uint8Array(input));
    const status = runtime.callMain([mode, INPUT_PATH, OUTPUT_PATH]);
    if (status !== 0) {
      let code = "PROCESSING_FAILED";
      try {
        code = FS.readFile(ERROR_PATH, { encoding: "utf8" }).trim();
      } catch {
        // Use the safe fallback; raw native diagnostics are intentionally hidden.
      }
      fail(jobId, code);
      return;
    }

    const output = FS.readFile(OUTPUT_PATH);
    const outputBuffer =
      output.byteOffset === 0 && output.byteLength === output.buffer.byteLength
        ? output.buffer
        : new Uint8Array(output).buffer;
    const metadata = resultMetadata ?? {
      mode,
      inspected: 0,
      downsampled: 0,
      recompressed: 0,
      skipped: 0,
      unsupported: 0,
      ambiguous: 0,
      decodedPeakBytes: 0,
      decodedTotalBytes: 0,
    };

    post(
      {
        type: "result",
        jobId,
        output: outputBuffer,
        inputBytes: input.byteLength,
        outputBytes: outputBuffer.byteLength,
        metadata,
      },
      [outputBuffer],
    );
  } catch {
    fail(jobId, "RUNTIME_FAILED");
  }
});
