import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Metadata } from "next";
import { afterEach, describe, expect, it } from "vitest";

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
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("renders the known transitional fixture from the browser pathname", () => {
    window.history.replaceState(
      {},
      "",
      `/clients/${SAMPLE_CLIENT_GALLERY_ID}?preview=1#access=test-token`,
    );

    render(<ClientGalleryShell />);

    expect(
      screen.getByRole("heading", { name: "Sample Photography Gallery" }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(
      `/clients/${SAMPLE_CLIENT_GALLERY_ID}`,
    );
    expect(window.location.search).toBe("?preview=1");
    expect(window.location.hash).toBe("#access=test-token");
  });

  it("fails closed with the same generic state for unknown IDs", () => {
    window.history.replaceState({}, "", "/clients/g_unknown");
    const first = render(<ClientGalleryShell />);
    expect(
      screen.getByRole("heading", { name: "This gallery is unavailable." }),
    ).toBeInTheDocument();
    const firstCopy = first.container.textContent;
    first.unmount();

    window.history.replaceState({}, "", "/clients/g_expired_or_revoked");
    const second = render(<ClientGalleryShell />);
    expect(second.container.textContent).toBe(firstCopy);
  });

  it("renders the generic unavailable state at the shell route", () => {
    window.history.replaceState({}, "", "/clients");

    render(<ClientGalleryShell />);

    expect(
      screen.getByRole("heading", { name: "This gallery is unavailable." }),
    ).toBeInTheDocument();
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