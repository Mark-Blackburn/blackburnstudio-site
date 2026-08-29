import { describe, expect, it } from "vitest";

import {
  calculateWatermarkPlacement,
  fitTextWatermarkFontPixels,
  imageWatermarkFitsAllOutputs,
  imageWatermarkFitsOutput,
  imageWatermarkPreviewSize,
  textWatermarkFontPixels,
  watermarkMarginPixels,
} from "@/components/tools/imageResizerWatermarkGeometry";
import type { ImageResizerWatermarkPosition } from "@/components/tools/imageResizerWorkerProtocol";

const expected: Record<ImageResizerWatermarkPosition, { left: number; top: number }> = {
  "top-left": { left: 20, top: 20 },
  "top-center": { left: 400, top: 20 },
  "top-right": { left: 780, top: 20 },
  "center-left": { left: 20, top: 225 },
  center: { left: 400, top: 225 },
  "center-right": { left: 780, top: 225 },
  "bottom-left": { left: 20, top: 430 },
  "bottom-center": { left: 400, top: 430 },
  "bottom-right": { left: 780, top: 430 },
};

describe("watermark preview geometry", () => {
  it.each(Object.entries(expected))(
    "places a watermark at %s",
    (position, placement) => {
      expect(
        calculateWatermarkPlacement(
          { width: 1000, height: 500 },
          { width: 200, height: 50 },
          position as ImageResizerWatermarkPosition,
          0.04,
        ),
      ).toEqual(placement);
    },
  );

  it.each([
    [1200, 600, 0.03, 18],
    [600, 1200, 0.03, 18],
    [800, 800, 0, 0],
    [800, 800, 0.25, 200],
  ])(
    "uses the shorter %sx%s edge for margin",
    (width, height, margin, expectedPixels) => {
      expect(watermarkMarginPixels(width, height, margin)).toBe(expectedPixels);
    },
  );

  it("sizes text from the shorter edge for landscape, portrait and square previews", () => {
    expect(textWatermarkFontPixels(1000, 500, 0.05)).toBe(25);
    expect(textWatermarkFontPixels(500, 1000, 0.05)).toBe(25);
    expect(textWatermarkFontPixels(800, 800, 0.05)).toBe(40);
  });

  it("sizes logos from preview width while preserving their aspect ratio", () => {
    expect(imageWatermarkPreviewSize(1000, 400, 200, 0.2)).toEqual({
      width: 200,
      height: 100,
    });
    expect(imageWatermarkPreviewSize(500, 200, 400, 0.2)).toEqual({
      width: 100,
      height: 200,
    });
  });

  it.each([
    [{ width: 1200, height: 600 }, { width: 400, height: 200 }],
    [{ width: 600, height: 1200 }, { width: 400, height: 200 }],
    [{ width: 800, height: 800 }, { width: 400, height: 200 }],
    [{ width: 1200, height: 600 }, { width: 800, height: 120 }],
    [{ width: 600, height: 1200 }, { width: 120, height: 800 }],
  ])("accepts fitting output/logo geometry %#", (output, source) => {
    expect(
      imageWatermarkFitsOutput(
        output,
        source,
        0.2,
        0.03,
        "bottom-right",
      ),
    ).toBe(true);
  });

  it("rejects a full-width logo with a nonzero right margin", () => {
    expect(
      imageWatermarkFitsOutput(
        { width: 1000, height: 600 },
        { width: 400, height: 200 },
        1,
        0.03,
        "bottom-right",
      ),
    ).toBe(false);
  });

  it("ignores edge margin on a centered axis", () => {
    expect(
      imageWatermarkFitsOutput(
        { width: 1000, height: 600 },
        { width: 400, height: 200 },
        1,
        0.25,
        "center",
      ),
    ).toBe(true);
  });

  it("fails a mixed batch when one portrait cannot contain a tall logo", () => {
    const outputs = [
      { width: 1200, height: 800 },
      { width: 500, height: 1000 },
    ];
    const logo = { width: 100, height: 300 };
    expect(
      imageWatermarkFitsAllOutputs(
        outputs,
        logo,
        0.4,
        0.03,
        "bottom-right",
      ),
    ).toBe(false);
    expect(
      imageWatermarkFitsAllOutputs(
        outputs,
        logo,
        0.2,
        0.03,
        "bottom-right",
      ),
    ).toBe(true);
  });

  it("uses the requested text size when it fits and reduces it when needed", () => {
    const measure = (fontSize: number) => ({
      width: fontSize * 10,
      height: fontSize,
    });
    expect(fitTextWatermarkFontPixels(20, 250, 40, measure)).toBe(20);
    const fitted = fitTextWatermarkFontPixels(40, 200, 40, measure);
    expect(fitted).toBeLessThan(40);
    expect(measure(fitted).width).toBeLessThanOrEqual(200.001);
  });
});
