// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadPyodide, type PyodideInterface } from "pyodide";
import { fileURLToPath } from "node:url";

import { IMAGE_RESIZER_PYTHON_ADAPTER } from "@/components/tools/imageResizerPythonAdapter";

let pyodide: PyodideInterface;

const CONTRACT_FIXTURE = String.raw`
import enum
import json
import sys
import types

records = {}

pil_module = types.ModuleType("PIL")
image_module = types.ModuleType("PIL.Image")

class FakeImage:
		format = "JPEG"

		def __enter__(self):
				return self

		def __exit__(self, *_args):
				self.close()

		def save(self, output, _format):
				output.write(b"encoded")

		def verify(self):
				return None

		def close(self):
				return None

image_module.new = lambda *_args, **_kwargs: FakeImage()
image_module.open = lambda *_args, **_kwargs: FakeImage()
pil_module.Image = image_module
sys.modules["PIL"] = pil_module
sys.modules["PIL.Image"] = image_module

core_module = types.ModuleType("image_resizer")

class CropRect:
		def __init__(self, **values):
				self.__dict__.update(values)
				records["crop"] = values

class ResizeOptions:
		def __init__(self, **values):
				self.__dict__.update(values)

class ImageMetadata:
		def __init__(self, **values):
				self.__dict__.update(values)

if CONTRACT_V2:
		class WatermarkPosition(str, enum.Enum):
				TOP_LEFT = "top-left"
				TOP_CENTER = "top-center"
				TOP_RIGHT = "top-right"
				CENTER_LEFT = "center-left"
				CENTER = "center"
				CENTER_RIGHT = "center-right"
				BOTTOM_LEFT = "bottom-left"
				BOTTOM_CENTER = "bottom-center"
				BOTTOM_RIGHT = "bottom-right"

		class TextWatermark:
				def __init__(
						self,
						text,
						position=WatermarkPosition.BOTTOM_RIGHT,
						opacity=0.5,
						size=0.05,
						margin=0.03,
						colour="#FFFFFF",
				):
						values = {
								"text": text,
								"position": position,
								"opacity": opacity,
								"size": size,
								"margin": margin,
								"colour": colour,
						}
						self.__dict__.update(values)
						records.setdefault("text_watermark_values", []).append(values)
						records.setdefault("text_watermark_instances", []).append(self)

		class ImageWatermark:
				def __init__(
						self,
						data,
						position=WatermarkPosition.BOTTOM_RIGHT,
						opacity=0.5,
						scale=0.2,
						margin=0.03,
				):
						values = {
								"data": data,
								"position": position,
								"opacity": opacity,
								"scale": scale,
								"margin": margin,
						}
						self.__dict__.update(values)
						records.setdefault("image_watermark_values", []).append(values)
						records.setdefault("image_watermark_instances", []).append(self)

		class ProcessingOptions:
				def __init__(
						self,
						resize,
						output_format="JPEG",
						quality=85,
						strip_metadata=True,
						web_filenames=True,
						source_filename="image",
						custom_output_stem=None,
						crop=None,
						watermark=None,
				):
						self.__dict__.update(locals())
						self.__dict__.pop("self")
						records.setdefault("processing_watermarks", []).append(watermark)

		core_module.WatermarkPosition = WatermarkPosition
		core_module.TextWatermark = TextWatermark
		core_module.ImageWatermark = ImageWatermark
else:
		class ProcessingOptions:
				def __init__(
						self,
						resize,
						output_format="JPEG",
						quality=85,
						strip_metadata=True,
						web_filenames=True,
						source_filename="image",
						custom_output_stem=None,
						crop=None,
				):
						self.__dict__.update(locals())
						self.__dict__.pop("self")
						records["processing_watermark"] = "v1-no-field"

def crop_rect_to_pixel_box(_crop, _width, _height):
		return (1, 2, 11, 12)

def filename_stem_from_input(value):
		return value.rsplit(".", 1)[0]

def get_image_dimensions(_data):
		return (20, 10)

def predict_output_dimensions(_width, _height, _resize, _crop=None):
		return (16, 8)

def process_image(data, options, metadata):
		records["input"] = data
		records["options"] = options
		records["metadata"] = metadata
		return types.SimpleNamespace(
				data=b"processed",
				suggested_filename="output.jpg",
				original_width=20,
				original_height=10,
				width=16,
				height=8,
				output_format="JPEG",
		)

core_module.CropRect = CropRect
core_module.ImageMetadata = ImageMetadata
core_module.ProcessingOptions = ProcessingOptions
core_module.ResizeOptions = ResizeOptions
core_module.crop_rect_to_pixel_box = crop_rect_to_pixel_box
core_module.filename_stem_from_input = filename_stem_from_input
core_module.get_image_dimensions = get_image_dimensions
core_module.predict_output_dimensions = predict_output_dimensions
core_module.process_image = process_image
sys.modules["image_resizer"] = core_module
`;

function executeContract(v2: boolean) {
	pyodide.globals.set("CONTRACT_V2", v2);
	pyodide.globals.set("ADAPTER_SOURCE", IMAGE_RESIZER_PYTHON_ADAPTER);
	pyodide.runPython(CONTRACT_FIXTURE);
	pyodide.runPython("exec(ADAPTER_SOURCE, globals())");
}

function readJson(expression: string) {
	return JSON.parse(pyodide.runPython(`json.dumps(${expression})`) as string);
}

beforeAll(async () => {
	// The npm package includes its WASM runtime, so this is deterministic and
	// offline in CI rather than depending on a system Python installation.
	pyodide = await loadPyodide({
		indexURL: fileURLToPath(
			new URL("../../node_modules/pyodide/", import.meta.url),
		),
	});
});

afterAll(() => {
	if (!pyodide) return;
	pyodide.globals.delete("ADAPTER_SOURCE");
	pyodide.globals.delete("CONTRACT_V2");
});

describe("embedded Python adapter execution", () => {
	it("starts and processes without watermark symbols under the v1 contract", () => {
		executeContract(false);

		expect(readJson("_browser_capabilities()") as Record<string, unknown>).toMatchObject({
			JPEG: true,
			PNG: true,
			WebP: true,
			watermark: false,
		});
		expect(readJson("_browser_inspect(b'jpeg')")).toEqual({
			sourceFormat: "JPEG",
			width: 20,
			height: 10,
		});

		const result = readJson(`{key: value for key, value in _browser_process(
				b"jpeg", "input.jpg", 1600, True, "JPEG", 85, "output.jpg",
				"Title", "Alt", "Creator", "Copyright", True,
				False, 0, 0, 0, 0,
				"none", "", "bottom-right", 0.5, 0.05, 0.03, "#FFFFFF", None, 0.2
		).items() if key != "data"}`);
		expect(result).toMatchObject({
			suggestedFilename: "output.jpg",
			width: 16,
			height: 8,
		});
		expect(pyodide.runPython("records['processing_watermark']")).toBe(
			"v1-no-field",
		);
	});

	it("constructs exact text, image and no-watermark values under v2", () => {
		executeContract(true);
		expect(readJson("_browser_capabilities()") as Record<string, unknown>).toMatchObject({
			watermark: true,
		});

		pyodide.runPython(`_browser_process(
				b"jpeg", "input.jpg", 1600, True, "JPEG", 85, "output.jpg",
				"Title", "Alt", "Creator", "Copyright", True,
				True, 0.1, 0.2, 0.6, 0.7,
				"text", "Studio", "top-center", 0.65, 0.08, 0.04, "#AABBCC", None, 0.2
		)`);
		expect(readJson(`{
				"count": len(records["text_watermark_instances"]),
				"text": records["text_watermark_values"][0]["text"],
				"position": records["text_watermark_values"][0]["position"].value,
				"opacity": records["text_watermark_values"][0]["opacity"],
				"size": records["text_watermark_values"][0]["size"],
				"margin": records["text_watermark_values"][0]["margin"],
				"colour": records["text_watermark_values"][0]["colour"],
				"crop": records["crop"],
				"same_object": records["processing_watermarks"][-1] is records["text_watermark_instances"][0],
		}`)).toEqual({
			count: 1,
			text: "Studio",
			position: "top-center",
			opacity: 0.65,
			size: 0.08,
			margin: 0.04,
			colour: "#AABBCC",
			crop: { x: 0.1, y: 0.2, width: 0.6, height: 0.7 },
			same_object: true,
		});
		pyodide.runPython(`
records["text_unexpected_keyword_rejected"] = False
try:
	TextWatermark(text="Studio", unexpected=True)
except TypeError:
	records["text_unexpected_keyword_rejected"] = True
`);
		expect(
			pyodide.runPython('records["text_unexpected_keyword_rejected"]'),
		).toBe(true);
		expect(pyodide.runPython('len(records["text_watermark_instances"])')).toBe(
			1,
		);

		pyodide.runPython(`_browser_process(
				b"jpeg", "input.jpg", 1600, True, "JPEG", 85, "output.jpg",
				"", "", "", "", True,
				False, 0, 0, 0, 0,
				"image", "", "bottom-left", 0.75, 0.05, 0.03, "#FFFFFF", b"logo", 0.22
		)`);
		expect(readJson(`{
				"count": len(records["image_watermark_instances"]),
				"data": list(records["image_watermark_values"][0]["data"]),
				"position": records["image_watermark_values"][0]["position"].value,
				"opacity": records["image_watermark_values"][0]["opacity"],
				"scale": records["image_watermark_values"][0]["scale"],
				"margin": records["image_watermark_values"][0]["margin"],
				"same_object": records["processing_watermarks"][-1] is records["image_watermark_instances"][0],
		}`)).toEqual({
			count: 1,
			data: [108, 111, 103, 111],
			position: "bottom-left",
			opacity: 0.75,
			scale: 0.22,
			margin: 0.03,
			same_object: true,
		});
		pyodide.runPython(`
records["image_unexpected_keyword_rejected"] = False
try:
	ImageWatermark(data=b"logo", unexpected=True)
except TypeError:
	records["image_unexpected_keyword_rejected"] = True
`);
		expect(
			pyodide.runPython('records["image_unexpected_keyword_rejected"]'),
		).toBe(true);
		expect(pyodide.runPython('len(records["image_watermark_instances"])')).toBe(
			1,
		);

		pyodide.runPython(`_browser_process(
				b"jpeg", "input.jpg", 1600, True, "JPEG", 85, "output.jpg",
				"", "", "", "", True,
				False, 0, 0, 0, 0,
				"none", "", "bottom-right", 0.5, 0.05, 0.03, "#FFFFFF", None, 0.2
		)`);
		expect(pyodide.runPython("records['processing_watermarks'][-1] is None")).toBe(
			true,
		);
	});
});