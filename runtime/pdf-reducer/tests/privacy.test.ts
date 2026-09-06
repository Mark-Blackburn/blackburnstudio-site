// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const foundationFiles = [
  "lib/pdf-reducer/runtime.ts",
  "lib/pdf-reducer/types.ts",
  "runtime/pdf-reducer/worker/pdf-reducer-worker.mjs",
];

const publicUiFiles = [
  "app/tools/pdf-reducer/page.tsx",
  "app/tools/pdf-reducer/app/page.tsx",
  "components/tools/PdfReducerApp.tsx",
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

  it("keeps PDF data out of API, analytics, and server upload paths", async () => {
    const source = (
      await Promise.all(publicUiFiles.map((path) => readFile(resolve(path), "utf8")))
    ).join("\n");
    expect(source).not.toMatch(/fetch\s*\(|XMLHttpRequest|sendBeacon|\/api\//);
    expect(source).not.toMatch(/analytics|trackEvent|gtag/i);
  });

  it("imports the runtime only from the dedicated client app", async () => {
    const sharedFiles = ["app/layout.tsx", "app/tools/page.tsx"];
    const sharedSource = (
      await Promise.all(sharedFiles.map((path) => readFile(resolve(path), "utf8")))
    ).join("\n");
    expect(sharedSource).not.toMatch(/@\/lib\/pdf-reducer/);
    const landingSource = await readFile(
      resolve("app/tools/pdf-reducer/page.tsx"),
      "utf8",
    );
    expect(landingSource).not.toMatch(/@\/lib\/pdf-reducer|PdfReducerRuntime/);
  });
});
