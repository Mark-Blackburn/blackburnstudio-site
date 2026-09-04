import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "../../..");
const runtimeDirectory = resolve(root, "public/runtime/pdf-reducer/1.0.0");
const manifestPath = resolve(runtimeDirectory, "runtime-manifest.json");
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8"));

if (manifest.runtimeVersion !== "1.0.0") throw new Error("Unexpected runtime version");
if (manifest.qpdfVersion !== "12.4.1") throw new Error("Unexpected qpdf version");
if (manifest.emscriptenVersion !== "4.0.17") throw new Error("Unexpected Emscripten version");
if (`${JSON.stringify(manifest, null, 2)}\n` !== manifestBytes.toString("utf8")) {
  throw new Error("Runtime manifest formatting is not deterministic");
}

const sizes = [];
for (const [name, expected] of Object.entries(manifest.artifacts)) {
  const bytes = await readFile(resolve(runtimeDirectory, name));
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected.sha256 || bytes.byteLength !== expected.bytes) {
    throw new Error(`Runtime artifact mismatch: ${name}`);
  }
  sizes.push({
    artifact: name,
    raw: bytes.byteLength,
    gzip: gzipSync(bytes, { level: 9 }).byteLength,
    brotli: brotliCompressSync(bytes).byteLength,
    sha256: actual,
  });
}
sizes.push({
  artifact: "runtime-manifest.json",
  raw: manifestBytes.byteLength,
  gzip: gzipSync(manifestBytes, { level: 9 }).byteLength,
  brotli: brotliCompressSync(manifestBytes).byteLength,
  sha256: createHash("sha256").update(manifestBytes).digest("hex"),
});

console.log("PDF Reducer runtime manifest and artifact hashes verified.");
console.table(sizes);
