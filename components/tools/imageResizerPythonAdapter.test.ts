import { describe, expect, it } from "vitest";

import {
  cropArguments,
  IMAGE_RESIZER_PYTHON_ADAPTER,
} from "@/components/tools/imageResizerPythonAdapter";

describe("image resizer Python crop adapter", () => {
  it("passes a crop request to Python as four normalized CropRect values", () => {
    expect(
      cropArguments({ x: 0.1, y: 0.2, width: 0.6, height: 0.7 }),
    ).toEqual([true, 0.1, 0.2, 0.6, 0.7]);
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain("return CropRect(");
    expect(IMAGE_RESIZER_PYTHON_ADAPTER).toContain("crop=crop");
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
