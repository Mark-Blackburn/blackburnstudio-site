import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type SVGProps,
} from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import QrCodeGeneratorApp from "@/components/tools/QrCodeGeneratorApp";

type MockQrProps = ComponentPropsWithoutRef<"canvas"> & {
  value: string;
  size: number;
  level: string;
  marginSize: number;
  fgColor: string;
  bgColor: string;
  boostLevel?: boolean;
};

type MockQrSvgProps = SVGProps<SVGSVGElement> &
  Omit<MockQrProps, keyof ComponentPropsWithoutRef<"canvas">>;

vi.mock("qrcode.react", () => {
  const MockQrCanvas = forwardRef<HTMLCanvasElement, MockQrProps>(
    (
      { value, size, level, marginSize, fgColor, bgColor, ...props },
      ref,
    ) => {
      delete props.boostLevel;
      return (
        <canvas
          ref={ref}
          width={size}
          height={size}
          data-value={value}
          data-size={size}
          data-level={level}
          data-margin={marginSize}
          data-foreground={fgColor}
          data-background={bgColor}
          {...props}
        />
      );
    },
  );
  MockQrCanvas.displayName = "MockQrCanvas";

  const MockQrSvg = forwardRef<SVGSVGElement, MockQrSvgProps>(
    (
      { value, size, level, marginSize, fgColor, bgColor, ...props },
      ref,
    ) => {
      delete props.boostLevel;
      return (
        <svg
          ref={ref}
          viewBox={`0 0 ${size} ${size}`}
          data-value={value}
          data-level={level}
          data-margin={marginSize}
          data-foreground={fgColor}
          data-background={bgColor}
          {...props}
        >
          <path d="M0 0h1v1H0z" />
        </svg>
      );
    },
  );
  MockQrSvg.displayName = "MockQrSvg";

  return {
    QRCodeCanvas: MockQrCanvas,
    QRCodeSVG: MockQrSvg,
  };
});

describe("QrCodeGeneratorApp", () => {
  const createObjectURL = vi.fn<(blob: Blob | MediaSource) => string>(
    () => "blob:qr-download",
  );
  const revokeObjectURL = vi.fn();
  const clipboardWrite = vi.fn<(items: unknown[]) => Promise<void>>();
  let downloadedBlobs: Blob[];
  let clickedFilename: string | null;
  let clipboardData: Record<string, string | Blob | PromiseLike<string | Blob>>[];
  let deferPngEncoding: boolean;
  let pendingPngEncodes: Array<{
    callback: BlobCallback;
    height: number;
    type: string | undefined;
    width: number;
  }>;

  beforeEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    clipboardWrite.mockReset();
    downloadedBlobs = [];
    clipboardData = [];
    clickedFilename = null;
    deferPngEncoding = false;
    pendingPngEncodes = [];
    clipboardWrite.mockImplementation(async () => {
      await Promise.all(
        clipboardData.flatMap((item) => Object.values(item).map((value) => Promise.resolve(value))),
      );
    });
    createObjectURL.mockImplementation((blob: Blob | MediaSource) => {
      if (blob instanceof Blob) downloadedBlobs.push(blob);
      return "blob:qr-download";
    });
    vi.stubGlobal("fetch", vi.fn());
    class MockClipboardItem {
      constructor(
        data: Record<string, string | Blob | PromiseLike<string | Blob>>,
      ) {
        clipboardData.push(data);
      }
    }
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: MockClipboardItem,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write: clipboardWrite },
    });
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedFilename = this.download;
    });
    vi.stubGlobal(
      "Image",
      class MockImage {
        onerror: (() => void) | null = null;
        onload: (() => void) | null = null;

        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => ({ drawImage: vi.fn() })),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
      configurable: true,
      value: vi.fn(function (
        this: HTMLCanvasElement,
        callback: BlobCallback,
        type?: string,
      ) {
        const pending = {
          callback,
          height: this.height,
          type,
          width: this.width,
        };
        pendingPngEncodes.push(pending);
        if (!deferPngEncoding) {
          callback(new Blob(["png"], { type: type ?? "image/png" }));
        }
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function enterContent(value: string) {
    fireEvent.change(screen.getByRole("textbox", { name: "URL or text" }), {
      target: { value },
    });
    return screen.findByTestId("qr-preview");
  }

  function installImageClipboard() {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write: clipboardWrite },
    });
  }

  it("starts empty with labelled, unavailable download actions", () => {
    render(<QrCodeGeneratorApp />);

    expect(screen.queryByTestId("qr-preview")).not.toBeInTheDocument();
    expect(screen.getByText("Enter a URL or text to preview your QR code.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Copy PNG" })).toBeDisabled();
    expect(screen.getByLabelText("Foreground colour picker")).toBeInTheDocument();
    expect(screen.getByLabelText("Background colour picker")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Static QR code" })).toHaveLength(1);
  });

  it.each([
    ["arbitrary text", "Keep THIS exactly"],
    ["URL content", "example.com/Some/Path?Value=Mixed"],
    ["multiline text", "First line\nSecond line"],
  ])("preserves %s as the exact encoded payload", async (_label, value) => {
    render(<QrCodeGeneratorApp />);

    const preview = await enterContent(value);

    expect(preview).toHaveAttribute("data-value", value);
    expect(screen.getByTestId("qr-export-svg")).toHaveAttribute("data-value", value);
  });

  it("treats whitespace-only content as empty", () => {
    render(<QrCodeGeneratorApp />);

    fireEvent.change(screen.getByRole("textbox", { name: "URL or text" }), {
      target: { value: " \n\t " },
    });

    expect(screen.queryByTestId("qr-preview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeDisabled();
  });

  it("counts UTF-8 bytes and accepts the exact 1,200-byte boundary", async () => {
    render(<QrCodeGeneratorApp />);

    await enterContent("é".repeat(600));

    expect(screen.getByText("1,200 / 1,200 bytes")).toBeInTheDocument();
    expect(screen.queryByText(/QR content is too long/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeEnabled();
  });

  it("blocks content over 1,200 UTF-8 bytes", () => {
    render(<QrCodeGeneratorApp />);

    fireEvent.change(screen.getByRole("textbox", { name: "URL or text" }), {
      target: { value: `${"a".repeat(1199)}é` },
    });

    expect(screen.getByText("1,201 / 1,200 bytes")).toBeInTheDocument();
    expect(screen.getByText("QR content is too long. Keep it to 1,200 bytes or less.")).toBeInTheDocument();
    expect(screen.queryByTestId("qr-preview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeDisabled();
  });

  it("uses the required defaults and updates all QR settings", async () => {
    const user = userEvent.setup();
    render(<QrCodeGeneratorApp />);
    let preview = await enterContent("settings");

    expect(preview).toHaveAttribute("data-level", "M");
    expect(preview).toHaveAttribute("data-margin", "4");
    expect(preview).toHaveAttribute("data-size", "1024");
    expect(preview).toHaveAttribute("width", "1024");
    expect(preview).toHaveAttribute("height", "1024");
    expect(preview).toHaveStyle({ height: "auto", width: "100%" });
    expect(screen.getByTestId("qr-preview-surface")).toHaveClass("aspect-square");
    expect(preview).toHaveAttribute("data-foreground", "#000000");
    expect(preview).toHaveAttribute("data-background", "#FFFFFF");

    for (const level of ["L", "M", "Q", "H"]) {
      await user.selectOptions(screen.getByLabelText("Error correction"), level);
      expect(screen.getByTestId("qr-preview")).toHaveAttribute("data-level", level);
    }

    await user.selectOptions(screen.getByLabelText("Quiet zone"), "16");
    expect(screen.getByTestId("qr-preview")).toHaveAttribute("data-margin", "16");

    for (const size of [512, 1024, 2048]) {
      await user.click(screen.getByRole("radio", { name: `${size} px` }));
      preview = screen.getByTestId("qr-preview");
      expect(preview).toHaveAttribute("data-size", String(size));
      expect(preview).toHaveAttribute("width", String(size));
      expect(preview).toHaveAttribute("height", String(size));
      expect(screen.getAllByTestId("qr-preview")).toHaveLength(1);
    }
  });

  it("commits valid colours while incomplete typed colours retain the last valid rendering", async () => {
    const user = userEvent.setup();
    render(<QrCodeGeneratorApp />);
    await enterContent("colours");
    const foregroundInput = screen.getByRole("textbox", { name: "Foreground" });

    await user.clear(foregroundInput);
    await user.type(foregroundInput, "#F");
    expect(screen.getByTestId("qr-preview")).toHaveAttribute("data-foreground", "#000000");

    await user.clear(foregroundInput);
    await user.type(foregroundInput, "#1a2b3c");
    expect(screen.getByTestId("qr-preview")).toHaveAttribute("data-foreground", "#1A2B3C");

    fireEvent.change(screen.getByLabelText("Background colour picker"), {
      target: { value: "#fefefe" },
    });
    expect(screen.getByTestId("qr-preview")).toHaveAttribute("data-background", "#FEFEFE");
  });

  it("shows invalid hex errors after blur and blocks identical colours", async () => {
    const user = userEvent.setup();
    render(<QrCodeGeneratorApp />);
    await enterContent("validation");
    const foregroundInput = screen.getByRole("textbox", { name: "Foreground" });

    await user.clear(foregroundInput);
    await user.type(foregroundInput, "#GGGGGG");
    await user.tab();
    expect(screen.getByText("Enter a six-digit hex colour, such as #1A2B3C.")).toBeInTheDocument();
    expect(screen.queryByTestId("qr-preview")).not.toBeInTheDocument();

    await user.clear(foregroundInput);
    await user.type(foregroundInput, "#FFFFFF");
    expect(screen.getByText("Foreground and background colours must be different.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeDisabled();
  });

  it("provides nonblocking low-contrast and inverted-colour guidance", async () => {
    const user = userEvent.setup();
    render(<QrCodeGeneratorApp />);
    await enterContent("guidance");

    const foregroundInput = screen.getByRole("textbox", { name: "Foreground" });
    await user.clear(foregroundInput);
    await user.type(foregroundInput, "#777777");
    expect(screen.getByText("Low contrast may make this QR code difficult to scan. Test it before use.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeEnabled();

    await user.clear(foregroundInput);
    await user.type(foregroundInput, "#FFFFFF");
    const backgroundInput = screen.getByRole("textbox", { name: "Background" });
    await user.clear(backgroundInput);
    await user.type(backgroundInput, "#000000");
    expect(screen.getByText("Light QR codes on dark backgrounds may be less reliable to scan. Test before printing or publishing.")).toBeInTheDocument();
  });

  it("downloads PNG with the expected MIME, filename and object URL cleanup", async () => {
    const user = userEvent.setup();
    render(<QrCodeGeneratorApp />);
    await enterContent("download png");

    await user.click(screen.getByRole("button", { name: "Download PNG" }));

    await waitFor(() =>
      expect(screen.getByText("PNG downloaded.")).toBeInTheDocument(),
    );
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(downloadedBlobs.find((blob) => blob.type === "image/png")).toBeDefined();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(clickedFilename).toBe("qr-code.png");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:qr-download");
  });

  it("creates exact selected PNG backing dimensions independently of DPR", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });
    render(<QrCodeGeneratorApp />);
    await enterContent("exact PNG dimensions");

    for (const size of [512, 1024, 2048]) {
      await user.click(screen.getByRole("radio", { name: `${size} px` }));
      await user.click(screen.getByRole("button", { name: "Download PNG" }));
      await waitFor(() =>
        expect(screen.getByText("PNG downloaded.")).toBeInTheDocument(),
      );

      expect(pendingPngEncodes.at(-1)).toMatchObject({
        height: size,
        type: "image/png",
        width: size,
      });
    }
  });

  it("surfaces a null PNG Blob as a restrained error", async () => {
    const user = userEvent.setup();
    Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => callback(null)),
    });
    render(<QrCodeGeneratorApp />);
    await enterContent("bad png");

    await user.click(screen.getByRole("button", { name: "Download PNG" }));

    expect(await screen.findByText("Unable to create PNG. Try again.")).toBeInTheDocument();
    expect(downloadedBlobs.some((blob) => blob.type === "image/png")).toBe(false);
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it("starts clipboard.write synchronously with the exact-size PNG promise", async () => {
    installImageClipboard();
    deferPngEncoding = true;
    render(<QrCodeGeneratorApp />);
    await enterContent("private clipboard payload");

    for (const [index, size] of [512, 1024, 2048].entries()) {
      fireEvent.click(screen.getByRole("radio", { name: `${size} px` }));
      fireEvent.click(screen.getByRole("button", { name: "Copy PNG" }));

      expect(clipboardWrite).toHaveBeenCalledTimes(index + 1);
      expect(clipboardData).toHaveLength(index + 1);
      expect(Object.keys(clipboardData[index])).toEqual(["image/png"]);
      expect(clipboardData[index]["image/png"]).toBeInstanceOf(Promise);
      expect(clipboardWrite.mock.calls[index][0]).toHaveLength(1);
      expect(JSON.stringify(clipboardWrite.mock.calls[index][0])).not.toContain(
        "private clipboard payload",
      );
      await waitFor(() => expect(pendingPngEncodes).toHaveLength(index + 1));
      expect(pendingPngEncodes[index]).toMatchObject({
        height: size,
        type: "image/png",
        width: size,
      });
      await act(async () => {
        pendingPngEncodes[index].callback(
          new Blob(["png"], { type: "image/png" }),
        );
      });
      await expect(
        Promise.resolve(clipboardData[index]["image/png"]),
      ).resolves.toHaveProperty("type", "image/png");
      expect(
        await screen.findByText("PNG copied to clipboard."),
      ).toBeInTheDocument();
    }

    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports clipboard rejection without attempting a download fallback", async () => {
    const user = userEvent.setup();
    installImageClipboard();
    clipboardWrite.mockRejectedValueOnce(new Error("Clipboard denied"));
    render(<QrCodeGeneratorApp />);
    await enterContent("copy rejection");

    await user.click(screen.getByRole("button", { name: "Copy PNG" }));

    expect(
      await screen.findByText("Unable to copy PNG. Download it instead."),
    ).toBeInTheDocument();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(downloadedBlobs.some((blob) => blob.type === "image/png")).toBe(false);
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it("reports PNG Blob failure during a clipboard write", async () => {
    const user = userEvent.setup();
    installImageClipboard();
    Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => callback(null)),
    });
    render(<QrCodeGeneratorApp />);
    await enterContent("copy PNG failure");

    await user.click(screen.getByRole("button", { name: "Copy PNG" }));

    expect(
      await screen.findByText("Unable to copy PNG. Download it instead."),
    ).toBeInTheDocument();
    expect(clipboardWrite).toHaveBeenCalledOnce();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it("reports ClipboardItem construction failure before writing", async () => {
    const user = userEvent.setup();
    installImageClipboard();
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: class UnsupportedClipboardItem {
        constructor() {
          throw new Error("image/png is unsupported");
        }
      },
    });
    render(<QrCodeGeneratorApp />);
    await enterContent("clipboard item failure");

    await user.click(screen.getByRole("button", { name: "Copy PNG" }));

    expect(
      await screen.findByText("Unable to copy PNG. Download it instead."),
    ).toBeInTheDocument();
    expect(clipboardWrite).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it("disables image copying with clear guidance when unsupported", async () => {
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: undefined,
    });
    render(<QrCodeGeneratorApp />);
    await enterContent("unsupported copy");

    const copyButton = screen.getByRole("button", { name: "Copy PNG" });
    expect(copyButton).toBeDisabled();
    expect(copyButton).toHaveAttribute(
      "title",
      "Copying images is not supported in this browser",
    );
    expect(
      screen.getByText(
        "Copying images is not supported in this browser. PNG and SVG downloads remain available.",
      ),
    ).toBeInTheDocument();
    expect(clipboardWrite).not.toHaveBeenCalled();
  });

  it("downloads a true vector SVG with the expected MIME and filename", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.mocked(HTMLAnchorElement.prototype.click);
    render(<QrCodeGeneratorApp />);
    await enterContent("download svg");

    await user.click(screen.getByRole("button", { name: "Download SVG" }));

    expect(downloadedBlobs[0]).toHaveProperty(
      "type",
      "image/svg+xml;charset=utf-8",
    );
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(clickedFilename).toBe("qr-code.svg");
    const svgText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(downloadedBlobs[0]);
    });
    expect(svgText).toContain("<svg");
    expect(svgText).toContain("<path");
    expect(svgText).not.toContain("<image");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:qr-download");
    expect(screen.getByText("SVG downloaded.")).toBeInTheDocument();
  });

  it("never sends or persists payload content and unmounts cleanly", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const payload = "private destination\nhttps://private.example";
    const { unmount } = render(<QrCodeGeneratorApp />);
    await enterContent(payload);
    await user.click(screen.getByRole("button", { name: "Download SVG" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(window.location.href).not.toContain("private.example");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    unmount();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does not publish stale PNG status after settings change", async () => {
    const user = userEvent.setup();
    deferPngEncoding = true;
    render(<QrCodeGeneratorApp />);
    await enterContent("stale settings");

    fireEvent.click(screen.getByRole("button", { name: "Download PNG" }));
    await waitFor(() => expect(pendingPngEncodes).toHaveLength(1));
    await user.selectOptions(screen.getByLabelText("Quiet zone"), "5");
    pendingPngEncodes[0].callback(new Blob(["png"], { type: "image/png" }));
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce());

    expect(screen.queryByText("PNG downloaded.")).not.toBeInTheDocument();
  });

  it("does not update state when PNG generation completes after unmount", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    deferPngEncoding = true;
    const { unmount } = render(<QrCodeGeneratorApp />);
    await enterContent("unmounted export");

    fireEvent.click(screen.getByRole("button", { name: "Download PNG" }));
    await waitFor(() => expect(pendingPngEncodes).toHaveLength(1));
    unmount();
    pendingPngEncodes[0].callback(new Blob(["png"], { type: "image/png" }));
    await Promise.resolve();

    expect(consoleError).not.toHaveBeenCalled();
  });

  it("prevents an older PNG failure from overwriting a newer success", async () => {
    deferPngEncoding = true;
    render(<QrCodeGeneratorApp />);
    await enterContent("overlapping exports");
    const downloadButton = screen.getByRole("button", { name: "Download PNG" });

    fireEvent.click(downloadButton);
    await waitFor(() => expect(pendingPngEncodes).toHaveLength(1));
    fireEvent.click(downloadButton);
    await waitFor(() => expect(pendingPngEncodes).toHaveLength(2));
    pendingPngEncodes[1].callback(new Blob(["png"], { type: "image/png" }));
    expect(await screen.findByText("PNG downloaded.")).toBeInTheDocument();
    pendingPngEncodes[0].callback(null);
    await Promise.resolve();

    expect(screen.getByText("PNG downloaded.")).toBeInTheDocument();
    expect(screen.queryByText("Unable to create PNG. Try again.")).not.toBeInTheDocument();
  });
});