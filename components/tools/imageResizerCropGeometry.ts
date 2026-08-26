export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropRatio =
  | "original"
  | "1:1"
  | "4:5"
  | "3:2"
  | "16:9"
  | "custom";

export type CropAspect = {
  width: number;
  height: number;
};

export type CropPreviewState = {
  rect: CropRect;
  zoom: number;
};

export const MIN_CROP_ZOOM = 1;
export const MAX_CROP_ZOOM = 5;

const MAX_CUSTOM_RATIO_VALUE = 1_000;
const CROP_BOUNDARY_TOLERANCE = 1e-12;

const FIXED_ASPECTS: Record<Exclude<CropRatio, "original" | "custom">, CropAspect> = {
  "1:1": { width: 1, height: 1 },
  "4:5": { width: 4, height: 5 },
  "3:2": { width: 3, height: 2 },
  "16:9": { width: 16, height: 9 },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function validSourceDimensions(width: number, height: number) {
  return (
    Number.isSafeInteger(width) &&
    Number.isSafeInteger(height) &&
    width > 0 &&
    height > 0
  );
}

export function parseCustomCropAspect(
  widthValue: string | number,
  heightValue: string | number,
): CropAspect | null {
  const width = Number(widthValue);
  const height = Number(heightValue);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_CUSTOM_RATIO_VALUE ||
    height > MAX_CUSTOM_RATIO_VALUE
  ) {
    return null;
  }
  return { width, height };
}

export function cropAspectForRatio(
  ratio: CropRatio,
  sourceWidth: number,
  sourceHeight: number,
  customWidth = "1",
  customHeight = "1",
): CropAspect | null {
  if (!validSourceDimensions(sourceWidth, sourceHeight)) return null;
  if (ratio === "original") {
    return { width: sourceWidth, height: sourceHeight };
  }
  if (ratio === "custom") {
    return parseCustomCropAspect(customWidth, customHeight);
  }
  return FIXED_ASPECTS[ratio];
}

export function centeredCropRect(
  sourceWidth: number,
  sourceHeight: number,
  aspect: CropAspect,
): CropRect {
  if (!validSourceDimensions(sourceWidth, sourceHeight)) {
    throw new Error("Source dimensions must be positive whole numbers.");
  }
  if (
    !Number.isFinite(aspect.width) ||
    !Number.isFinite(aspect.height) ||
    aspect.width <= 0 ||
    aspect.height <= 0
  ) {
    throw new Error("Crop aspect values must be positive and finite.");
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const requestedRatio = aspect.width / aspect.height;
  if (Math.abs(sourceRatio - requestedRatio) <= CROP_BOUNDARY_TOLERANCE) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  if (sourceRatio > requestedRatio) {
    const width = requestedRatio / sourceRatio;
    return { x: (1 - width) / 2, y: 0, width, height: 1 };
  }
  const height = sourceRatio / requestedRatio;
  return { x: 0, y: (1 - height) / 2, width: 1, height };
}

export function constrainCropRect(rect: CropRect): CropRect {
  if (
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    throw new Error("Crop rectangle values must be positive and finite.");
  }
  const width = Math.min(1, rect.width);
  const height = Math.min(1, rect.height);
  return {
    x: clamp(rect.x, 0, 1 - width),
    y: clamp(rect.y, 0, 1 - height),
    width,
    height,
  };
}

export function minimumCoverScale(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
) {
  if (
    ![imageWidth, imageHeight, frameWidth, frameHeight].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  ) {
    throw new Error("Image and frame dimensions must be positive and finite.");
  }
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
}

export function cropRectForZoom(
  baseRect: CropRect,
  zoom: number,
  centerX = baseRect.x + baseRect.width / 2,
  centerY = baseRect.y + baseRect.height / 2,
): CropRect {
  const safeZoom = clamp(zoom, MIN_CROP_ZOOM, MAX_CROP_ZOOM);
  const width = baseRect.width / safeZoom;
  const height = baseRect.height / safeZoom;
  return constrainCropRect({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  });
}

export function zoomForCropRect(baseRect: CropRect, rect: CropRect) {
  return clamp(baseRect.width / rect.width, MIN_CROP_ZOOM, MAX_CROP_ZOOM);
}

export function panCropRect(
  initialRect: CropRect,
  translationX: number,
  translationY: number,
  frameWidth: number,
  frameHeight: number,
): CropRect {
  if (
    !Number.isFinite(frameWidth) ||
    !Number.isFinite(frameHeight) ||
    frameWidth <= 0 ||
    frameHeight <= 0
  ) {
    return constrainCropRect(initialRect);
  }
  return constrainCropRect({
    ...initialRect,
    x: initialRect.x - (translationX / frameWidth) * initialRect.width,
    y: initialRect.y - (translationY / frameHeight) * initialRect.height,
  });
}

export function nudgeCropRect(
  rect: CropRect,
  direction: "left" | "right" | "up" | "down",
  multiplier = 1,
): CropRect {
  const horizontalStep = rect.width * 0.01 * multiplier;
  const verticalStep = rect.height * 0.01 * multiplier;
  return constrainCropRect({
    ...rect,
    x:
      direction === "left"
        ? rect.x - horizontalStep
        : direction === "right"
          ? rect.x + horizontalStep
          : rect.x,
    y:
      direction === "up"
        ? rect.y - verticalStep
        : direction === "down"
          ? rect.y + verticalStep
          : rect.y,
  });
}

export function resetCropPreview(
  sourceWidth: number,
  sourceHeight: number,
  aspect: CropAspect,
): CropPreviewState {
  return {
    rect: centeredCropRect(sourceWidth, sourceHeight, aspect),
    zoom: MIN_CROP_ZOOM,
  };
}

export function cropRatioLabel(
  ratio: CropRatio,
  customWidth: string,
  customHeight: string,
) {
  if (ratio === "original") return "Original ratio";
  if (ratio === "custom") return `${customWidth}:${customHeight}`;
  return ratio;
}
