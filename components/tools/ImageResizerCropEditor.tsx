"use client";

import type { ReactNode } from "react";

import { StudioButton } from "@/components/studio";

import ImageResizerCropPreview from "./ImageResizerCropPreview";
import type { ImageResizerWatermarkPreviewSettings } from "./ImageResizerWatermarkPreview";
import {
  MAX_CROP_ZOOM,
  MIN_CROP_ZOOM,
  parseCustomCropAspect,
  type CropRatio,
  type CropRect,
} from "./imageResizerCropGeometry";

type CropPrediction = {
  cropWidth: number;
  cropHeight: number;
  outputWidth: number;
  outputHeight: number;
};

export type CropEditorItem = {
  id: string;
  file: File;
  width: number;
  height: number;
  cropEnabled: boolean;
  cropRatio: CropRatio;
  cropCustomWidth: string;
  cropCustomHeight: string;
  cropRect: CropRect;
  cropZoom: number;
  cropPrediction?: CropPrediction;
  cropPredictionError?: string;
  cropPreviewError?: string;
};

type ImageResizerCropEditorProps = {
  item?: CropEditorItem;
  position: number;
  total: number;
  disabled: boolean;
  watermark?: ImageResizerWatermarkPreviewSettings;
  watermarkSupported: boolean;
  watermarkEnabled: boolean;
  watermarkControls: ReactNode;
  onWatermarkEnabledChange: (enabled: boolean) => void;
  onModeChange: (enabled: boolean) => void;
  onRatioChange: (ratio: CropRatio) => void;
  onCustomRatioChange: (dimension: "width" | "height", value: string) => void;
  onZoomChange: (zoom: number) => void;
  onRectChange: (rect: CropRect) => void;
  onReset: () => void;
  onApplyRatioToAll: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPreviewError: (message?: string) => void;
};

const RATIOS: Array<{ value: CropRatio; label: string }> = [
  { value: "original", label: "Original" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "3:2", label: "3:2" },
  { value: "16:9", label: "16:9" },
  { value: "custom", label: "Custom" },
];

export default function ImageResizerCropEditor({
  item,
  position,
  total,
  disabled,
  watermark,
  watermarkSupported,
  watermarkEnabled,
  watermarkControls,
  onWatermarkEnabledChange,
  onModeChange,
  onRatioChange,
  onCustomRatioChange,
  onZoomChange,
  onRectChange,
  onReset,
  onApplyRatioToAll,
  onPrevious,
  onNext,
  onPreviewError,
}: ImageResizerCropEditorProps) {
  const customRatioValid = item
    ? parseCustomCropAspect(item.cropCustomWidth, item.cropCustomHeight) !== null
    : true;

  return (
    <div className="mt-8 border-t border-white/10 pt-7">
      <div>
        <h3 id="image-resizer-crop-editor-heading" className="text-lg font-medium text-studio-text">Image preview</h3>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-studio-muted">
          {item?.cropEnabled
            ? "Drag the image to reposition it, then use Zoom to adjust the framing."
            : "Review the selected image before processing."}
        </p>
      </div>

      {item ? (
        <div
          className="mt-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-studio-surface-raised p-3 shadow-inner shadow-black/15"
          aria-label="Crop preview image navigation"
        >
          <button
            type="button"
            onClick={onPrevious}
            disabled={disabled || position <= 1}
            className="min-h-11 rounded-lg border border-white/15 bg-studio-surface-soft px-3 text-sm font-medium text-studio-text transition hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Previous
          </button>
          <div className="min-w-0 text-center" aria-live="polite">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-studio-dim">
              Previewing image {position} of {total}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-studio-text">
              {item.file.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={disabled || position >= total}
            className="min-h-11 rounded-lg border border-white/15 bg-studio-surface-soft px-3 text-sm font-medium text-studio-text transition hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Next
          </button>
        </div>
      ) : null}

      <div className="mt-6">
        <p className="text-sm font-medium text-studio-text">Mode</p>
        <div
          data-editing-controls
          className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3"
        >
          <fieldset className="min-w-0" disabled={!item || disabled}>
            <legend className="sr-only">Resize mode</legend>
            <div className="flex flex-wrap gap-x-3 gap-y-3">
              <label className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition ${!item?.cropEnabled ? "bg-studio-surface-raised text-studio-text ring-1 ring-white/10" : "text-studio-muted"}`}>
                <input
                  type="radio"
                  name="image-resizer-crop-mode"
                  checked={!item?.cropEnabled}
                  onChange={() => onModeChange(false)}
                  className="h-4 w-4 accent-white"
                />
                Resize only
              </label>
              <label className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition ${item?.cropEnabled ? "bg-studio-surface-raised text-studio-text ring-1 ring-white/10" : "text-studio-muted"}`}>
                <input
                  type="radio"
                  name="image-resizer-crop-mode"
                  checked={item?.cropEnabled === true}
                  onChange={() => onModeChange(true)}
                  className="h-4 w-4 accent-white"
                />
                Crop &amp; resize
              </label>
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-studio-text sm:border-l sm:border-white/10 sm:pl-6">
            <input
              type="checkbox"
              checked={watermarkEnabled}
              onChange={(event) => onWatermarkEnabledChange(event.target.checked)}
              aria-describedby={!watermarkSupported ? "image-resizer-watermark-unavailable" : undefined}
              disabled={!watermarkSupported || disabled}
              className="h-4 w-4 accent-white disabled:opacity-45"
            />
            Watermark all images
          </label>
        </div>
        {!watermarkSupported ? (
          <p id="image-resizer-watermark-unavailable" className="mt-3 max-w-[65ch] text-sm leading-relaxed text-studio-muted">
            Watermarking will be available when the updated browser processor is loaded.
          </p>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="Image and watermark editing workspace"
        data-layout={watermarkEnabled ? "watermark-sidebar" : "full-width"}
        className={`mt-6 grid min-w-0 grid-cols-1 gap-8 ${watermarkEnabled ? "lg:grid-cols-[minmax(0,1fr)_minmax(22rem,24rem)]" : ""}`}
      >
        <div data-image-crop-column className="min-w-0">
          {!item ? (
            <p className="rounded-lg bg-studio-surface-raised px-4 py-3 text-sm text-studio-muted">
              Add a readable image to start a preview.
            </p>
          ) : (
            <div
              data-sticky-preview
              className={watermarkEnabled ? "min-w-0 lg:sticky lg:top-6 lg:z-10 lg:self-start lg:bg-studio-surface-soft lg:pb-4" : "min-w-0"}
            >
              <ImageResizerCropPreview
                key={item.id}
                file={item.file}
                sourceWidth={item.width}
                sourceHeight={item.height}
                rect={
                  item.cropEnabled
                    ? item.cropRect
                    : { x: 0, y: 0, width: 1, height: 1 }
                }
                interactive={item.cropEnabled}
                disabled={disabled}
                constrainDesktopHeight={watermarkEnabled}
                watermark={watermark}
                onRectChange={onRectChange}
                onPreviewError={onPreviewError}
              />
              {item.cropEnabled ? (
                <p className="mt-3 text-xs leading-relaxed text-studio-muted">
                  Drag with a mouse, pen or one finger. Arrow keys nudge the image;
                  hold Shift for a larger step.
                </p>
              ) : null}
              {item.cropPreviewError ? (
                <p role="alert" className="mt-3 text-sm text-red-300">
                  {item.cropPreviewError}
                </p>
              ) : null}
            </div>
          )}
          {item?.cropEnabled ? (
          <div className="mt-8 min-w-0 space-y-6 rounded-xl bg-studio-surface-raised p-4 sm:p-5">
            <div>
              <label htmlFor="image-resizer-crop-ratio" className="text-sm font-medium text-studio-text">
                Crop ratio
              </label>
              <select
                id="image-resizer-crop-ratio"
                value={item.cropRatio}
                onChange={(event) => onRatioChange(event.target.value as CropRatio)}
                disabled={disabled}
                className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-studio-surface-soft px-3 py-2 text-sm text-studio-text shadow-inner shadow-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {RATIOS.map((ratio) => (
                  <option key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onApplyRatioToAll}
                disabled={disabled || total < 2 || !customRatioValid}
                className="mt-3 min-h-11 text-left text-sm text-studio-muted underline decoration-studio-border underline-offset-4 disabled:opacity-40"
              >
                Apply ratio to all
              </button>
            </div>

            {item.cropRatio === "custom" ? (
              <fieldset>
                <legend className="text-sm font-medium text-studio-text">Custom ratio</legend>
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <label>
                    <span className="sr-only">Custom ratio width</span>
                    <input
                      type="number"
                      min="0.01"
                      max="1000"
                      step="any"
                      inputMode="decimal"
                      value={item.cropCustomWidth}
                      onChange={(event) => onCustomRatioChange("width", event.target.value)}
                      aria-invalid={!customRatioValid}
                      disabled={disabled}
                      className="min-h-11 w-full rounded-lg border border-white/20 bg-studio-surface-soft px-3 py-2 text-sm text-studio-text shadow-inner shadow-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>
                  <span aria-hidden="true" className="text-studio-dim">:</span>
                  <label>
                    <span className="sr-only">Custom ratio height</span>
                    <input
                      type="number"
                      min="0.01"
                      max="1000"
                      step="any"
                      inputMode="decimal"
                      value={item.cropCustomHeight}
                      onChange={(event) => onCustomRatioChange("height", event.target.value)}
                      aria-invalid={!customRatioValid}
                      disabled={disabled}
                      className="min-h-11 w-full rounded-lg border border-white/20 bg-studio-surface-soft px-3 py-2 text-sm text-studio-text shadow-inner shadow-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>
                </div>
                {!customRatioValid ? (
                  <p className="mt-2 text-xs text-red-300">
                    Enter positive finite values up to 1000.
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            <div>
              <label htmlFor="image-resizer-crop-zoom" className="flex justify-between gap-4 text-sm font-medium text-studio-text">
                <span>Zoom</span>
                <span>{item.cropZoom.toFixed(2)}×</span>
              </label>
              <input
                id="image-resizer-crop-zoom"
                type="range"
                min={MIN_CROP_ZOOM}
                max={MAX_CROP_ZOOM}
                step="0.01"
                value={item.cropZoom}
                aria-valuetext={`${item.cropZoom.toFixed(2)} times`}
                onChange={(event) => onZoomChange(Number(event.target.value))}
                disabled={disabled || !customRatioValid}
                className="mt-3 w-full accent-white disabled:opacity-55"
              />
              <div className="mt-3">
                <StudioButton type="button" variant="secondary" onClick={onReset} disabled={disabled || !customRatioValid}>
                  Reset crop
                </StudioButton>
              </div>
            </div>

            <dl
              aria-live="polite"
              aria-busy={!item.cropPrediction && !item.cropPredictionError}
              className="grid grid-cols-3 gap-3 rounded-lg bg-studio-surface-soft p-4 text-xs shadow-inner shadow-black/15"
            >
              <div>
                <dt className="text-studio-muted">Source</dt>
                <dd className="mt-1 text-studio-text">{item.width} × {item.height}</dd>
              </div>
              <div>
                <dt className="text-studio-muted">Crop</dt>
                <dd className="mt-1 text-studio-text">
                  {item.cropPrediction ? `${item.cropPrediction.cropWidth} × ${item.cropPrediction.cropHeight}` : "…"}
                </dd>
              </div>
              <div>
                <dt className="text-studio-muted">Output</dt>
                <dd className="mt-1 text-studio-text">
                  {item.cropPrediction ? `${item.cropPrediction.outputWidth} × ${item.cropPrediction.outputHeight}` : "…"}
                </dd>
              </div>
            </dl>
            {item.cropPredictionError ? (
              <p role="alert" className="text-sm text-red-300">
                {item.cropPredictionError}
              </p>
            ) : null}
          </div>
          ) : null}
        </div>

        {watermarkEnabled ? (
          <div
            data-watermark-sidebar
            className={`min-w-0 lg:self-start ${item ? "lg:pb-32" : ""}`}
          >
            {watermarkControls}
          </div>
        ) : null}
      </div>
    </div>
  );
}
