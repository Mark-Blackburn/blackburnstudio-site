"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import {
  nudgeCropRect,
  panCropRect,
  type CropRect,
} from "./imageResizerCropGeometry";

type ImageResizerCropPreviewProps = {
  file: File;
  sourceWidth: number;
  sourceHeight: number;
  rect: CropRect;
  disabled: boolean;
  onRectChange: (rect: CropRect) => void;
  onPreviewError: (message?: string) => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  rect: CropRect;
};

export default function ImageResizerCropPreview({
  file,
  sourceWidth,
  sourceHeight,
  rect,
  disabled,
  onRectChange,
  onPreviewError,
}: ImageResizerCropPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [previewUrl] = useState(() => URL.createObjectURL(file));
  const [previewReady, setPreviewReady] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const frameAspect =
    (sourceWidth * rect.width) / (sourceHeight * rect.height);
  const imageStyle = {
    imageOrientation: "from-image",
    left: `${(-rect.x / rect.width) * 100}%`,
    top: `${(-rect.y / rect.height) * 100}%`,
    width: `${100 / rect.width}%`,
    maxWidth: "none",
  } as const;

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (disabled || !previewReady || !frameRef.current) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic or already-cancelled pointers may not be capturable.
    }
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame || drag.pointerId !== event.pointerId) return;
    const bounds = frame.getBoundingClientRect();
    onRectChange(
      panCropRect(
        drag.rect,
        event.clientX - drag.startX,
        event.clientY - drag.startY,
        bounds.width,
        bounds.height,
      ),
    );
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The browser may already have released capture after cancellation.
    }
  }

  return (
    <div
      ref={frameRef}
      tabIndex={disabled ? -1 : 0}
      aria-label={`Interactive crop preview for ${file.name}. Drag to reposition. Use arrow keys to nudge the image.`}
      onKeyDown={(event) => {
        const direction = {
          ArrowLeft: "left",
          ArrowRight: "right",
          ArrowUp: "up",
          ArrowDown: "down",
        }[event.key] as "left" | "right" | "up" | "down" | undefined;
        if (!direction || disabled || !previewReady) return;
        event.preventDefault();
        onRectChange(nudgeCropRect(rect, direction, event.shiftKey ? 5 : 1));
      }}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative mx-auto w-full max-w-3xl touch-none select-none overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      style={{ aspectRatio: frameAspect }}
    >
      {previewUrl ? (
        // A native image keeps preview decoding lightweight. The final crop is
        // always produced by Pillow in the worker, never from this preview.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget;
            const dimensionsMatch =
              image.naturalWidth === sourceWidth &&
              image.naturalHeight === sourceHeight;
            setPreviewReady(dimensionsMatch);
            setPreviewFailed(!dimensionsMatch);
            onPreviewError(
              dimensionsMatch
                ? undefined
                : "This browser did not decode the preview in the image’s orientation-corrected coordinate system.",
            );
          }}
          onError={() => {
            setPreviewReady(false);
            setPreviewFailed(true);
            onPreviewError("This image could not be decoded for crop preview.");
          }}
          className="pointer-events-none absolute block h-auto max-w-none"
          style={imageStyle}
        />
      ) : null}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 border border-white/55 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.4)]"
      />
      {!previewReady ? (
        <div className="absolute inset-0 grid place-items-center bg-black/70 px-6 text-center text-sm text-studio-muted">
          {previewFailed
            ? "Crop preview unavailable."
            : "Preparing orientation-corrected preview…"}
        </div>
      ) : null}
    </div>
  );
}
