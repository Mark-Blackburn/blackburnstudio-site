import { render, screen } from "@testing-library/react";
import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";

import { metadata } from "@/app/clients/layout";
import ClientGalleryPage from "@/app/clients/[galleryId]/page";
import sitemap from "@/app/sitemap";
import { SAMPLE_CLIENT_GALLERY_ID } from "@/lib/client-galleries/fixtures/sampleClientGallery";

vi.mock("@/components/client-gallery", () => ({
  ClientGallery: ({ gallery }: { gallery: { title: string } }) => (
    <main>
      <h1>{gallery.title}</h1>
    </main>
  ),
  ClientGalleryUnavailable: () => (
    <main>
      <h1>This gallery is unavailable.</h1>
      <p>
        The link may no longer be active. If you believe this is an error,
        contact Blackburn Studio.
      </p>
    </main>
  ),
}));

describe("client gallery route", () => {
  it("renders the known development fixture", async () => {
    render(
      await ClientGalleryPage({
        params: Promise.resolve({ galleryId: SAMPLE_CLIENT_GALLERY_ID }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Sample Photography Gallery" }),
    ).toBeInTheDocument();
  });

  it("fails closed with the same generic state for unknown IDs", async () => {
    const first = render(
      await ClientGalleryPage({
        params: Promise.resolve({ galleryId: "g_unknown" }),
      }),
    );
    expect(
      screen.getByRole("heading", { name: "This gallery is unavailable." }),
    ).toBeInTheDocument();
    const firstCopy = first.container.textContent;
    first.unmount();

    const second = render(
      await ClientGalleryPage({
        params: Promise.resolve({ galleryId: "g_expired_or_revoked" }),
      }),
    );
    expect(second.container.textContent).toBe(firstCopy);
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