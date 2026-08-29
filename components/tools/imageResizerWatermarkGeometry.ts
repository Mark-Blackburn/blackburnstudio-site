import type { ImageResizerWatermarkPosition } from "./imageResizerWorkerProtocol";

type WatermarkSize = {
  width: number;
  height: number;
};

export type WatermarkOutputSize = {
  width: number;
  height: number;
};

type TextMeasurement = WatermarkSize;

const FIT_TOLERANCE = 1e-7;

function roundHalfUp(value: number) {
  return Math.floor(value + 0.5);
}

function positionAxes(position: ImageResizerWatermarkPosition) {
  return {
    horizontal: position.endsWith("left")
      ? "left"
      : position.endsWith("right")
        ? "right"
        : "center",
    vertical: position.startsWith("top")
      ? "top"
      : position.startsWith("bottom")
        ? "bottom"
        : "center",
  } as const;
}

export function watermarkMarginPixels(
  previewWidth: number,
  previewHeight: number,
  margin: number,
) {
  return Math.min(previewWidth, previewHeight) * margin;
}

export function calculateWatermarkPlacement(
  preview: WatermarkSize,
  watermark: WatermarkSize,
  position: ImageResizerWatermarkPosition,
  margin: number,
) {
  const edgeSpacing = watermarkMarginPixels(
    preview.width,
    preview.height,
    margin,
  );
  const horizontal = position.split("-").at(-1);
  const vertical = position.split("-")[0];

  const left =
    horizontal === "left"
      ? edgeSpacing
      : horizontal === "right"
        ? preview.width - edgeSpacing - watermark.width
        : (preview.width - watermark.width) / 2;
  const top =
    vertical === "top"
      ? edgeSpacing
      : vertical === "bottom"
        ? preview.height - edgeSpacing - watermark.height
        : (preview.height - watermark.height) / 2;

  return { left, top };
}

export function imageWatermarkFitsOutput(
  output: WatermarkOutputSize,
  source: WatermarkSize,
  scale: number,
  margin: number,
  position: ImageResizerWatermarkPosition,
) {
  if (
    output.width <= 0 ||
    output.height <= 0 ||
    source.width <= 0 ||
    source.height <= 0
  ) {
    return false;
  }

  // These integer calculations mirror image_resizer.watermark exactly.
  const logoWidth = Math.max(1, roundHalfUp(output.width * scale));
  const logoHeight = Math.max(
    1,
    roundHalfUp((source.height * logoWidth) / source.width),
  );
  const marginPixels = roundHalfUp(
    Math.min(output.width, output.height) * margin,
  );
  const { horizontal, vertical } = positionAxes(position);
  const horizontalFits =
    horizontal === "center"
      ? logoWidth <= output.width
      : logoWidth + marginPixels <= output.width;
  const verticalFits =
    vertical === "center"
      ? logoHeight <= output.height
      : logoHeight + marginPixels <= output.height;

  return horizontalFits && verticalFits;
}

export function imageWatermarkFitsAllOutputs(
  outputs: WatermarkOutputSize[],
  source: WatermarkSize,
  scale: number,
  margin: number,
  position: ImageResizerWatermarkPosition,
) {
  return outputs.every((output) =>
    imageWatermarkFitsOutput(output, source, scale, margin, position),
  );
}

export function fitTextWatermarkFontPixels(
  requestedPixels: number,
  availableWidth: number,
  availableHeight: number,
  measure: (fontPixels: number) => TextMeasurement,
) {
  if (
    requestedPixels <= 0 ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    return 0;
  }

  const requestedMeasurement = measure(requestedPixels);
  if (
    requestedMeasurement.width <= availableWidth + FIT_TOLERANCE &&
    requestedMeasurement.height <= availableHeight + FIT_TOLERANCE
  ) {
    return requestedPixels;
  }

  let lower = 0;
  let upper = requestedPixels;
  for (let iteration = 0; iteration < 16; iteration += 1) {
    const candidate = (lower + upper) / 2;
    const measurement = measure(candidate);
    if (
      measurement.width <= availableWidth + FIT_TOLERANCE &&
      measurement.height <= availableHeight + FIT_TOLERANCE
    ) {
      lower = candidate;
    } else {
      upper = candidate;
    }
  }
  return lower;
}

export function textWatermarkFontPixels(
  previewWidth: number,
  previewHeight: number,
  size: number,
) {
  return Math.min(previewWidth, previewHeight) * size;
}

export function imageWatermarkPreviewSize(
  previewWidth: number,
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
) {
  const width = previewWidth * scale;
  return {
    width,
    height: sourceWidth > 0 ? (sourceHeight * width) / sourceWidth : 0,
  };
}
