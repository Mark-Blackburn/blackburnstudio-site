import { describe, expect, it } from "vitest";

import {
  getSafeToolDownloadUrl,
  TOOLS_DOWNLOADS_BASE_URL,
} from "@/lib/toolsConfig";

const validDownloadUrl = `${TOOLS_DOWNLOADS_BASE_URL}/image-resizer/latest/setup.exe`;

describe("getSafeToolDownloadUrl", () => {
  it("returns normalized trusted Image Resizer download URLs", () => {
    expect(getSafeToolDownloadUrl(validDownloadUrl)).toBe(
      new URL(validDownloadUrl).toString(),
    );
  });

  it.each([
    ["non-string input", null],
    ["javascript URL", "javascript:alert('download')"],
    ["another HTTPS host", "https://downloads.example/image-resizer.exe"],
    ["malformed URL", "not a valid URL"],
    [
      "non-HTTPS URL",
      "http://blackburnstudiodl01.blob.core.windows.net/downloads/image-resizer/setup.exe",
    ],
    [
      "path outside Image Resizer downloads",
      `${TOOLS_DOWNLOADS_BASE_URL}/other-tool/setup.exe`,
    ],
  ])("rejects %s", (_label, value) => {
    expect(getSafeToolDownloadUrl(value)).toBeNull();
  });
});
