import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

import { chromium } from "playwright";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "../../..");
const publicRoot = join(root, "public");
const encryptedPdf = Buffer.from(
  "JVBERi0xLjcKJb/3ov4KMSAwIG9iago8PCAvRXh0ZW5zaW9ucyA8PCAvQURCRSA8PCAvQmFzZVZlcnNpb24gLzEuNyAvRXh0ZW5zaW9uTGV2ZWwgOCA+PiA+PiAvUGFnZXMgMiAwIFIgL1R5cGUgL0NhdGFsb2cgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL0NvdW50IDEgL0tpZHMgWyAzIDAgUiBdIC9UeXBlIC9QYWdlcyA+PgplbmRvYmoKMyAwIG9iago8PCAvQ29udGVudHMgNCAwIFIgL01lZGlhQm94IFsgMCAwIDEwMCAxMDAgXSAvUGFyZW50IDIgMCBSIC9UeXBlIC9QYWdlID4+CmVuZG9iago0IDAgb2JqCjw8IC9MZW5ndGggMzIgPj4Kc3RyZWFtCjebIIohrk2O4vZ9ttriybwGrcK3N/dpvVM1LZwuzF9EZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9DRiA8PCAvU3RkQ0YgPDwgL0F1dGhFdmVudCAvRG9jT3BlbiAvQ0ZNIC9BRVNWMyAvTGVuZ3RoIDMyID4+ID4+IC9GaWx0ZXIgL1N0YW5kYXJkIC9MZW5ndGggMjU2IC9PIDwzMTdhNDY2MjZhOTQzMWI3MzJiNjY0MzcwZjYzMzRmNzZjYTZiMzZiYjk3ZDI4YmEwMjM2NDVkMDlkNTQ2Njg1ZDRlMzY0MTNlMmE4MjNkMmMyMjRkOTA4ZWQ5YTg4Y2I+IC9PRSA8MDFiOGZkMDczZWZiNmZmNjJkOWRhNDJlMWY5ZjcxZGI4YmVkMTZhM2E4Mjc2YzY2MTRjNTRiZWExNjQ1NGU3OT4gL1AgLTQgL1Blcm1zIDxjMjJjNDI4NjRhYzZhMTY2MzFlZDkwOTJmZGU1ZDczZT4gL1IgNiAvU3RtRiAvU3RkQ0YgL1N0ckYgL1N0ZENGIC9VIDwzMmFkNTlkN2JkZGMyYjdkZTM0Y2Q0NmRiN2YxMTQ4MTZhMzg3YjhhYmZmMmY5MDUwZjRiOTI1ZWQ1NTM4MWM1ZGRjMTRlYTZiZTYwMmEwNjUyODU4ZGMzNmQzM2E4ZWY+IC9VRSA8YzlkYTcxMGYxNzI2ZDJkNzczYjEzMTMyMzY5NTMwNjkwZDJkMmFmMWFhYTdmYWVlMmNmMjJjNDUwN2VmMmIwZj4gL1YgNSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAxMzAgMDAwMDAgbiAKMDAwMDAwMDE4OSAwMDAwMCBuIAowMDAwMDAwMjc4IDAwMDAwIG4gCjAwMDAwMDAzNTkgMDAwMDAgbiAKdHJhaWxlciA8PCAvUm9vdCAxIDAgUiAvU2l6ZSA2IC9JRCBbPDFmN2M4MGUyZTg4OTdiNGFjYmYzYTRlZmUxYzAzNWI1PjwxZjdjODBlMmU4ODk3YjRhY2JmM2E0ZWZlMWMwMzViNT5dIC9FbmNyeXB0IDUgMCBSID4+CnN0YXJ0eHJlZgo5MDYKJSVFT0YK",
  "base64",
);

function stream(dictionary, bytes) {
  return Buffer.concat([
    Buffer.from(`<< ${dictionary} /Length ${bytes.length} >>\nstream\n`),
    bytes,
    Buffer.from("\nendstream"),
  ]);
}

function createPdf(
  jpeg,
  {
    contentText = "q 144 0 0 144 0 0 cm /Im0 Do Q\n",
    dictionaryWidth = 1200,
    dictionaryHeight = 1200,
    userUnit,
  } = {},
) {
  const content = Buffer.from(contentText);
  const userUnitEntry = userUnit === undefined ? "" : ` /UserUnit ${userUnit}`;
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 144 144]${userUnitEntry} /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`,
    ),
    stream("", content),
    stream(
      `/Type /XObject /Subtype /Image /Width ${dictionaryWidth} /Height ${dictionaryHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      jpeg,
    ),
  ];
  return assemblePdf(objects);
}

function createFormPdf(jpeg, formMatrix) {
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 144 144] /Resources << /XObject << /Fm0 5 0 R >> >> /Contents 4 0 R >>",
    ),
    stream("", Buffer.from("/Fm0 Do\n")),
    stream(
      `/Type /XObject /Subtype /Form /BBox [0 0 1 1] /Matrix [${formMatrix.join(" ")}] /Resources << /XObject << /Im0 6 0 R >> >>`,
      Buffer.from("/Im0 Do\n"),
    ),
    stream(
      "/Type /XObject /Subtype /Image /Width 1200 /Height 1200 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode",
      jpeg,
    ),
  ];
  return assemblePdf(objects);
}

function assemblePdf(objects) {
  const chunks = [Buffer.from("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n", "latin1")];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const wrapped = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`),
      object,
      Buffer.from("\nendobj\n"),
    ]);
    chunks.push(wrapped);
    length += wrapped.length;
  });
  const xref = length;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    trailer += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  chunks.push(Buffer.from(trailer));
  return Buffer.concat(chunks);
}

function findSofMarker(jpeg) {
  for (let index = 2; index + 11 < jpeg.length; ) {
    if (jpeg[index] !== 0xff) throw new Error("Unexpected JPEG marker layout");
    while (jpeg[index] === 0xff) index++;
    const marker = jpeg[index++];
    if (marker === 0xda || marker === 0xd9) break;
    const length = jpeg.readUInt16BE(index);
    const markerStart = index - 2;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return markerStart;
    }
    index += length;
  }
  throw new Error("JPEG SOF marker not found");
}

function withHeaderDimensions(jpeg, width, height) {
  const changed = Buffer.from(jpeg);
  const marker = findSofMarker(changed);
  changed.writeUInt16BE(height, marker + 5);
  changed.writeUInt16BE(width, marker + 7);
  return changed;
}

function withTruncatedEntropy(jpeg) {
  for (let index = 2; index + 4 < jpeg.length; ) {
    while (jpeg[index] === 0xff) index++;
    const marker = jpeg[index++];
    const length = jpeg.readUInt16BE(index);
    if (marker === 0xda) {
      const entropyStart = index + length;
      return Buffer.concat([
        jpeg.subarray(0, Math.min(entropyStart + 8, jpeg.length - 2)),
        Buffer.from([0xff, 0xd9]),
      ]);
    }
    index += length;
  }
  throw new Error("JPEG SOS marker not found");
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    if (request.url === "/") {
      response.writeHead(200, { "content-type": contentTypes[".html"] });
      response.end("<!doctype html><title>PDF Reducer smoke</title>");
      return;
    }
    const path = normalize(decodeURIComponent(request.url ?? "/")).replace(
      /^(\.\.(\\|\/|$))+/, "",
    );
    const file = join(publicRoot, path);
    if (!file.startsWith(publicRoot)) throw new Error("unsafe path");
    const bytes = await readFile(file);
    response.writeHead(200, {
      "content-type": contentTypes[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Smoke server failed");
const origin = `http://127.0.0.1:${address.port}`;
const workerUrl = `${origin}/runtime/pdf-reducer/1.0.0/pdf-reducer-worker.mjs`;
const jpeg = await sharp({
  create: {
    width: 1200,
    height: 1200,
    channels: 3,
    background: { r: 38, g: 104, b: 164 },
  },
})
  .jpeg({ quality: 95 })
  .toBuffer();
const validPdf = createPdf(jpeg);
const extremeUserUnitPdf = createPdf(jpeg, { userUnit: 1_000_000_000 });
const extremeFormPdf = createFormPdf(jpeg, [
  1_000_000_000,
  0,
  0,
  1_000_000_000,
  0,
  0,
]);
const extremeSharedPdf = createPdf(jpeg, {
  contentText:
    "q 144 0 0 144 0 0 cm /Im0 Do Q q 1000000000 0 0 1000000000 0 0 cm /Im0 Do Q\n",
});
const mismatchedHeaderPdf = createPdf(withHeaderDimensions(jpeg, 1000, 1000));
const oversizedHeaderPdf = createPdf(withHeaderDimensions(jpeg, 7000, 7000));
const malformedDecodePdf = createPdf(withTruncatedEntropy(jpeg));

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(origin);
  const result = await page.evaluate(
    async ({ encrypted, extremeForm, extremeShared, extremeUserUnit, invalid, malformedDecode, mismatchedHeader, oversizedHeader, valid, workerUrl: url }) => {
      const decode = (base64) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) {
          bytes[index] = binary.charCodeAt(index);
        }
        return bytes.buffer;
      };
      const run = (mode, base64) =>
        new Promise((resolveRun, rejectRun) => {
          const worker = new Worker(url, { type: "module" });
          const jobId = crypto.randomUUID();
          worker.onerror = () => rejectRun(new Error("Worker failed"));
          worker.onmessage = (event) => {
            if (event.data.type === "ready") {
              const input = decode(base64);
              worker.postMessage(
                { type: "process", jobId, mode, input },
                [input],
              );
              if (input.byteLength !== 0) {
                rejectRun(new Error("Input was not transferred"));
              }
            } else if (event.data.jobId === jobId) {
              worker.terminate();
              resolveRun(event.data);
            }
          };
        });

      const optimize = await run("optimize", valid);
      const reduceImages = await run("reduce-images", valid);
      const reducedPdfText = new TextDecoder("windows-1252").decode(
        reduceImages.output,
      );
      const invalidResult = await run("optimize", invalid);
      const encryptedResult = await run("optimize", encrypted);
      const safetyResults = {};
      for (const [name, fixture] of Object.entries({
        extremeUserUnit,
        extremeForm,
        extremeShared,
        mismatchedHeader,
        oversizedHeader,
        malformedDecode,
      })) {
        const response = await run("reduce-images", fixture);
        const text =
          response.type === "result"
            ? new TextDecoder("windows-1252").decode(response.output)
            : "";
        safetyResults[name] = {
          type: response.type,
          code: response.code,
          downsampled: response.metadata?.downsampled,
          unsupported: response.metadata?.unsupported,
          dimensionsUnchanged:
            text.includes("/Width 1200") && text.includes("/Height 1200"),
        };
      }

      const cancelledWorker = new Worker(url, { type: "module" });
      await new Promise((resolveReady, rejectReady) => {
        cancelledWorker.onerror = rejectReady;
        cancelledWorker.onmessage = (event) => {
          if (event.data.type === "ready") resolveReady();
        };
      });
      const cancelledInput = decode(valid);
      cancelledWorker.postMessage(
        {
          type: "process",
          jobId: crypto.randomUUID(),
          mode: "reduce-images",
          input: cancelledInput,
        },
        [cancelledInput],
      );
      cancelledWorker.terminate();
      const recovered = await run("optimize", valid);

      return {
        optimize: {
          type: optimize.type,
          inputBytes: optimize.inputBytes,
          outputBytes: optimize.outputBytes,
          outputTransferred: optimize.output instanceof ArrayBuffer,
        },
        reduceImages: {
          type: reduceImages.type,
          inputBytes: reduceImages.inputBytes,
          outputBytes: reduceImages.outputBytes,
          downsampled: reduceImages.metadata?.downsampled,
          dimensionsReduced:
            reducedPdfText.includes("/Width 400") &&
            reducedPdfText.includes("/Height 400"),
          resamplerOutputValid: reduceImages.output instanceof ArrayBuffer,
        },
        invalidCode: invalidResult.code,
        encryptedCode: encryptedResult.code,
        safetyResults,
        cancellationRecovered: recovered.type === "result",
      };
    },
    {
      workerUrl,
      valid: validPdf.toString("base64"),
      invalid: Buffer.from("not a PDF").toString("base64"),
      encrypted: encryptedPdf.toString("base64"),
      extremeForm: extremeFormPdf.toString("base64"),
      extremeShared: extremeSharedPdf.toString("base64"),
      extremeUserUnit: extremeUserUnitPdf.toString("base64"),
      malformedDecode: malformedDecodePdf.toString("base64"),
      mismatchedHeader: mismatchedHeaderPdf.toString("base64"),
      oversizedHeader: oversizedHeaderPdf.toString("base64"),
    },
  );

  if (
    result.optimize.type !== "result" ||
    !result.optimize.outputTransferred ||
    result.reduceImages.type !== "result" ||
    !result.reduceImages.resamplerOutputValid ||
    result.reduceImages.downsampled !== 1 ||
    !result.reduceImages.dimensionsReduced ||
    result.reduceImages.outputBytes >= result.reduceImages.inputBytes ||
    result.invalidCode !== "INVALID_PDF" ||
    result.encryptedCode !== "ENCRYPTED_PDF" ||
    ["extremeUserUnit", "extremeForm", "extremeShared"].some(
      (name) => {
        const safety = result.safetyResults[name];
        return (
          safety.type !== "result" ||
          safety.downsampled !== 0 ||
          safety.unsupported !== 1 ||
          !safety.dimensionsUnchanged
        );
      },
    ) ||
    ["mismatchedHeader", "oversizedHeader", "malformedDecode"].some(
      (name) => {
        const safety = result.safetyResults[name];
        return safety.type !== "error" || safety.code !== "VALIDATION_FAILED";
      },
    ) ||
    !result.cancellationRecovered
  ) {
    throw new Error(`PDF Reducer smoke failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
}
