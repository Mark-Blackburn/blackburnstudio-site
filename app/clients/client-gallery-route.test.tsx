import { render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Metadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

import { metadata } from "@/app/clients/layout";
import ClientsPage from "@/app/clients/page";
import sitemap from "@/app/sitemap";
import {
  ClientGalleryShell,
  getClientGalleryId,
} from "@/components/client-gallery/ClientGalleryShell";
import { SAMPLE_CLIENT_GALLERY_ID } from "@/lib/client-galleries/fixtures/sampleClientGallery";
import nextConfig from "@/next.config";

describe("client gallery route", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
    usePathnameMock.mockReturnValue("/clients");
  });

  it("renders the known transitional fixture after mounting", async () => {
    usePathnameMock.mockReturnValue(
      `/clients/${SAMPLE_CLIENT_GALLERY_ID}`,
    );

    render(<ClientGalleryShell />);

    expect(
      await screen.findByRole("heading", {
        name: "Sample Photography Gallery",
      }),
    ).toBeInTheDocument();
  });

  it("fails closed with the same generic state for unknown IDs", async () => {
    usePathnameMock.mockReturnValue("/clients/g_unknown");
    const first = render(<ClientGalleryShell />);
    expect(
      await screen.findByRole("heading", {
        name: "This gallery is unavailable.",
      }),
    ).toBeInTheDocument();
    const firstCopy = first.container.textContent;
    first.unmount();

    usePathnameMock.mockReturnValue("/clients/g_expired_or_revoked");
    const second = render(<ClientGalleryShell />);
    await waitFor(() => {
      expect(second.container.textContent).toBe(firstCopy);
    });
  });

  it("renders the generic unavailable state at the shell route", async () => {
    render(<ClientGalleryShell />);

    expect(
      await screen.findByRole("heading", {
        name: "This gallery is unavailable.",
      }),
    ).toBeInTheDocument();
  });

  it("reacts to client-side pathname changes after mounting", async () => {
    usePathnameMock.mockReturnValue(
      `/clients/${SAMPLE_CLIENT_GALLERY_ID}`,
    );
    const view = render(<ClientGalleryShell />);

    expect(
      await screen.findByRole("heading", {
        name: "Sample Photography Gallery",
      }),
    ).toBeInTheDocument();

    usePathnameMock.mockReturnValue("/clients/g_unknown");
    view.rerender(<ClientGalleryShell />);

    expect(
      await screen.findByRole("heading", {
        name: "This gallery is unavailable.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Sample Photography Gallery" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    [`/clients/${SAMPLE_CLIENT_GALLERY_ID}`, SAMPLE_CLIENT_GALLERY_ID],
    [
      `/clients/g%5F7Rk3mN9xQ2vL8pT4`,
      SAMPLE_CLIENT_GALLERY_ID,
    ],
    [`/clients/${SAMPLE_CLIENT_GALLERY_ID}/`, SAMPLE_CLIENT_GALLERY_ID],
    ["/clients/%", null],
    ["/clients/%ZZ", null],
    ["/clients/foo%2Fbar", null],
    ["/clients/foo%5Cbar", null],
    ["/clients/foo/bar", null],
    ["/clients//foo", null],
    ["/clients", null],
    ["/clients/", null],
    ["/public/g_opaque", null],
  ])("parses the browser pathname %s as %s", (pathname, expected) => {
    expect(getClientGalleryId(pathname)).toBe(expected);
  });

  it("decodes the opaque segment exactly once", () => {
    expect(getClientGalleryId("/clients/foo%252Fbar")).toBe("foo%2Fbar");
  });

  it("reads only location.pathname when the URL has a query and fragment", () => {
    window.history.replaceState(
      {},
      "",
      `/clients/${SAMPLE_CLIENT_GALLERY_ID}?preview=1#access=test-token`,
    );

    expect(
      getClientGalleryId(window.location.pathname),
    ).toBe(SAMPLE_CLIENT_GALLERY_ID);
  });

  it("does not embed fixture data in the generated shell HTML", () => {
    usePathnameMock.mockReturnValue(
      `/clients/${SAMPLE_CLIENT_GALLERY_ID}`,
    );
    const html = renderToStaticMarkup(<ClientsPage />);

    expect(html).toContain("Loading private gallery");
    expect(html).not.toContain("Sample Client");
    expect(html).not.toContain("Sample Photography Gallery");
    expect(html).not.toContain("/portraits/hero.jpg");
    expect(html).not.toContain("access=");
  });

  it("configures the current Hybrid rewrite only for nested client paths", async () => {
    expect(await nextConfig.rewrites?.()).toEqual([
      {
        source: "/clients/:path+",
        destination: "/clients",
      },
    ]);
  });

  it("defines private robots metadata and explicitly clears inherited discovery metadata", () => {
    expect(metadata.robots).toBe("noindex, nofollow, noarchive");
    expect(metadata.alternates).toBeNull();
    expect(metadata.openGraph).toBeNull();
    expect(metadata.twitter).toBeNull();
  });

  it("overrides hypothetical root canonical and social metadata", () => {
    const rootMetadata: Metadata = {
      alternates: { canonical: "/future-root-canonical" },
      openGraph: {
        title: "Future root Open Graph metadata",
        images: ["/future-root-social-image.jpg"],
      },
      twitter: {
        card: "summary_large_image",
        title: "Future root Twitter metadata",
      },
    };
    const resolvedMetadata: Metadata = { ...rootMetadata, ...metadata };

    expect(resolvedMetadata.alternates).toBeNull();
    expect(resolvedMetadata.openGraph).toBeNull();
    expect(resolvedMetadata.twitter).toBeNull();
  });

  it("keeps client routes out of the public sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls.some((url) => url.includes("/clients"))).toBe(false);
    expect(urls.some((url) => url.includes(SAMPLE_CLIENT_GALLERY_ID))).toBe(
      false,
    );
  });
});