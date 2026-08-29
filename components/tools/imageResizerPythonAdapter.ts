import type {
    ImageResizerCropRect,
    ImageResizerWatermark,
} from "./imageResizerWorkerProtocol";

export function cropArguments(crop?: ImageResizerCropRect) {
  return crop
        ? [true, crop.x, crop.y, crop.width, crop.height]
        : [false, 0, 0, 0, 0];
}

export function watermarkArguments(watermark?: ImageResizerWatermark) {
    if (!watermark) {
        return ["none", "", "bottom-right", 0.5, 0.05, 0.03, "#FFFFFF", null, 0.2];
    }
    if (watermark.type === "text") {
        return [
            "text",
            watermark.text,
            watermark.position,
            watermark.opacity,
            watermark.size,
            watermark.margin,
            watermark.colour,
            null,
            0.2,
        ];
    }
    return [
        "image",
        "",
        watermark.position,
        watermark.opacity,
        0.05,
        watermark.margin,
        "#FFFFFF",
        new Uint8Array(watermark.bytes),
        watermark.scale,
    ];
}

export const IMAGE_RESIZER_PYTHON_ADAPTER = String.raw`
import sys
from io import BytesIO

sys.path.insert(0, "/image-resizer-runtime")

from PIL import Image
from image_resizer import (
    CropRect,
    ImageMetadata,
    ProcessingOptions,
    ResizeOptions,
    crop_rect_to_pixel_box,
    filename_stem_from_input,
    get_image_dimensions,
    predict_output_dimensions,
    process_image,
)

try:
    from image_resizer import ImageWatermark, TextWatermark, WatermarkPosition
    WATERMARK_SUPPORTED = True
except ImportError:
    ImageWatermark = None
    TextWatermark = None
    WatermarkPosition = None
    WATERMARK_SUPPORTED = False


def _browser_bytes(value):
    try:
        value = value.to_py()
    except AttributeError:
        pass
    return bytes(value)


def _browser_crop(crop_enabled, crop_x, crop_y, crop_width, crop_height):
    if not crop_enabled:
        return None
    return CropRect(
        x=float(crop_x),
        y=float(crop_y),
        width=float(crop_width),
        height=float(crop_height),
    )


def _browser_watermark(
    watermark_type,
    watermark_text,
    watermark_position,
    watermark_opacity,
    watermark_size,
    watermark_margin,
    watermark_colour,
    watermark_image_value,
    watermark_scale,
):
    if watermark_type == "none":
        return None
    if not WATERMARK_SUPPORTED:
        raise ValueError("Watermarking is unavailable in the loaded browser processor.")

    position = WatermarkPosition(watermark_position)
    if watermark_type == "text":
        return TextWatermark(
            text=watermark_text,
            position=position,
            opacity=float(watermark_opacity),
            size=float(watermark_size),
            margin=float(watermark_margin),
            colour=watermark_colour,
        )
    if watermark_type == "image":
        return ImageWatermark(
            data=_browser_bytes(watermark_image_value),
            position=position,
            opacity=float(watermark_opacity),
            scale=float(watermark_scale),
            margin=float(watermark_margin),
        )
    raise ValueError("Unsupported watermark type.")


def _browser_capabilities():
    results = {}
    for output_format, pillow_format in (
        ("JPEG", "JPEG"),
        ("PNG", "PNG"),
        ("WebP", "WEBP"),
    ):
        output = BytesIO()
        image = Image.new("RGB", (2, 2), "white")
        try:
            image.save(output, pillow_format)
            results[output_format] = len(output.getvalue()) > 0
        except Exception:
            results[output_format] = False
        finally:
            image.close()
    results["watermark"] = WATERMARK_SUPPORTED
    return results


def _browser_inspect(input_value):
    data = _browser_bytes(input_value)
    with Image.open(BytesIO(data)) as image:
        source_format = image.format
        image.verify()

    canonical = {
        "JPG": "JPEG",
        "JPEG": "JPEG",
        "PNG": "PNG",
        "WEBP": "WebP",
    }.get(source_format)
    if canonical is None:
        raise ValueError("Only JPEG, PNG and WebP images are supported.")

    width, height = get_image_dimensions(data)
    return {
        "sourceFormat": canonical,
        "width": width,
        "height": height,
    }


def _browser_predict(
    source_width,
    source_height,
    long_edge,
    never_enlarge,
    crop_enabled,
    crop_x,
    crop_y,
    crop_width,
    crop_height,
):
    crop = _browser_crop(crop_enabled, crop_x, crop_y, crop_width, crop_height)
    resize = ResizeOptions(
        mode="Long edge",
        primary_value=int(long_edge),
        never_enlarge=bool(never_enlarge),
    )
    if crop is None:
        crop_width_pixels = int(source_width)
        crop_height_pixels = int(source_height)
    else:
        left, top, right, bottom = crop_rect_to_pixel_box(
            crop,
            int(source_width),
            int(source_height),
        )
        crop_width_pixels = right - left
        crop_height_pixels = bottom - top
    output_width, output_height = predict_output_dimensions(
        int(source_width),
        int(source_height),
        resize,
        crop,
    )
    return {
        "cropWidth": crop_width_pixels,
        "cropHeight": crop_height_pixels,
        "outputWidth": output_width,
        "outputHeight": output_height,
    }


def _browser_process(
    input_value,
    source_filename,
    long_edge,
    never_enlarge,
    output_format,
    quality,
    output_filename,
    title,
    alt_text,
    creator,
    copyright_text,
    strip_metadata,
    crop_enabled,
    crop_x,
    crop_y,
    crop_width,
    crop_height,
    watermark_type,
    watermark_text,
    watermark_position,
    watermark_opacity,
    watermark_size,
    watermark_margin,
    watermark_colour,
    watermark_image_value,
    watermark_scale,
):
    data = _browser_bytes(input_value)
    resize = ResizeOptions(
        mode="Long edge",
        primary_value=int(long_edge),
        never_enlarge=bool(never_enlarge),
    )
    crop = _browser_crop(crop_enabled, crop_x, crop_y, crop_width, crop_height)
    watermark = _browser_watermark(
        watermark_type,
        watermark_text,
        watermark_position,
        watermark_opacity,
        watermark_size,
        watermark_margin,
        watermark_colour,
        watermark_image_value,
        watermark_scale,
    )
    option_values = {
        "resize": resize,
        "output_format": output_format,
        "quality": int(quality),
        "strip_metadata": bool(strip_metadata),
        "web_filenames": True,
        "source_filename": source_filename,
        "custom_output_stem": filename_stem_from_input(output_filename),
        "crop": crop,
    }
    if WATERMARK_SUPPORTED:
        option_values["watermark"] = watermark
    options = ProcessingOptions(**option_values)
    metadata = ImageMetadata(
        title=title,
        alt_text=alt_text,
        creator=creator,
        copyright=copyright_text,
    )
    processed = process_image(data, options, metadata)
    return {
        "data": processed.data,
        "suggestedFilename": processed.suggested_filename,
        "originalWidth": processed.original_width,
        "originalHeight": processed.original_height,
        "width": processed.width,
        "height": processed.height,
        "outputFormat": processed.output_format,
    }
`;
