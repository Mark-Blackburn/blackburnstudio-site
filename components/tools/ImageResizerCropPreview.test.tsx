import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ImageResizerCropPreview from "@/components/tools/ImageResizerCropPreview";

const rect = { x: 0, y: 0, width: 1, height: 1 };

function imageFile(name: string) {
  return new File([new Uint8Array([1, 2, 3])], name, {
    type: "image/jpeg",
  });
}

function previewProps(file: File, onPreviewError = vi.fn()) {
  return {
    file,
    sourceWidth: 1200,
    sourceHeight: 800,
    rect,
    interactive: true,
    disabled: false,
    onRectChange: vi.fn(),
    onPreviewError,
  };
}

async function currentPreviewImage() {
  await waitFor(() => expect(document.querySelector("img")).not.toBeNull());
  return document.querySelector("img")!;
}

function loadPreview(image: HTMLImageElement) {
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: 1200 },
    naturalHeight: { configurable: true, value: 800 },
  });
  fireEvent.load(image);
}

describe("ImageResizerCropPreview Object URL lifecycle", () => {
  beforeEach(() => {
    let objectUrl = 0;
    Object.defineProperties(URL, {
      createObjectURL: {
        configurable: true,
        value: vi.fn(() => `blob:preview-${++objectUrl}`),
      },
      revokeObjectURL: {
        configurable: true,
        value: vi.fn(),
      },
    });
  });

  it("recreates a valid preview URL after the Strict Mode effect lifecycle", async () => {
    const file = imageFile("strict.jpg");
    render(
      <StrictMode>
        <ImageResizerCropPreview {...previewProps(file)} />
      </StrictMode>,
    );

    const image = await currentPreviewImage();
    const activeUrl = image.getAttribute("src");
    const createdUrls = vi.mocked(URL.createObjectURL).mock.results.map(
      (result) => result.value,
    );
    const revokedUrls = vi.mocked(URL.revokeObjectURL).mock.calls.map(
      ([url]) => url,
    );

    expect(createdUrls.length).toBeGreaterThanOrEqual(2);
    expect(revokedUrls).toContain(createdUrls[0]);
    expect(activeUrl).toBe(createdUrls.at(-1));
    expect(revokedUrls).not.toContain(activeUrl);

    loadPreview(image);
    expect(
      screen.queryByText("Preparing orientation-corrected preview…"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Image preview unavailable.")).not.toBeInTheDocument();
  });

  it("revokes the previous file URL and renders a fresh URL when the file changes", async () => {
    const firstFile = imageFile("first.jpg");
    const secondFile = imageFile("second.jpg");
    const onPreviewError = vi.fn();
    const { rerender } = render(
      <ImageResizerCropPreview
        {...previewProps(firstFile, onPreviewError)}
      />,
    );
    const firstImage = await currentPreviewImage();
    const firstUrl = firstImage.getAttribute("src");

    rerender(
      <ImageResizerCropPreview
        {...previewProps(secondFile, onPreviewError)}
      />,
    );
    await waitFor(() =>
      expect(document.querySelector("img")?.getAttribute("src")).not.toBe(
        firstUrl,
      ),
    );
    const secondUrl = document.querySelector("img")?.getAttribute("src");

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    expect(secondUrl).toBe("blob:preview-2");
    expect(secondUrl).not.toBe(firstUrl);
  });

  it("revokes the active preview URL on unmount", async () => {
    const { unmount } = render(
      <ImageResizerCropPreview {...previewProps(imageFile("one.jpg"))} />,
    );
    const activeUrl = (await currentPreviewImage()).getAttribute("src");

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(activeUrl);
  });

  it("clears the previous decode error when switching to a new file", async () => {
    const firstFile = imageFile("first.jpg");
    const secondFile = imageFile("second.jpg");
    const onPreviewError = vi.fn();
    const { rerender } = render(
      <ImageResizerCropPreview
        {...previewProps(firstFile, onPreviewError)}
      />,
    );
    const firstImage = await currentPreviewImage();
    fireEvent.error(firstImage);
    expect(screen.getByText("Image preview unavailable.")).toBeInTheDocument();
    expect(onPreviewError).toHaveBeenLastCalledWith(
      "This image could not be decoded for preview.",
    );

    rerender(
      <ImageResizerCropPreview
        {...previewProps(secondFile, onPreviewError)}
      />,
    );
    await waitFor(() =>
      expect(document.querySelector("img")?.getAttribute("src")).toBe(
        "blob:preview-2",
      ),
    );

    expect(screen.queryByText("Image preview unavailable.")).not.toBeInTheDocument();
    expect(
      screen.getByText("Preparing orientation-corrected preview…"),
    ).toBeInTheDocument();
    expect(onPreviewError).toHaveBeenLastCalledWith(undefined);

    fireEvent.error(firstImage);
    expect(screen.queryByText("Image preview unavailable.")).not.toBeInTheDocument();
    loadPreview(document.querySelector("img")!);
    expect(
      screen.queryByText("Preparing orientation-corrected preview…"),
    ).not.toBeInTheDocument();
  });

  it("renders resize-only preview without drag or keyboard crop interaction", async () => {
    const file = imageFile("resize-only.jpg");
    const onRectChange = vi.fn();
    render(
      <ImageResizerCropPreview
        {...previewProps(file)}
        interactive={false}
        onRectChange={onRectChange}
      />,
    );
    const preview = screen.getByLabelText("Image preview for resize-only.jpg.");
    loadPreview(await currentPreviewImage());

    fireEvent.keyDown(preview, { key: "ArrowRight" });
    fireEvent.pointerDown(preview, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(preview, { pointerId: 1, clientX: 30, clientY: 30 });

    expect(preview).toHaveAttribute("tabindex", "-1");
    expect(onRectChange).not.toHaveBeenCalled();
  });

  it("retains keyboard crop interaction when crop mode is active", async () => {
    const onRectChange = vi.fn();
    render(
      <ImageResizerCropPreview
        {...previewProps(imageFile("crop.jpg"))}
        onRectChange={onRectChange}
      />,
    );
    const preview = screen.getByLabelText(/Interactive crop preview for crop\.jpg/);
    loadPreview(await currentPreviewImage());

    fireEvent.keyDown(preview, { key: "ArrowRight" });

    expect(onRectChange).toHaveBeenCalledTimes(1);
  });

  it("renders a pointer-transparent watermark overlay on the shared preview", async () => {
    render(
      <ImageResizerCropPreview
        {...previewProps(imageFile("watermarked.jpg"))}
        interactive={false}
        watermark={{
          type: "text",
          text: "Blackburn Studio",
          position: "bottom-right",
          opacity: 0.6,
          size: 0.05,
          margin: 0.03,
          colour: "#FFFFFF",
        }}
      />,
    );
    loadPreview(await currentPreviewImage());

    expect(screen.getByText("Blackburn Studio")).toHaveAttribute(
      "data-watermark-preview",
      "text",
    );
    expect(
      screen.getByText("Blackburn Studio").parentElement,
    ).toHaveClass("pointer-events-none");
    expect(
      screen.getAllByLabelText("Image preview for watermarked.jpg."),
    ).toHaveLength(1);
  });
});
