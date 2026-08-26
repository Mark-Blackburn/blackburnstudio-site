"use client";

import { StudioButton } from "@/components/studio";

import ImageResizerCropPreview from "./ImageResizerCropPreview";
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
    <div className="mt-8 border-t border-studio-border/60 pt-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-studio-text">Crop editor</h3>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-studio-dim">
            Crop coordinates stay in this browser. Final output is produced by
            the shared Python and Pillow processor, not from this preview.
          </p>
        </div>
        {item ? (
          <div className="flex items-center gap-3" aria-label="Crop preview image navigation">
            <button
              type="button"
              onClick={onPrevious}
              disabled={disabled || position <= 1}
              className="min-h-11 rounded-lg border border-studio-border px-3 text-sm text-studio-text disabled:opacity-40"
            >
              Previous
            </button>
            <span className="min-w-16 text-center text-xs text-studio-dim" aria-live="polite">
              {position} / {total}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={disabled || position >= total}
              className="min-h-11 rounded-lg border border-studio-border px-3 text-sm text-studio-text disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      <fieldset className="mt-6" disabled={!item || disabled}>
        <legend className="text-sm font-medium text-studio-text">Mode</legend>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
          <label className="flex min-h-11 items-center gap-3 text-sm text-studio-muted">
            <input
              type="radio"
              name="image-resizer-crop-mode"
              checked={!item?.cropEnabled}
              onChange={() => onModeChange(false)}
              className="h-4 w-4 accent-white"
            />
            Resize only
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-studio-muted">
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

      {!item ? (
        <p className="mt-5 rounded-lg border border-studio-border/70 bg-studio-surface-soft/45 px-4 py-3 text-sm text-studio-dim">
          Add a readable image to start a crop preview.
        </p>
      ) : item.cropEnabled ? (
        <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(16rem,0.65fr)] xl:items-start">
          <div className="min-w-0">
            <p className="mb-3 truncate text-sm font-medium text-studio-text">
              {item.file.name}
            </p>
            <ImageResizerCropPreview
              key={item.id}
              file={item.file}
              sourceWidth={item.width}
              sourceHeight={item.height}
              rect={item.cropRect}
              disabled={disabled}
              onRectChange={onRectChange}
              onPreviewError={onPreviewError}
            />
            <p className="mt-3 text-xs leading-relaxed text-studio-dim">
              Drag with a mouse, pen or one finger. Arrow keys nudge the image;
              hold Shift for a larger step.
            </p>
            {item.cropPreviewError ? (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {item.cropPreviewError}
              </p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-6">
            <div>
              <label htmlFor="image-resizer-crop-ratio" className="text-sm font-medium text-studio-text">
                Crop ratio
              </label>
              <select
                id="image-resizer-crop-ratio"
                value={item.cropRatio}
                onChange={(event) => onRatioChange(event.target.value as CropRatio)}
                disabled={disabled}
                className="mt-2 min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55"
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
                      className="min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55"
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
                      className="min-h-11 w-full rounded-lg border border-studio-border bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-55"
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
              className="grid grid-cols-3 gap-3 rounded-lg border border-studio-border/70 bg-studio-surface-soft/45 p-4 text-xs"
            >
              <div>
                <dt className="text-studio-dim">Source</dt>
                <dd className="mt-1 text-studio-text">{item.width} × {item.height}</dd>
              </div>
              <div>
                <dt className="text-studio-dim">Crop</dt>
                <dd className="mt-1 text-studio-text">
                  {item.cropPrediction ? `${item.cropPrediction.cropWidth} × ${item.cropPrediction.cropHeight}` : "…"}
                </dd>
              </div>
              <div>
                <dt className="text-studio-dim">Output</dt>
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
        </div>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-studio-dim">
          This image will use the existing resize-only workflow.
        </p>
      )}
    </div>
  );
}
