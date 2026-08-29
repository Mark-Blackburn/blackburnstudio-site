"use client";

import type { ChangeEvent } from "react";

import {
  IMAGE_RESIZER_WATERMARK_POSITIONS,
  type ImageResizerWatermarkPosition,
} from "./imageResizerWorkerProtocol";

export type WatermarkType = "text" | "image";

export type WatermarkSettings = {
  type: WatermarkType;
  text: string;
  position: ImageResizerWatermarkPosition;
  opacity: number;
  textSize: number;
  imageScale: number;
  margin: number;
  colour: string;
};

type ImageResizerWatermarkControlsProps = {
  supported: boolean;
  enabled: boolean;
  settings: WatermarkSettings;
  imageFile?: File;
  imagePreviewUrl?: string;
  imageError?: string;
  imageFitError?: string;
  disabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onSettingsChange: (settings: Partial<WatermarkSettings>) => void;
  onImageChange: (file?: File) => void;
  onImageLoad: (previewUrl: string, width: number, height: number) => void;
  onImageError: (previewUrl: string) => void;
};

const POSITION_LABELS: Record<ImageResizerWatermarkPosition, string> = {
  "top-left": "Top left",
  "top-center": "Top centre",
  "top-right": "Top right",
  "center-left": "Centre left",
  center: "Centre",
  "center-right": "Centre right",
  "bottom-left": "Bottom left",
  "bottom-center": "Bottom centre",
  "bottom-right": "Bottom right",
};

function percent(value: number) {
  return Math.round(value * 100);
}

export default function ImageResizerWatermarkControls({
  supported,
  enabled,
  settings,
  imageFile,
  imagePreviewUrl,
  imageError,
  imageFitError,
  disabled,
  onEnabledChange,
  onSettingsChange,
  onImageChange,
  onImageLoad,
  onImageError,
}: ImageResizerWatermarkControlsProps) {
  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    onImageChange(event.target.files?.[0]);
    event.target.value = "";
  }

  return (
    <section aria-labelledby="image-resizer-watermark-heading" className="mt-8 border-t border-white/10 pt-7">
      <div>
        <h3 id="image-resizer-watermark-heading" className="text-lg font-medium text-studio-text">
          Watermark <span className="text-sm font-normal text-studio-dim">Optional</span>
        </h3>
        {!supported ? (
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-studio-muted">
            Watermarking will be available when the updated browser processor is loaded.
          </p>
        ) : null}
      </div>

      <label className="mt-5 flex w-fit min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-studio-text">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          disabled={!supported || disabled}
          className="h-4 w-4 accent-white disabled:opacity-45"
        />
        Add watermark
      </label>

      {supported && enabled ? (
        <div className="mt-5 rounded-xl bg-studio-surface-raised p-4 sm:p-5">
          <fieldset disabled={disabled}>
            <legend className="text-sm font-medium text-studio-text">Watermark type</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {(["text", "image"] as const).map((type) => (
                <label key={type} className={`flex min-h-11 items-center gap-3 rounded-lg px-4 text-sm transition ${settings.type === type ? "bg-studio-surface-soft text-studio-text ring-1 ring-white/20" : "text-studio-muted"}`}>
                  <input
                    type="radio"
                    name="image-resizer-watermark-type"
                    checked={settings.type === type}
                    onChange={() => onSettingsChange({ type })}
                    className="h-4 w-4 accent-white"
                  />
                  {type === "text" ? "Text" : "Logo / image"}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {settings.type === "text" ? (
              <>
                <div>
                  <label htmlFor="image-resizer-watermark-text" className="text-sm font-medium text-studio-text">Watermark text</label>
                  <input
                    id="image-resizer-watermark-text"
                    value={settings.text}
                    maxLength={200}
                    onChange={(event) => onSettingsChange({ text: event.target.value })}
                    aria-invalid={!settings.text.trim()}
                    aria-describedby={!settings.text.trim() ? "image-resizer-watermark-text-error" : undefined}
                    disabled={disabled}
                    className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-studio-surface-soft px-3 py-2 text-sm text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50"
                  />
                  {!settings.text.trim() ? <p id="image-resizer-watermark-text-error" className="mt-2 text-xs text-red-300">Enter watermark text.</p> : null}
                </div>
                <div>
                  <label htmlFor="image-resizer-watermark-colour" className="text-sm font-medium text-studio-text">Colour</label>
                  <input
                    id="image-resizer-watermark-colour"
                    type="color"
                    value={settings.colour}
                    onChange={(event) => onSettingsChange({ colour: event.target.value.toUpperCase() })}
                    disabled={disabled}
                    className="mt-2 block h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-studio-surface-soft p-1 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="image-resizer-watermark-size" className="flex justify-between gap-4 text-sm font-medium text-studio-text"><span>Text size</span><span>{percent(settings.textSize)}%</span></label>
                  <input id="image-resizer-watermark-size" type="range" min="0.01" max="0.25" step="0.01" value={settings.textSize} aria-valuetext={`${percent(settings.textSize)} percent`} onChange={(event) => onSettingsChange({ textSize: Number(event.target.value) })} disabled={disabled} className="mt-3 w-full accent-white disabled:opacity-55" />
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <label htmlFor="image-resizer-watermark-image" className="text-sm font-medium text-studio-text">Logo image</label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label htmlFor="image-resizer-watermark-image" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-white/20 px-4 text-sm font-medium text-studio-text transition hover:border-white/40 focus-within:ring-2 focus-within:ring-white/70">
                    {imageFile ? "Replace logo" : "Choose logo"}
                    <input id="image-resizer-watermark-image" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={selectImage} aria-invalid={Boolean(imageError)} aria-describedby={imageError ? "image-resizer-watermark-image-error" : undefined} disabled={disabled} className="sr-only" />
                  </label>
                  {imageFile ? <span className="max-w-full truncate text-sm text-studio-muted">{imageFile.name}</span> : null}
                  {imageFile ? <button type="button" onClick={() => onImageChange(undefined)} disabled={disabled} className="min-h-11 text-sm text-studio-muted underline decoration-studio-border underline-offset-4 disabled:opacity-45">Remove logo</button> : null}
                </div>
                {imagePreviewUrl ? (
                  // This small decode check also confirms the preview can render.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={imagePreviewUrl}
                    src={imagePreviewUrl}
                    alt="Selected watermark logo preview"
                    onLoad={(event) => onImageLoad(imagePreviewUrl, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
                    onError={() => onImageError(imagePreviewUrl)}
                    className="mt-3 max-h-20 max-w-48 rounded-lg bg-black/30 p-2 object-contain"
                  />
                ) : null}
                {imageError ? <p id="image-resizer-watermark-image-error" role="alert" className="mt-2 text-sm text-red-300">{imageError}</p> : null}
                {imageFitError ? <p id="image-resizer-watermark-fit-error" role="alert" className="mt-2 text-sm text-red-300">{imageFitError}</p> : null}
                <div className="mt-5">
                  <label htmlFor="image-resizer-watermark-scale" className="flex justify-between gap-4 text-sm font-medium text-studio-text"><span>Logo scale</span><span>{percent(settings.imageScale)}%</span></label>
                  <input id="image-resizer-watermark-scale" type="range" min="0.01" max="1" step="0.01" value={settings.imageScale} aria-valuetext={`${percent(settings.imageScale)} percent`} onChange={(event) => onSettingsChange({ imageScale: Number(event.target.value) })} disabled={disabled} className="mt-3 w-full accent-white disabled:opacity-55" />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="image-resizer-watermark-opacity" className="flex justify-between gap-4 text-sm font-medium text-studio-text"><span>Opacity</span><span>{percent(settings.opacity)}%</span></label>
              <input id="image-resizer-watermark-opacity" type="range" min="0.01" max="1" step="0.01" value={settings.opacity} aria-valuetext={`${percent(settings.opacity)} percent`} onChange={(event) => onSettingsChange({ opacity: Number(event.target.value) })} disabled={disabled} className="mt-3 w-full accent-white disabled:opacity-55" />
            </div>
            <div>
              <label htmlFor="image-resizer-watermark-margin" className="flex justify-between gap-4 text-sm font-medium text-studio-text"><span>Edge spacing</span><span>{percent(settings.margin)}%</span></label>
              <input id="image-resizer-watermark-margin" type="range" min="0" max="0.25" step="0.01" value={settings.margin} aria-valuetext={`${percent(settings.margin)} percent`} onChange={(event) => onSettingsChange({ margin: Number(event.target.value) })} disabled={disabled} className="mt-3 w-full accent-white disabled:opacity-55" />
            </div>
          </div>

          <fieldset className="mt-6" disabled={disabled}>
            <legend className="text-sm font-medium text-studio-text">Position</legend>
            <div className="mt-3 grid w-fit grid-cols-3 gap-2" role="group" aria-label="Watermark position">
              {IMAGE_RESIZER_WATERMARK_POSITIONS.map((position) => (
                <button
                  key={position}
                  type="button"
                  aria-label={POSITION_LABELS[position]}
                  aria-pressed={settings.position === position}
                  onClick={() => onSettingsChange({ position })}
                  className={`grid h-11 w-11 place-items-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${settings.position === position ? "border-studio-text bg-studio-text text-studio-base" : "border-white/20 bg-studio-surface-soft text-studio-muted hover:border-white/40"}`}
                >
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}
    </section>
  );
}
