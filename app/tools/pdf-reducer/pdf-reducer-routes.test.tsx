import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ToolsPage from "@/app/tools/page";
import PdfReducerAppPage, {
  metadata as appMetadata,
} from "@/app/tools/pdf-reducer/app/page";
import PdfReducerPage, {
  metadata as landingMetadata,
} from "@/app/tools/pdf-reducer/page";
import { INDEXABLE_ROUTES } from "@/lib/siteConfig";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tools/pdf-reducer",
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

vi.mock("@/components/tools/PdfReducerApp", () => ({
  default: () => <div>PDF reducer application</div>,
}));

describe("PDF Reducer routes", () => {
  it("adds the PDF Reducer ToolCard with the correct link", () => {
    render(<ToolsPage />);
    expect(screen.getByRole("heading", { name: "PDF Reducer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reduce a PDF" })).toHaveAttribute(
      "href",
      "/tools/pdf-reducer",
    );
    const card = screen.getByRole("heading", { name: "PDF Reducer" }).closest("article");
    expect(card).not.toBeNull();
    expect(within(card!).getByText("Structural optimisation")).toBeInTheDocument();
    expect(within(card!).getByText("Local browser processing")).toBeInTheDocument();
  });

  it("renders the indexable product page, mode copy, privacy message, and app CTA", () => {
    render(<PdfReducerPage />);
    expect(landingMetadata.title).toEqual("PDF Reducer");
    expect(landingMetadata.description).toMatch(/without uploading your document/);
    expect(
      screen.getByRole("heading", { name: "Make PDFs smaller without uploading them" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Optimize" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: "Reduce images" })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Your PDF is processed locally in your browser" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Reduce a PDF" })[0]).toHaveAttribute(
      "href",
      "/tools/pdf-reducer/app",
    );
  });

  it("keeps only the landing route indexable and marks the app noindex", () => {
    render(<PdfReducerAppPage />);
    expect(INDEXABLE_ROUTES).toContain("/tools/pdf-reducer");
    expect(INDEXABLE_ROUTES).not.toContain("/tools/pdf-reducer/app" as never);
    expect(appMetadata.robots).toMatchObject({ index: false, follow: false });
    expect(screen.getByText("PDF reducer application")).toBeInTheDocument();
  });
});
