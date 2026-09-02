"use client";

import {
  Component,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

import { SectionEyebrow, StudioButton } from "@/components/studio";
import { createPngBlob, createSvgBlob } from "@/components/tools/qrCodeExport";

const MAX_CONTENT_BYTES = 1_200;
const HEX_COLOUR = /^#[0-9A-F]{6}$/i;
const PNG_SIZES = [512, 1024, 2048] as const;

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";
type PngSize = (typeof PNG_SIZES)[number];
type ColourName = "foreground" | "background";

type QrRenderBoundaryProps = {
  children: ReactNode;
  resetKey: string;
  onError: () => void;
};

type QrRenderBoundaryState = {
  failed: boolean;
  resetKey: string;
};

class QrRenderBoundary extends Component<
  QrRenderBoundaryProps,
  QrRenderBoundaryState
> {
  state: QrRenderBoundaryState = {
    failed: false,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(): Partial<QrRenderBoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: QrRenderBoundaryProps,
    state: QrRenderBoundaryState,
  ): Partial<QrRenderBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { failed: false, resetKey: props.resetKey };
    }

    return null;
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function hexToRgb(colour: string) {
  return {
    red: Number.parseInt(colour.slice(1, 3), 16) / 255,
    green: Number.parseInt(colour.slice(3, 5), 16) / 255,
    blue: Number.parseInt(colour.slice(5, 7), 16) / 255,
  };
}

function relativeLuminance(colour: string) {
  const channels = Object.values(hexToRgb(colour)).map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function triggerDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function subscribeToClipboardSupport() {
  return () => undefined;
}

function getClipboardSupport() {
  return (
    typeof window.ClipboardItem === "function" &&
    typeof navigator.clipboard?.write === "function"
  );
}

function getServerClipboardSupport() {
  return false;
}

export default function QrCodeGeneratorApp() {
  const fieldId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const mountedRef = useRef(false);
  const exportRequestId = useRef(0);
  const [content, setContent] = useState("");
  const [errorLevel, setErrorLevel] = useState<ErrorCorrectionLevel>("M");
  const [pngSize, setPngSize] = useState<PngSize>(1024);
  const [quietZone, setQuietZone] = useState(4);
  const [foregroundInput, setForegroundInput] = useState("#000000");
  const [backgroundInput, setBackgroundInput] = useState("#FFFFFF");
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#FFFFFF");
  const [blurredColours, setBlurredColours] = useState<Set<ColourName>>(
    () => new Set(),
  );
  const [renderErrorKey, setRenderErrorKey] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState("");
  const copySupported = useSyncExternalStore(
    subscribeToClipboardSupport,
    getClipboardSupport,
    getServerClipboardSupport,
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      exportRequestId.current += 1;
    };
  }, []);

  const contentBytes = useMemo(() => utf8ByteLength(content), [content]);
  const hasContent = content.trim().length > 0;
  const contentTooLong = contentBytes > MAX_CONTENT_BYTES;
  const coloursMatch = foreground === background;
  const foregroundInvalid =
    !HEX_COLOUR.test(foregroundInput) &&
    (blurredColours.has("foreground") || foregroundInput.length >= 7);
  const backgroundInvalid =
    !HEX_COLOUR.test(backgroundInput) &&
    (blurredColours.has("background") || backgroundInput.length >= 7);
  const contrast = contrastRatio(foreground, background);
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const renderKey = [
    content,
    foreground,
    background,
    errorLevel,
    quietZone,
    pngSize,
  ].join("\u0000");
  const renderFailed = renderErrorKey === renderKey;
  const isValid =
    hasContent &&
    !contentTooLong &&
    !foregroundInvalid &&
    !backgroundInvalid &&
    !coloursMatch &&
    !renderFailed;

  function invalidateExportStatus() {
    exportRequestId.current += 1;
    setDownloadStatus("");
  }

  function publishExportStatus(requestId: number, status: string) {
    if (
      mountedRef.current &&
      requestId === exportRequestId.current
    ) {
      setDownloadStatus(status);
    }
  }

  function updateColour(name: ColourName, value: string) {
    const normalized = value.toUpperCase();

    if (name === "foreground") {
      setForegroundInput(normalized);
      if (HEX_COLOUR.test(normalized)) setForeground(normalized);
    } else {
      setBackgroundInput(normalized);
      if (HEX_COLOUR.test(normalized)) setBackground(normalized);
    }

    setBlurredColours((current) => {
      if (!current.has(name)) return current;
      const next = new Set(current);
      next.delete(name);
      return next;
    });
    invalidateExportStatus();
  }

  function markColourBlurred(name: ColourName) {
    setBlurredColours((current) => new Set(current).add(name));
    invalidateExportStatus();
  }

  async function downloadPng() {
    const requestId = ++exportRequestId.current;
    const svg = svgRef.current;

    if (!svg || !isValid) {
      publishExportStatus(requestId, "Unable to create PNG. Try again.");
      return;
    }

    try {
      const blob = await createPngBlob(svg, pngSize);
      triggerDownload(blob, "qr-code.png");
      publishExportStatus(requestId, "PNG downloaded.");
    } catch {
      publishExportStatus(requestId, "Unable to create PNG. Try again.");
    }
  }

  async function copyPng() {
    const requestId = ++exportRequestId.current;

    if (!copySupported) {
      publishExportStatus(
        requestId,
        "Copying images is not supported in this browser.",
      );
      return;
    }

    const svg = svgRef.current;
    if (!svg || !isValid) {
      publishExportStatus(
        requestId,
        "Unable to copy PNG. Download it instead.",
      );
      return;
    }

    try {
      const pngPromise = createPngBlob(svg, pngSize);
      void pngPromise.catch(() => undefined);
      const clipboardItem = new window.ClipboardItem({
        "image/png": pngPromise,
      });
      await navigator.clipboard.write([clipboardItem]);
      publishExportStatus(requestId, "PNG copied to clipboard.");
    } catch {
      publishExportStatus(
        requestId,
        "Unable to copy PNG. Download it instead.",
      );
    }
  }

  function downloadSvg() {
    const requestId = ++exportRequestId.current;
    const svg = svgRef.current;
    if (!svg || !isValid) {
      publishExportStatus(requestId, "Unable to create SVG. Try again.");
      return;
    }

    try {
      const blob = createSvgBlob(svg, pngSize);
      triggerDownload(blob, "qr-code.svg");
      publishExportStatus(requestId, "SVG downloaded.");
    } catch {
      publishExportStatus(requestId, "Unable to create SVG. Try again.");
    }
  }

  return (
    <section aria-labelledby="qr-app-heading">
      <SectionEyebrow>Free browser tool</SectionEyebrow>
      <h1
        id="qr-app-heading"
        className="mt-4 text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-5xl"
      >
        QR Code Generator
      </h1>
      <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-studio-muted">
        Create a static QR code and download it as PNG or SVG. Nothing is
        uploaded; generation happens locally in your browser.
      </p>

      <aside className="mt-5 max-w-[68ch] border-l border-studio-border pl-4 text-sm leading-relaxed text-studio-muted">
        <h2 className="font-medium text-studio-text">Static QR code</h2>
        <p className="mt-1.5">
          The destination is stored directly in the QR code. It will continue
          to work without Blackburn Studio, but the destination cannot be
          changed after the QR code has been created.
        </p>
      </aside>

      <div
        className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] lg:items-start"
        data-testid="qr-generator-workspace"
      >
        <div className="min-w-0 space-y-7 rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-8">
          <div>
            <label
              htmlFor={`${fieldId}-content`}
              className="block text-sm font-medium text-studio-text"
            >
              URL or text
            </label>
            <textarea
              id={`${fieldId}-content`}
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                invalidateExportStatus();
              }}
              rows={6}
              aria-describedby={`${fieldId}-content-help ${fieldId}-content-count${contentTooLong ? ` ${fieldId}-content-error` : ""}`}
              aria-invalid={contentTooLong}
              placeholder="https://example.com or any text"
              className="mt-2 w-full resize-y rounded-xl border border-studio-border bg-studio-surface-raised px-4 py-3 text-base text-studio-text outline-none placeholder:text-studio-dim focus:border-white/35 focus:ring-2 focus:ring-white/20"
            />
            <div className="mt-2 flex flex-wrap items-start justify-between gap-2 text-xs text-studio-dim">
              <p id={`${fieldId}-content-help`}>
                Encoded exactly as entered. URLs are not changed.
              </p>
              <p
                id={`${fieldId}-content-count`}
                className={contentBytes > 1_000 ? "text-studio-muted" : undefined}
              >
                {contentBytes.toLocaleString("en-AU")} / 1,200 bytes
              </p>
            </div>
            {contentTooLong ? (
              <p
                id={`${fieldId}-content-error`}
                role="alert"
                className="mt-2 text-sm text-red-300"
              >
                QR content is too long. Keep it to 1,200 bytes or less.
              </p>
            ) : null}
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-studio-text">Colours</legend>
            <div className="mt-3 grid gap-5 sm:grid-cols-2">
              {(
                [
                  {
                    name: "foreground" as const,
                    label: "Foreground",
                    input: foregroundInput,
                    committed: foreground,
                    invalid: foregroundInvalid,
                  },
                  {
                    name: "background" as const,
                    label: "Background",
                    input: backgroundInput,
                    committed: background,
                    invalid: backgroundInvalid,
                  },
                ] as const
              ).map((colour) => (
                <div key={colour.name}>
                  <label
                    htmlFor={`${fieldId}-${colour.name}-text`}
                    className="block text-xs text-studio-muted"
                  >
                    {colour.label}
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="color"
                      aria-label={`${colour.label} colour picker`}
                      value={colour.committed}
                      onChange={(event) =>
                        updateColour(colour.name, event.target.value)
                      }
                      className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-studio-border bg-studio-surface-raised p-1"
                    />
                    <input
                      id={`${fieldId}-${colour.name}-text`}
                      value={colour.input}
                      onChange={(event) =>
                        updateColour(colour.name, event.target.value)
                      }
                      onBlur={() => markColourBlurred(colour.name)}
                      inputMode="text"
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={colour.invalid}
                      aria-describedby={
                        colour.invalid
                          ? `${fieldId}-${colour.name}-error`
                          : undefined
                      }
                      className="min-w-0 flex-1 rounded-lg border border-studio-border bg-studio-surface-raised px-3 py-2 font-mono text-sm uppercase text-studio-text outline-none focus:border-white/35 focus:ring-2 focus:ring-white/20"
                    />
                  </div>
                  {colour.invalid ? (
                    <p
                      id={`${fieldId}-${colour.name}-error`}
                      role="alert"
                      className="mt-2 text-xs text-red-300"
                    >
                      Enter a six-digit hex colour, such as #1A2B3C.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            {coloursMatch ? (
              <p role="alert" className="mt-3 text-sm text-red-300">
                Foreground and background colours must be different.
              </p>
            ) : null}
            {!coloursMatch && contrast < 4.5 ? (
              <p className="mt-3 text-sm text-amber-200">
                Low contrast may make this QR code difficult to scan. Test it
                before use.
              </p>
            ) : null}
            {!coloursMatch && foregroundLuminance > backgroundLuminance ? (
              <p className="mt-2 text-sm text-amber-200">
                Light QR codes on dark backgrounds may be less reliable to
                scan. Test before printing or publishing.
              </p>
            ) : null}
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${fieldId}-error-level`}
                className="block text-sm font-medium text-studio-text"
              >
                Error correction
              </label>
              <select
                id={`${fieldId}-error-level`}
                value={errorLevel}
                onChange={(event) => {
                  setErrorLevel(event.target.value as ErrorCorrectionLevel);
                  invalidateExportStatus();
                }}
                className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-studio-border bg-studio-surface-raised px-3 py-2 text-sm text-studio-text outline-none focus:border-white/35 focus:ring-2 focus:ring-white/20"
              >
                <option value="L">Low (L) — about 7% recovery</option>
                <option value="M">Medium (M) — about 15% recovery</option>
                <option value="Q">Quartile (Q) — about 25% recovery</option>
                <option value="H">High (H) — about 30% recovery</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-quiet-zone`}
                className="block text-sm font-medium text-studio-text"
              >
                Quiet zone
              </label>
              <select
                id={`${fieldId}-quiet-zone`}
                value={quietZone}
                onChange={(event) => {
                  setQuietZone(Number(event.target.value));
                  invalidateExportStatus();
                }}
                aria-describedby={`${fieldId}-quiet-zone-help`}
                className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-studio-border bg-studio-surface-raised px-3 py-2 text-sm text-studio-text outline-none focus:border-white/35 focus:ring-2 focus:ring-white/20"
              >
                {Array.from({ length: 13 }, (_, index) => index + 4).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value} modules
                    </option>
                  ),
                )}
              </select>
              <p
                id={`${fieldId}-quiet-zone-help`}
                className="mt-2 text-xs leading-relaxed text-studio-dim"
              >
                Adds clear space around the QR code to improve scanning.
              </p>
            </div>
          </div>

          <fieldset aria-describedby={`${fieldId}-size-help`}>
            <legend className="text-sm font-medium text-studio-text">
              PNG output size
            </legend>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {PNG_SIZES.map((size) => (
                <label
                  key={size}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm transition focus-within:ring-2 focus-within:ring-white/30 ${
                    pngSize === size
                      ? "border-white/45 bg-white text-black"
                      : "border-studio-border bg-studio-surface-raised text-studio-muted hover:border-white/30"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${fieldId}-png-size`}
                    value={size}
                    checked={pngSize === size}
                    onChange={() => {
                      setPngSize(size);
                      invalidateExportStatus();
                    }}
                    className="sr-only"
                  />
                  {size} px
                </label>
              ))}
            </div>
            <p
              id={`${fieldId}-size-help`}
              className="mt-2 text-xs leading-relaxed text-studio-dim"
            >
              Controls the pixel dimensions of PNG downloads. SVG downloads
              remain scalable.
            </p>
          </fieldset>
        </div>

        <div className="grid min-w-0 gap-5 lg:self-stretch lg:content-between lg:gap-3.5">
          <div className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-5 md:p-7">
            <h2 className="text-xl font-medium tracking-tight text-studio-text">
              Preview
            </h2>
            <div className="mt-5 flex justify-center">
              <div
                className="relative flex aspect-square w-full max-w-88 items-center justify-center overflow-hidden rounded-xl bg-neutral-200 p-5"
                aria-label="QR code preview"
                data-testid="qr-preview-surface"
              >
                {isValid ? (
                  <QrRenderBoundary
                    resetKey={renderKey}
                    onError={() => setRenderErrorKey(renderKey)}
                  >
                    <QRCodeCanvas
                      value={content}
                      size={pngSize}
                      level={errorLevel}
                      marginSize={quietZone}
                      fgColor={foreground}
                      bgColor={background}
                      boostLevel={false}
                      title="Preview of the QR code for the entered content"
                      className="block aspect-square h-auto w-full"
                      style={{ height: "auto", width: "100%" }}
                      data-testid="qr-preview"
                    />
                    <QRCodeSVG
                      ref={svgRef}
                      value={content}
                      size={pngSize}
                      level={errorLevel}
                      marginSize={quietZone}
                      fgColor={foreground}
                      bgColor={background}
                      boostLevel={false}
                      aria-hidden="true"
                      focusable="false"
                      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                      data-testid="qr-export-svg"
                    />
                  </QrRenderBoundary>
                ) : (
                  <p className="max-w-60 text-center text-sm leading-relaxed text-neutral-600">
                    {renderFailed
                      ? "This content could not be rendered as a QR code. Try shorter content or different settings."
                      : contentTooLong || coloursMatch || foregroundInvalid || backgroundInvalid
                        ? "Resolve the highlighted settings to preview your QR code."
                        : "Enter a URL or text to preview your QR code."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-5 md:p-6">
            <h2 className="text-xl font-medium tracking-tight text-studio-text">
              Download
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <StudioButton
                variant="primary"
                onClick={downloadPng}
                disabled={!isValid}
                className="w-full disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-2"
              >
                Download PNG
              </StudioButton>
              <StudioButton
                variant="secondary"
                onClick={downloadSvg}
                disabled={!isValid}
                className="w-full disabled:cursor-not-allowed disabled:opacity-45"
              >
                Download SVG
              </StudioButton>
              <StudioButton
                variant="secondary"
                onClick={copyPng}
                disabled={!isValid || !copySupported}
                title={
                  copySupported
                    ? "Copy the PNG image to the clipboard"
                    : "Copying images is not supported in this browser"
                }
                className="w-full disabled:cursor-not-allowed disabled:opacity-45"
              >
                Copy PNG
              </StudioButton>
            </div>
            {!copySupported ? (
              <p className="mt-3 text-xs leading-relaxed text-studio-dim">
                Copying images is not supported in this browser. PNG and SVG
                downloads remain available.
              </p>
            ) : null}
            <p
              aria-live="polite"
              className="mt-4 min-h-5 text-sm text-studio-muted"
            >
              {downloadStatus}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}