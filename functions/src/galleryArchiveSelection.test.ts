import { expect, it } from "vitest";
import { archiveEntryName, validateArchiveSelection } from "./galleryArchiveSelection";
import type { PrivateGalleryAsset } from "./galleryAssets";

const assets: PrivateGalleryAsset[] = [1, 2, 3].map((n) => ({
  galleryId: "g_testGallery12345678", id: `a_testAsset1234567${n}`,
  altText: `Photo ${n}`, width: 100, height: 100, displayOrder: n - 1,
  webByteSize: 1000, fullByteSize: 5000,
}));

it("uses published order for numbering while preserving selection order", () => {
  const result = validateArchiveSelection(
    { variant: "full", assetIds: [assets[2].id, assets[0].id] }, assets,
  );
  expect(result).toEqual({
    variant: "full", totalBytes: 10000,
    assets: [
      { id: assets[2].id, photoNumber: 3, byteSize: 5000 },
      { id: assets[0].id, photoNumber: 1, byteSize: 5000 },
    ],
  });
  expect(result.assets.map(a => archiveEntryName(a.photoNumber, result.variant)))
    .toEqual(["photo-003-full.jpg", "photo-001-full.jpg"]);
});

it("rejects duplicate, unknown, empty and malformed selections", () => {
  for (const value of [
    null, {}, { variant: "other", assetIds: [assets[0].id] },
    { variant: "web", assetIds: [] },
    { variant: "web", assetIds: [assets[0].id, assets[0].id] },
    { variant: "web", assetIds: ["a_unknown"] },
    { variant: "web", assetIds: [1] },
  ]) expect(() => validateArchiveSelection(value, assets)).toThrow();
});

it("rejects invalid server-owned sizes and duplicate published IDs", () => {
  expect(() => validateArchiveSelection({ variant: "full", assetIds: [assets[0].id] },
    [{ ...assets[0], fullByteSize: 26 * 1024 * 1024 }])).toThrow();
  expect(() => validateArchiveSelection({ variant: "web", assetIds: [assets[0].id] },
    [assets[0], assets[0]])).toThrow();
});

it("rejects invalid entry numbers", () => {
  expect(() => archiveEntryName(0, "web")).toThrow();
  expect(() => archiveEntryName(301, "full")).toThrow();
});
