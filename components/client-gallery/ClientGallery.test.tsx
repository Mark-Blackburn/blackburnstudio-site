import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientGallery } from "@/components/client-gallery/ClientGallery";
import { ClientGalleryGrid } from "@/components/client-gallery/ClientGalleryGrid";
import { ClientGalleryViewer } from "@/components/client-gallery/ClientGalleryViewer";
import {
  getSampleClientGallery,
  SAMPLE_CLIENT_GALLERY_ID,
} from "@/lib/client-galleries/fixtures/sampleClientGallery";

const gallery = getSampleClientGallery(SAMPLE_CLIENT_GALLERY_ID)!;

function installMatchMedia(reducedMotion = true) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" && reducedMotion,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("ClientGallery", () => {
  beforeEach(() => {
    installMatchMedia();
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  it("renders a variable number of ordered, keyboard-accessible image triggers", () => {
    render(
      <ClientGalleryGrid
        assets={gallery.assets.slice(0, 3)}
        onOpen={vi.fn()}
      />,
    );

    const triggers = screen.getAllByRole("button", { name: /^Open image/ });
    expect(triggers).toHaveLength(3);
    expect(triggers[0]).toHaveAttribute("type", "button");
    expect(screen.getByAltText(gallery.assets[0].altText)).toHaveAttribute(
      "referrerpolicy",
      "no-referrer",
    );
    expect(screen.getByAltText(gallery.assets[1].altText)).toHaveAttribute(
      "width",
      String(gallery.assets[1].width),
    );
  });

  it("shows the client display name when present", () => {
    render(<ClientGallery gallery={gallery} />);

    expect(
      screen.getByText(`Private gallery for ${gallery.clientDisplayName}`),
    ).toBeInTheDocument();
  });

  it("falls back to the generic private gallery copy when the client display name is missing", () => {
    render(
      <ClientGallery
        gallery={{
          ...gallery,
          clientDisplayName: "   ",
        }}
      />,
    );

    expect(screen.getByText("Private client gallery")).toBeInTheDocument();
    expect(screen.queryByText(/Private gallery for/)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it("renders nothing for an empty asset collection and does not invoke renderActions", () => {
    const renderActions = vi.fn();

    render(
      <ClientGalleryViewer
        assets={[]}
        index={0}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
        returnFocusRef={{ current: null }}
        renderActions={renderActions}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(renderActions).not.toHaveBeenCalled();
  });

  it("normalizes an index greater than the asset count", () => {
    const renderActions = vi.fn();

    render(
      <ClientGalleryViewer
        assets={gallery.assets}
        index={gallery.assets.length + 7}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
        returnFocusRef={{ current: null }}
        renderActions={renderActions}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(`8 of ${gallery.assets.length}`)).toBeInTheDocument();
    expect(
      screen.getByAltText(gallery.assets[7].altText),
    ).toBeInTheDocument();
    expect(renderActions).toHaveBeenCalledOnce();
    expect(renderActions).toHaveBeenCalledWith(gallery.assets[7]);
  });

  it("normalizes a negative index", () => {
    render(
      <ClientGalleryViewer
        assets={gallery.assets}
        index={-1}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
        returnFocusRef={{ current: null }}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(`10 of ${gallery.assets.length}`),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(gallery.assets[gallery.assets.length - 1].altText),
    ).toBeInTheDocument();
  });

  it("falls back to the first asset when the provided index is not finite", () => {
    render(
      <ClientGalleryViewer
        assets={gallery.assets}
        index={Number.NaN}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
        returnFocusRef={{ current: null }}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(`1 of ${gallery.assets.length}`)).toBeInTheDocument();
    expect(
      screen.getByAltText(gallery.assets[0].altText),
    ).toBeInTheDocument();
  });

  it("keeps a single-asset viewer open and stationary for ArrowLeft and ArrowRight", () => {
    const onIndexChange = vi.fn();
    const oneAsset = [gallery.assets[0]];

    render(
      <ClientGalleryViewer
        assets={oneAsset}
        index={0}
        onIndexChange={onIndexChange}
        onClose={vi.fn()}
        returnFocusRef={{ current: null }}
      />,
    );

    const dialog = screen.getByRole("dialog");
    const image = screen.getByAltText(oneAsset[0].altText);

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });

    expect(dialog).toBeInTheDocument();
    expect(image).toBeInTheDocument();
    expect(screen.getByText("1 of 1")).toBeInTheDocument();
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it("opens the viewer and moves focus to its close control", async () => {
    render(<ClientGallery gallery={gallery} />);

    fireEvent.click(screen.getByRole("button", { name: /^Open image 1:/ }));

    const dialog = screen.getByRole("dialog", {
      name: "Full-screen gallery viewer",
    });
    expect(dialog).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close image viewer" })).toHaveFocus(),
    );
  });

  it("closes with Escape and restores focus to the opening image", async () => {
    render(<ClientGallery gallery={gallery} />);
    const opener = screen.getByRole("button", { name: /^Open image 1:/ });
    fireEvent.click(opener);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("supports next and previous navigation when reduced motion is requested", () => {
    render(<ClientGallery gallery={gallery} />);
    fireEvent.click(screen.getByRole("button", { name: /^Open image 1:/ }));
    const dialog = screen.getByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Next image" }));
    expect(within(dialog).getByText("2 of 10")).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(within(dialog).getByText("1 of 10")).toBeInTheDocument();
  });

  it("keeps focus inside the active dialog", async () => {
    render(
      <>
        <button type="button">Outside control</button>
        <ClientGallery gallery={gallery} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Open image 1:/ }));
    const outside = screen.getByRole("button", { name: "Outside control" });
    outside.focus();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close image viewer" })).toHaveFocus(),
    );
  });

  it("wraps Tab focus within the viewer controls", () => {
    render(<ClientGallery gallery={gallery} />);
    fireEvent.click(screen.getByRole("button", { name: /^Open image 1:/ }));
    const dialog = screen.getByRole("dialog");
    const close = within(dialog).getByRole("button", {
      name: "Close image viewer",
    });
    const next = within(dialog).getByRole("button", { name: "Next image" });

    next.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(next).toHaveFocus();
  });
});