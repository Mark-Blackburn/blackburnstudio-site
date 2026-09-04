// @vitest-environment node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const runtimeDirectory = resolve("public/runtime/pdf-reducer/1.0.0");
const manifestPath = resolve(runtimeDirectory, "runtime-manifest.json");

describe("PDF Reducer production manifest", () => {
  it("pins versions, modes, deterministic formatting, hashes, and sizes", async () => {
    const manifestText = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestText);
    expect(manifestText).toBe(`${JSON.stringify(manifest, null, 2)}\n`);
    expect(manifest).toMatchObject({
      runtimeVersion: "1.0.0",
      qpdfVersion: "12.4.1",
      emscriptenVersion: "4.0.17",
      supportedModes: ["optimize", "reduce-images"],
    });
    expect(Object.keys(manifest.artifacts).sort()).toEqual([
      "THIRD_PARTY_NOTICES.md",
      "pdf-reducer-worker.mjs",
      "pdf-reducer.mjs",
      "pdf-reducer.wasm",
    ]);

    for (const [name, expected] of Object.entries<{
      sha256: string;
      bytes: number;
    }>(manifest.artifacts)) {
      const bytes = await readFile(resolve(runtimeDirectory, name));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        expected.sha256,
      );
      expect(bytes.byteLength).toBe(expected.bytes);
    }
  });
});
