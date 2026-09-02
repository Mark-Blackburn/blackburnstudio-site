import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ToolsPage from "@/app/tools/page";
import OnlineQrCodeGeneratorPage, {
  metadata as appMetadata,
} from "@/app/tools/qr-code-generator/app/page";
import QrCodeGeneratorPage, {
  metadata as detailMetadata,
} from "@/app/tools/qr-code-generator/page";
import { INDEXABLE_ROUTES } from "@/lib/siteConfig";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tools/qr-code-generator",
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

vi.mock("@/components/tools/QrCodeGeneratorApp", () => ({
  default: () => <div>QR generator application</div>,
}));

describe("QR Code Generator routes", () => {
  it("adds the expected card and feature list to the tools page", () => {
    render(<ToolsPage />);

    expect(screen.getByRole("heading", { name: "Web Image Resizer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Image Resizer" })).toHaveAttribute(
      "href",
      "/tools/image-resizer",
    );
    expect(
      screen.getByRole("link", {
        name: "Blackburn Studio Web Image Resizer showing batch image sizing, output dimensions and metadata options",
      }),
    ).toHaveAttribute("href", "/tools/image-resizer");
    expect(screen.getByRole("heading", { name: "QR Code Generator" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View QR Code Generator" })).toHaveAttribute(
      "href",
      "/tools/qr-code-generator",
    );
    expect(
      screen.getByRole("link", {
        name: "Blackburn Studio QR Code Generator interface showing controls and QR preview",
      }),
    ).toHaveAttribute("href", "/tools/qr-code-generator");
    for (const feature of [
      "PNG & SVG downloads",
      "Custom foreground & background",
      "Error correction controls",
      "Local browser generation",
    ]) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });

  it("uses the required detail metadata and launch CTA", () => {
    render(<QrCodeGeneratorPage />);

    expect(detailMetadata.title).toEqual("Free QR Code Generator");
    expect(detailMetadata.description).toEqual(
      "Create static QR codes for URLs or text and download them as PNG or SVG. QR codes are generated locally in your browser.",
    );
    expect(screen.getByRole("link", { name: "Launch QR Generator" })).toHaveAttribute(
      "href",
      "/tools/qr-code-generator/app",
    );
    expect(
      screen.getByRole("heading", {
        name: "Create clear, dependable QR codes in your browser",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Blackburn Studio QR Code Generator interface showing controls and QR preview",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Static QR code" })).toHaveLength(1);
    expect(
      screen.getByText(/The destination is stored directly in the QR code/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Simple controls, files you can use anywhere",
      }),
    ).toBeInTheDocument();
    for (const benefit of [
      "Encode a URL or arbitrary text.",
      "Choose foreground and background colours.",
      "Set error correction and a scan-friendly quiet zone.",
      "Download raster PNG or vector SVG.",
      "Generate without an account or upload.",
    ]) {
      expect(screen.getByText(benefit)).toBeInTheDocument();
    }
    expect(
      screen.getByRole("heading", { name: "Your content stays in your browser" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not uploaded to Blackburn Studio/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "A QR code that does not depend on Blackburn Studio",
      }),
    ).not.toBeInTheDocument();
  });

  it("uses the required app metadata and renders the client app shell", () => {
    render(<OnlineQrCodeGeneratorPage />);

    expect(appMetadata.title).toEqual("Online QR Code Generator");
    expect(appMetadata.description).toEqual(
      "Create and download static QR codes for URLs or text. Everything is generated locally in your browser.",
    );
    expect(screen.getByText("QR generator application")).toBeInTheDocument();
  });

  it("includes both routes in the central sitemap source", () => {
    expect(INDEXABLE_ROUTES).toContain("/tools/qr-code-generator");
    expect(INDEXABLE_ROUTES).toContain("/tools/qr-code-generator/app");
  });
});