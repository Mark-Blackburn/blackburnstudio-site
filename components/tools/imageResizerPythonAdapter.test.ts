import { describe, expect, it } from "vitest";

import {
  cropArguments,
  IMAGE_RESIZER_PYTHON_ADAPTER,
  watermarkArguments,
} from "@/components/tools/imageResizerPythonAdapter";

describe("image resizer Python crop adapter", () => {
  it("passes a crop request to Python as four normalized CropRect values", () => {
    expect(
      cropArguments({ x: 0.1, y: 0.2, width: 0.6, height: 0.7 }),
    ).toEqual([true, 0.1, 0.2, 0.6, 0.7]);
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain("return CropRect(");
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain('"crop": crop');
  });

  it("passes an omitted crop to Python with the disabled flag", () => {
    expect(cropArguments()).toEqual([false, 0, 0, 0, 0]);
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      "if not crop_enabled:",
    );
  });

  it("uses shared crop and resize prediction functions", () => {
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain("crop_rect_to_pixel_box(");
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain("predict_output_dimensions(");
  });

  it("returns shared process dimensions after applying ProcessingOptions.crop", () => {
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain("processed = process_image(");
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      '"width": processed.width',
    );
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      '"height": processed.height',
    );
  });
});

describe("image resizer Python watermark adapter", () => {
  it("keeps baseline imports separate from optional v2 watermark imports", () => {
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      "try:\n    from image_resizer import ImageWatermark, TextWatermark, WatermarkPosition",
    );
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      "except ImportError:\n    ImageWatermark = None",
    );
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      'results["watermark"] = WATERMARK_SUPPORTED',
    );
  });

  it("maps no watermark to None without requiring the v2 ProcessingOptions field", () => {
    expect(watermarkArguments()).toEqual([
      "none",
      "",
      "bottom-right",
      0.5,
      0.05,
      0.03,
      "#FFFFFF",
      null,
      0.2,
    ]);
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      'if watermark_type == "none":\n        return None',
    );
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      'if WATERMARK_SUPPORTED:\n        option_values["watermark"] = watermark',
    );
  });

  it("constructs TextWatermark with exact shared public model fields", () => {
    expect(
      watermarkArguments({
        type: "text",
        text: "Blackburn Studio",
        position: "top-center",
        opacity: 0.6,
        size: 0.05,
        margin: 0.03,
        colour: "#C6A15B",
      }),
    ).toEqual([
      "text",
      "Blackburn Studio",
      "top-center",
      0.6,
      0.05,
      0.03,
      "#C6A15B",
      null,
      0.2,
    ]);
    for (const field of [
      "text=watermark_text",
      "position=position",
      "opacity=float(watermark_opacity)",
      "size=float(watermark_size)",
      "margin=float(watermark_margin)",
      "colour=watermark_colour",
    ]) {
      expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(field);
    }
  });

  it("constructs ImageWatermark with copied bytes and exact model fields", () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const args = watermarkArguments({
      type: "image",
      bytes,
      position: "bottom-left",
      opacity: 0.75,
      scale: 0.2,
      margin: 0.04,
    });
    expect(args.slice(0, 7)).toEqual([
      "image",
      "",
      "bottom-left",
      0.75,
      0.05,
      0.04,
      "#FFFFFF",
    ]);
    expect(args[7]).toBeInstanceOf(Uint8Array);
    expect(Array.from(args[7] as Uint8Array)).toEqual([1, 2, 3]);
    expect(args[8]).toBe(0.2);
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      "data=_browser_bytes(watermark_image_value)",
    );
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      "scale=float(watermark_scale)",
    );
  });

  it("passes crop and watermark together through ProcessingOptions", () => {
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain('"crop": crop');
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      'option_values["watermark"] = watermark',
    );
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain(
      "options = ProcessingOptions(**option_values)",
    );
  });
});
