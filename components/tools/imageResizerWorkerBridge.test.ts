import { describe, expect, it } from "vitest";

import {
  capabilitiesFromPython,
  prepareWorkerWatermark,
} from "@/components/tools/imageResizerWorkerBridge";
import type { ImageResizerCapabilities } from "@/components/tools/imageResizerWorkerProtocol";

const v1Capabilities: ImageResizerCapabilities = {
  JPEG: true,
  PNG: true,
  WebP: true,
  watermark: false,
};
const v2Capabilities: ImageResizerCapabilities = {
  ...v1Capabilities,
  watermark: true,
};

describe("image resizer worker watermark bridge", () => {
  it("treats a missing v1 watermark capability as unavailable", () => {
    expect(
      capabilitiesFromPython({ JPEG: true, PNG: true, WebP: true }),
    ).toEqual(v1Capabilities);
  });

  it("exposes a detected v2 watermark capability", () => {
    expect(
      capabilitiesFromPython({
        JPEG: true,
        PNG: true,
        WebP: true,
        watermark: true,
      }),
    ).toEqual(v2Capabilities);
  });

  it("leaves no-watermark processing unchanged on v1", () => {
    expect(prepareWorkerWatermark(undefined, v1Capabilities)?.[0]).toBe(
      "none",
    );
  });

  it("fails capability preparation closed for watermark requests on v1", () => {
    expect(
      prepareWorkerWatermark(
        {
          type: "text",
          text: "Studio",
          position: "bottom-right",
          opacity: 0.5,
          size: 0.05,
          margin: 0.03,
          colour: "#FFFFFF",
        },
        v1Capabilities,
      ),
    ).toBeNull();
  });

  it("forwards text watermark settings on v2", () => {
    expect(
      prepareWorkerWatermark(
        {
          type: "text",
          text: "Studio",
          position: "center",
          opacity: 0.6,
          size: 0.08,
          margin: 0.02,
          colour: "#AABBCC",
        },
        v2Capabilities,
      ),
    ).toEqual([
      "text",
      "Studio",
      "center",
      0.6,
      0.08,
      0.02,
      "#AABBCC",
      null,
      0.2,
    ]);
  });

  it("forwards logo bytes without detaching or mutating the request buffer", () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const args = prepareWorkerWatermark(
      {
        type: "image",
        bytes,
        position: "top-left",
        opacity: 0.75,
        scale: 0.2,
        margin: 0.03,
      },
      v2Capabilities,
    );

    expect(args?.[0]).toBe("image");
    expect(args?.[7]).toBeInstanceOf(Uint8Array);
    expect(Array.from(args?.[7] as Uint8Array)).toEqual([1, 2, 3]);
    expect(bytes.byteLength).toBe(3);
  });
});
