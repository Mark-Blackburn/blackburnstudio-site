import { describe, expect, it } from "vitest";

import {
  getPyodideRuntimeUrls,
  getSafeImageResizerBrowserRuntimeUrl,
  IMAGE_RESIZER_BROWSER_MANIFEST_URL,
  parseImageResizerBrowserManifest,
  PYODIDE_CDN_ORIGIN,
} from "@/lib/imageResizerRuntime";
import { TOOLS_DOWNLOADS_BASE_URL } from "@/lib/toolsConfig";

const browserRuntimeBase =
  `${TOOLS_DOWNLOADS_BASE_URL}/image-resizer/browser`;
const validBundleUrl =
  `${browserRuntimeBase}/v0.1.2/image-resizer-core-abc123.zip`;
const validManifest = {
  schemaVersion: 1,
  sourceVersion: "0.1.2",
  gitRevision: "64fae21710a3b0935cb7cbc056125065105942ca",
  bundleSha256:
    "1B8BBC58CFBD479DB99E25FC3DF73E974EA8B37E0DCC6CDB80E6CE12C78473C2",
  bundleSizeBytes: 5862,
  bundleUrl: validBundleUrl,
  manifestUrl: `${browserRuntimeBase}/v0.1.2/manifest.json`,
  checksumsUrl: `${browserRuntimeBase}/v0.1.2/SHA256SUMS.txt`,
  pyodideVersion: "0.28.3",
  pillowVersion: "11.3.0",
  generatedAt: "2026-08-24T00:36:10Z",
};

describe("getSafeImageResizerBrowserRuntimeUrl", () => {
  it("accepts a trusted browser runtime URL", () => {
    expect(getSafeImageResizerBrowserRuntimeUrl(validBundleUrl)).toBe(
      new URL(validBundleUrl).toString(),
    );
    expect(
      getSafeImageResizerBrowserRuntimeUrl(
        IMAGE_RESIZER_BROWSER_MANIFEST_URL,
      ),
    ).toBe(IMAGE_RESIZER_BROWSER_MANIFEST_URL);
  });

  it.each([
    ["another HTTPS origin", "https://downloads.example/runtime.zip"],
    [
      "a sibling Azure path",
      `${TOOLS_DOWNLOADS_BASE_URL}/image-resizer/latest/runtime.zip`,
    ],
    [
      "a similarly prefixed path",
      `${TOOLS_DOWNLOADS_BASE_URL}/image-resizer/browser-other/runtime.zip`,
    ],
    ["a JavaScript URL", "javascript:alert('runtime')"],
    ["a data URL", "data:text/javascript,alert(1)"],
    ["a malformed URL", "not a valid URL"],
  ])("rejects %s", (_label, value) => {
    expect(getSafeImageResizerBrowserRuntimeUrl(value)).toBeNull();
  });
});

describe("parseImageResizerBrowserManifest", () => {
  it("accepts and normalizes a valid schema 1 manifest", () => {
    expect(parseImageResizerBrowserManifest(validManifest)).toEqual({
      ...validManifest,
      bundleSha256: validManifest.bundleSha256.toLowerCase(),
      bundleUrl: new URL(validBundleUrl).toString(),
    });
  });

  it.each([
    ["an invalid schema", { schemaVersion: 2 }],
    ["a malformed SHA", { bundleSha256: "abc123" }],
    ["a zero size", { bundleSizeBytes: 0 }],
    ["a negative size", { bundleSizeBytes: -1 }],
    ["a fractional size", { bundleSizeBytes: 10.5 }],
    ["an unsafe bundle URL", { bundleUrl: "https://example.com/core.zip" }],
    ["an unsafe manifest URL", { manifestUrl: "https://example.com/manifest.json" }],
    [
      "an out-of-scope checksums URL",
      { checksumsUrl: `${TOOLS_DOWNLOADS_BASE_URL}/image-resizer/SHA256SUMS.txt` },
    ],
    ["an unsafe Pyodide version", { pyodideVersion: "../../latest" }],
    ["an invalid Pillow version", { pillowVersion: "latest" }],
  ])("rejects %s", (_label, override) => {
    expect(() =>
      parseImageResizerBrowserManifest({ ...validManifest, ...override }),
    ).toThrow();
  });
});

describe("getPyodideRuntimeUrls", () => {
  it("constructs the application-approved jsDelivr URL", () => {
    expect(getPyodideRuntimeUrls("0.28.3")).toEqual({
      indexUrl: `${PYODIDE_CDN_ORIGIN}/pyodide/v0.28.3/full/`,
      moduleUrl: `${PYODIDE_CDN_ORIGIN}/pyodide/v0.28.3/full/pyodide.mjs`,
    });
  });

  it("rejects a version that could alter the approved path", () => {
    expect(() => getPyodideRuntimeUrls("0.28.3/../../other")).toThrow();
  });
});