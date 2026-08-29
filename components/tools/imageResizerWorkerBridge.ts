import { watermarkArguments } from "./imageResizerPythonAdapter";
import type {
  ImageResizerCapabilities,
  ImageResizerWatermark,
} from "./imageResizerWorkerProtocol";

export function capabilitiesFromPython(
  rawCapabilities: Record<string, unknown>,
): ImageResizerCapabilities {
  return {
    JPEG: rawCapabilities.JPEG === true,
    PNG: rawCapabilities.PNG === true,
    WebP: rawCapabilities.WebP === true,
    watermark: rawCapabilities.watermark === true,
  };
}

export function prepareWorkerWatermark(
  watermark: ImageResizerWatermark | undefined,
  capabilities: ImageResizerCapabilities,
) {
  if (watermark && !capabilities.watermark) return null;
  return watermarkArguments(watermark);
}
