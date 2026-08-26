import { describe, expect, it } from "vitest";

import {
  centeredCropRect,
  constrainCropRect,
  cropAspectForRatio,
  cropRectForZoom,
  minimumCoverScale,
  panCropRect,
  parseCustomCropAspect,
  resetCropPreview,
} from "@/components/tools/imageResizerCropGeometry";

function expectRectInBounds(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.width).toBeGreaterThan(0);
  expect(rect.height).toBeGreaterThan(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(1);
  expect(rect.y + rect.height).toBeLessThanOrEqual(1);
}

describe("image resizer crop geometry", () => {
  it("centers a square crop in a landscape source", () => {
    const rect = centeredCropRect(2400, 1600, { width: 1, height: 1 });
    expect(rect.x).toBeCloseTo(1 / 6, 12);
    expect(rect.y).toBe(0);
    expect(rect.width).toBeCloseTo(2 / 3, 12);
    expect(rect.height).toBe(1);
  });

  it("centers a square crop in a portrait source", () => {
    const rect = centeredCropRect(1600, 2400, { width: 1, height: 1 });
    expect(rect.x).toBe(0);
    expect(rect.y).toBeCloseTo(1 / 6, 12);
    expect(rect.width).toBe(1);
    expect(rect.height).toBeCloseTo(2 / 3, 12);
  });

  it.each([
    ["4:5", 4, 5],
    ["3:2", 3, 2],
    ["16:9", 16, 9],
  ] as const)("creates a centered %s crop", (ratio, width, height) => {
    const aspect = cropAspectForRatio(ratio, 2400, 1600)!;
    const rect = centeredCropRect(2400, 1600, aspect);
    expect((2400 * rect.width) / (1600 * rect.height)).toBeCloseTo(
      width / height,
      12,
    );
    expectRectInBounds(rect);
  });

  it("uses valid custom ratio proportions", () => {
    const aspect = cropAspectForRatio("custom", 2400, 1600, "7", "5")!;
    const rect = centeredCropRect(2400, 1600, aspect);
    expect((2400 * rect.width) / (1600 * rect.height)).toBeCloseTo(7 / 5, 12);
  });

  it("calculates the minimum scale required to cover the crop frame", () => {
    expect(minimumCoverScale(2400, 1600, 600, 600)).toBe(0.375);
    expect(minimumCoverScale(1600, 2400, 600, 600)).toBe(0.375);
  });

  it("constrains panning so no empty space can enter the crop frame", () => {
    const rect = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
    expect(panCropRect(rect, 10_000, -10_000, 500, 500)).toEqual({
      x: 0,
      y: 0.5,
      width: 0.5,
      height: 0.5,
    });
  });

  it("converts display drag translation into a normalized crop rectangle", () => {
    expect(
      panCropRect(
        { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
        100,
        -50,
        500,
        250,
      ),
    ).toEqual({ x: 0.15, y: 0.35, width: 0.5, height: 0.5 });
  });

  it("keeps normalized rectangles within source bounds", () => {
    expectRectInBounds(
      constrainCropRect({ x: -5, y: 8, width: 0.4, height: 0.3 }),
    );
    expectRectInBounds(
      cropRectForZoom({ x: 0, y: 0, width: 1, height: 1 }, 50, 1, 1),
    );
  });

  it("reset recenters and restores the minimum zoom", () => {
    const reset = resetCropPreview(2400, 1600, { width: 1, height: 1 });
    expect(reset.zoom).toBe(1);
    expect(reset.rect.x).toBeCloseTo(1 / 6, 12);
    expect(reset.rect.y).toBe(0);
    expect(reset.rect.width).toBeCloseTo(2 / 3, 12);
    expect(reset.rect.height).toBe(1);
  });

  it("changing ratio produces a centered crop for the new aspect", () => {
    const square = resetCropPreview(2400, 1600, { width: 1, height: 1 });
    const widescreen = resetCropPreview(2400, 1600, { width: 16, height: 9 });
    expect(square.rect.x).toBeGreaterThan(0);
    expect(widescreen.rect.y).toBeGreaterThan(0);
    expect(widescreen.rect.x).toBe(0);
  });

  it.each([
    ["", "1"],
    ["0", "1"],
    ["-1", "1"],
    ["NaN", "1"],
    ["Infinity", "1"],
    ["1", "0"],
    ["1001", "1"],
  ])("rejects invalid custom ratio %s:%s", (width, height) => {
    expect(parseCustomCropAspect(width, height)).toBeNull();
  });
});
