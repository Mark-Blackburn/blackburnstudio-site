import { spawn } from "node:child_process";
import { createServer } from "node:net";

import { chromium } from "playwright";
import sharp from "sharp";

function stream(dictionary, bytes) {
  return Buffer.concat([
    Buffer.from(`<< ${dictionary} /Length ${bytes.length} >>\nstream\n`),
    bytes,
    Buffer.from("\nendstream"),
  ]);
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

function createPdf(jpeg, width, height) {
  const content = Buffer.from("q 144 0 0 144 0 0 cm /Im0 Do Q\n");
  return assemblePdf([
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 144 144] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>",
    ),
    stream("", content),
    stream(
      `/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      jpeg,
    ),
  ]);
}

async function allocatePort() {
  return new Promise((resolvePort, rejectPort) => {
    const probe = createServer();
    probe.once("error", rejectPort);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close(() => rejectPort(new Error("Could not allocate a port")));
        return;
      }
      probe.close((error) =>
        error ? rejectPort(error) : resolvePort(address.port),
      );
    });
  });
}

const width = 1800;
const height = 1800;
const pixels = Buffer.allocUnsafe(width * height * 3);
for (let index = 0; index < pixels.length; index += 3) {
  const pixel = index / 3;
  const x = pixel % width;
  const y = Math.floor(pixel / width);
  pixels[index] = (x * 13 + y * 7) % 256;
  pixels[index + 1] = (x * 3 + y * 17) % 256;
  pixels[index + 2] = (x * 19 + y * 5) % 256;
}
const jpeg = await sharp(pixels, { raw: { width, height, channels: 3 } })
  .jpeg({ quality: 95 })
  .toBuffer();
const pdf = createPdf(jpeg, width, height);
const port = await allocatePort();
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)],
  { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
);
let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk;
});

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next server exited early:\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${origin}/tools/pdf-reducer/app`);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Next server did not start:\n${serverOutput}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const createObjectURL = URL.createObjectURL.bind(URL);
    globalThis.__pdfReducerBlob = null;
    URL.createObjectURL = (blob) => {
      globalThis.__pdfReducerBlob = { size: blob.size, type: blob.type };
      return createObjectURL(blob);
    };
  });

  const runtimeRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("/runtime/pdf-reducer/")) {
      runtimeRequests.push(request.url());
    }
  });
  await page.goto(`${origin}/tools/pdf-reducer/app`, { waitUntil: "networkidle" });
  if (runtimeRequests.length !== 0) {
    throw new Error(`Idle app loaded runtime assets: ${JSON.stringify(runtimeRequests)}`);
  }

  const input = page.getByLabel("Choose PDF file");
  await input.setInputFiles({
    name: "synthetic-photo-document.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.getByRole("button", { name: "Reduce PDF" }).click();
  const downloadLink = page.getByRole("link", { name: "Download reduced PDF" });
  await downloadLink.waitFor({ state: "visible", timeout: 60_000 });

  const blob = await page.evaluate(() => globalThis.__pdfReducerBlob);
  if (!blob || blob.type !== "application/pdf" || blob.size >= pdf.byteLength) {
    throw new Error(`Unexpected reduced Blob: ${JSON.stringify(blob)}`);
  }
  if (
    !runtimeRequests.some((url) => url.endsWith("pdf-reducer-worker.mjs")) ||
    !runtimeRequests.some((url) => url.endsWith("pdf-reducer.mjs")) ||
    !runtimeRequests.some((url) => url.endsWith("pdf-reducer.wasm"))
  ) {
    throw new Error(`Expected runtime assets were not requested: ${JSON.stringify(runtimeRequests)}`);
  }

  const downloadPromise = page.waitForEvent("download");
  await downloadLink.click();
  const download = await downloadPromise;
  if (download.suggestedFilename() !== "synthetic-photo-document-reduced.pdf") {
    throw new Error(`Unexpected download filename: ${download.suggestedFilename()}`);
  }

  await page.getByRole("button", { name: "Reduce another PDF" }).click();
  await input.setInputFiles({
    name: "synthetic-photo-document.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.getByRole("button", { name: "Reduce PDF" }).click();
  const cancel = page.getByRole("button", { name: "Cancel" });
  await cancel.click({ timeout: 10_000 });
  await page.getByText("Processing cancelled. Your PDF is still selected.").waitFor();
  if (!(await page.getByRole("button", { name: "Reduce PDF" }).isEnabled())) {
    throw new Error("PDF Reducer was not reusable after cancellation");
  }

  console.log(
    JSON.stringify(
      {
        inputBytes: pdf.byteLength,
        outputBytes: blob.size,
        blobType: blob.type,
        downloadFilename: download.suggestedFilename(),
        runtimeAssetsLoadedOnlyAfterProcessing: true,
        cancellationRecovered: true,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  server.kill();
}
