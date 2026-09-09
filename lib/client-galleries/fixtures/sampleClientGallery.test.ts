import { describe, expect, it } from "vitest";

import {
  getSampleClientGallery,
  SAMPLE_CLIENT_GALLERY_ID,
} from "@/lib/client-galleries/fixtures/sampleClientGallery";

describe("sample client gallery fixture", () => {
  it("resolves only the explicitly known opaque fixture ID", () => {
    expect(getSampleClientGallery(SAMPLE_CLIENT_GALLERY_ID)?.assets).toHaveLength(
      10,
    );
    expect(getSampleClientGallery("g_unknown")).toBeNull();
  });

  it("keeps internal gallery fields outside the client DTO", () => {
    const gallery = getSampleClientGallery(SAMPLE_CLIENT_GALLERY_ID);

    expect(gallery).not.toBeNull();
    expect(gallery).not.toHaveProperty("clientEmail");
    expect(gallery).not.toHaveProperty("accessTokenHash");
    expect(gallery).not.toHaveProperty("accessTokenVersion");
    expect(gallery).not.toHaveProperty("sessionVersion");
    expect(gallery?.assets[0]).not.toHaveProperty("webBlobPath");
    expect(gallery?.assets[0]).not.toHaveProperty("fullBlobPath");
    expect(gallery?.assets[0]).not.toHaveProperty("sasUrl");
  });

  it("contains ordered mixed-orientation public portfolio assets", () => {
    const gallery = getSampleClientGallery(SAMPLE_CLIENT_GALLERY_ID);
    const orientations = new Set(
      gallery?.assets.map((asset) => asset.orientation),
    );

    expect(orientations).toContain("portrait");
    expect(orientations).toContain("landscape");
    expect(gallery?.assets.map((asset) => asset.displayOrder)).toEqual(
      Array.from({ length: 10 }, (_, index) => index),
    );
  });
});