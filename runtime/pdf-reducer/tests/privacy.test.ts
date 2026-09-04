// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const foundationFiles = [
  "lib/pdf-reducer/runtime.ts",
  "lib/pdf-reducer/types.ts",
  "runtime/pdf-reducer/worker/pdf-reducer-worker.mjs",
];

describe("PDF Reducer privacy and isolation", () => {
  it("contains no PDF upload, API, analytics, or document-byte network path", async () => {
    const source = (
      await Promise.all(
        foundationFiles.map((path) => readFile(resolve(path), "utf8")),
      )
    ).join("\n");
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest|sendBeacon|\/api\/|analytics/i);
    expect(source).not.toMatch(/fileName|documentMetadata|extractedText/);
  });

  it("does not add a PDF route or import the runtime from shared application code", async () => {
    await expect(
      readFile(resolve("app/tools/pdf-reducer/page.tsx"), "utf8"),
    ).rejects.toThrow();
    const sharedFiles = ["app/layout.tsx", "app/tools/page.tsx"];
    const sharedSource = (
      await Promise.all(sharedFiles.map((path) => readFile(resolve(path), "utf8")))
    ).join("\n");
    expect(sharedSource).not.toMatch(/pdf-reducer|PdfReducer/);
  });
});
