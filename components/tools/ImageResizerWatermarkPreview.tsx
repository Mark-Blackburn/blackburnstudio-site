"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  calculateWatermarkPlacement,
  fitTextWatermarkFontPixels,
  imageWatermarkPreviewSize,
  textWatermarkFontPixels,
  watermarkMarginPixels,
} from "./imageResizerWatermarkGeometry";
import type { ImageResizerWatermarkPosition } from "./imageResizerWorkerProtocol";

export type ImageResizerWatermarkPreviewSettings =
  | {
      type: "text";
      text: string;
      position: ImageResizerWatermarkPosition;
      opacity: number;
      size: number;
      margin: number;
      colour: string;
    }
  | {
      type: "image";
      previewUrl: string;
      sourceWidth: number;
      sourceHeight: number;
      position: ImageResizerWatermarkPosition;
      opacity: number;
      scale: number;
      margin: number;
    };

type Size = { width: number; height: number };

type ImageResizerWatermarkPreviewProps = {
  watermark?: ImageResizerWatermarkPreviewSettings;
};

export default function ImageResizerWatermarkPreview({
  watermark,
}: ImageResizerWatermarkPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setFrameSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const fittedText = useMemo(() => {
    if (watermark?.type !== "text" || !watermark.text.trim()) {
      return { width: 0, height: 0, fontSize: 0 };
    }

    const requested = textWatermarkFontPixels(
      frameSize.width,
      frameSize.height,
      watermark.size,
    );
    const margin = watermarkMarginPixels(
      frameSize.width,
      frameSize.height,
      watermark.margin,
    );
    const availableWidth = frameSize.width - 2 * margin;
    const availableHeight = frameSize.height - 2 * margin;
    let canvas: HTMLCanvasElement | undefined;
    const measure = (fontSize: number) => {
      if (
        typeof document === "undefined" ||
        typeof navigator === "undefined" ||
        navigator.userAgent.includes("jsdom")
      ) {
        return {
          width: watermark.text.length * fontSize * 0.6,
          height: fontSize,
        };
      }
      canvas ??= document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        return {
          width: watermark.text.length * fontSize * 0.6,
          height: fontSize,
        };
      }
      context.font = `400 ${fontSize}px sans-serif`;
      const metrics = context.measureText(watermark.text);
      return {
        width: metrics.width,
        height:
          metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
          fontSize,
      };
    };
    const fontSize = fitTextWatermarkFontPixels(
      requested,
      availableWidth,
      availableHeight,
      measure,
    );
    const measured = measure(fontSize);
    return { ...measured, fontSize };
  }, [frameSize.height, frameSize.width, watermark]);

  let content = null;
  if (watermark?.type === "text" && watermark.text.trim()) {
    const placement = calculateWatermarkPlacement(
      frameSize,
      fittedText,
      watermark.position,
      watermark.margin,
    );
    content = (
      <span
        data-watermark-preview="text"
        className="absolute block whitespace-nowrap font-sans leading-none"
        style={{
          left: placement.left,
          top: placement.top,
          color: watermark.colour,
          fontSize: fittedText.fontSize,
          opacity: watermark.opacity,
        }}
      >
        {watermark.text}
      </span>
    );
  } else if (
    watermark?.type === "image" &&
    watermark.previewUrl &&
    watermark.sourceWidth > 0 &&
    watermark.sourceHeight > 0
  ) {
    const size = imageWatermarkPreviewSize(
      frameSize.width,
      watermark.sourceWidth,
      watermark.sourceHeight,
      watermark.scale,
    );
    const placement = calculateWatermarkPlacement(
      frameSize,
      size,
      watermark.position,
      watermark.margin,
    );
    content = (
      // The browser image is guidance only; Pillow creates final output pixels.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        data-watermark-preview="image"
        src={watermark.previewUrl}
        alt=""
        className="absolute h-auto max-w-none"
        style={{
          left: placement.left,
          top: placement.top,
          width: size.width,
          opacity: watermark.opacity,
        }}
      />
    );
  }

  return (
    <div
      ref={frameRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {content}
    </div>
  );
}
