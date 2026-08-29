import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ImageResizerWatermarkPreview from "@/components/tools/ImageResizerWatermarkPreview";

type ResizeCallback = (entries: ResizeObserverEntry[]) => void;

let resizeCallback: ResizeCallback | undefined;

class MockResizeObserver {
  constructor(callback: ResizeCallback) {
    resizeCallback = callback;
  }

  observe() {}
  disconnect() {}
  unobserve() {}
}

function resizeFrame(width: number, height: number) {
  act(() => {
    resizeCallback?.([
      { contentRect: { width, height } } as ResizeObserverEntry,
    ]);
  });
}

function textWatermark(text: string, size = 0.05) {
  return {
    type: "text" as const,
    text,
    position: "bottom-right" as const,
    opacity: 0.6,
    size,
    margin: 0.04,
    colour: "#FFFFFF",
  };
}

describe("ImageResizerWatermarkPreview text fitting", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resizeCallback = undefined;
  });

  it("keeps requested size for short text", () => {
    render(<ImageResizerWatermarkPreview watermark={textWatermark("Studio")} />);
    resizeFrame(1000, 500);

    expect(screen.getByText("Studio")).toHaveStyle({ fontSize: "25px" });
  });

  it("fits complete long text and positions from its fitted dimensions", () => {
    const text = "Blackburn Studio ".repeat(10).trim();
    render(
      <ImageResizerWatermarkPreview watermark={textWatermark(text, 0.2)} />,
    );
    resizeFrame(500, 300);

    const overlay = screen.getByText(text);
    const fontSize = Number.parseFloat(overlay.style.fontSize);
    const left = Number.parseFloat(overlay.style.left);
    const top = Number.parseFloat(overlay.style.top);
    const estimatedWidth = text.length * fontSize * 0.6;
    const estimatedHeight = fontSize;

    expect(fontSize).toBeLessThan(60);
    expect(estimatedWidth).toBeLessThanOrEqual(476.01);
    expect(estimatedHeight).toBeLessThanOrEqual(276.01);
    expect(left).toBeCloseTo(500 - 12 - estimatedWidth, 1);
    expect(top).toBeCloseTo(300 - 12 - estimatedHeight, 1);
    expect(overlay).not.toHaveClass("max-w-full");
  });

  it("recalculates fitted size when the frame changes", () => {
    const text = "A long watermark string that needs fitting";
    render(
      <ImageResizerWatermarkPreview watermark={textWatermark(text, 0.2)} />,
    );
    resizeFrame(800, 400);
    const overlay = screen.getByText(text);
    const wideFontSize = Number.parseFloat(overlay.style.fontSize);

    resizeFrame(320, 240);
    const narrowFontSize = Number.parseFloat(overlay.style.fontSize);

    expect(narrowFontSize).toBeLessThan(wideFontSize);
  });
});
