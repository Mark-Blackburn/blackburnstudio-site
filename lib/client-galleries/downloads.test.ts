// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { unzipSync } from "fflate";
import { prepareGalleryZip, preparePhotoShare } from "./downloads";
import type { ClientGalleryAsset } from "./contracts";

const galleryId = "g_testGallery12345678";
const assets: ClientGalleryAsset[] = [1, 2, 3, 4, 5, 6].map((number) => {
  const id = `a_testAsset1234567${number}`;
  return {
    id,
    altText: `Photo ${number}`,
    width: 100,
    height: 100,
    orientation: "square",
    displayOrder: number - 1,
    webImageUrl: `/api/galleries/${galleryId}/assets/${id}/view`,
    webDownloadUrl: `/api/galleries/${galleryId}/assets/${id}/web`,
    fullDownloadUrl: `/api/galleries/${galleryId}/assets/${id}/full`,
  };
});
const jpeg = new Uint8Array([255, 216, 255, 217]);
const photoResponse = (body: Uint8Array = jpeg) =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(body);
        controller.close();
      },
    }),
    { headers: { "content-type": "image/jpeg" } },
  );
afterEach(() => vi.unstubAllGlobals());

it("creates a ZIP containing only the selected originals, preserving their bytes and order", async () => {
  const fetch = vi.fn().mockImplementation(async () => photoResponse());
  vi.stubGlobal("fetch", fetch);
  const progress = vi.fn();
  const blob = await prepareGalleryZip(
    galleryId,
    [assets[1], assets[3]],
    "full",
    new AbortController().signal,
    progress,
  );
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  expect(Object.keys(entries)).toEqual([
    "photo-001-full.jpg",
    "photo-002-full.jpg",
  ]);
  expect(entries["photo-001-full.jpg"]).toEqual(jpeg);
  expect(entries["photo-002-full.jpg"]).toEqual(jpeg);
  expect(fetch.mock.calls.map((call) => call[0])).toEqual([
    assets[1].fullDownloadUrl,
    assets[3].fullDownloadUrl,
  ]);
  expect(fetch.mock.calls[0][1]).toMatchObject({
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
  });
  expect(progress.mock.calls).toEqual([[1], [2]]);
});

it("uses the web download when preparing a shareable JPEG and exposes no link", async () => {
  const fetch = vi.fn().mockResolvedValue(photoResponse());
  vi.stubGlobal("fetch", fetch);
  const file = await preparePhotoShare(
    galleryId,
    assets[0],
    new AbortController().signal,
  );
  expect(file.name).toBe("photo-1-web.jpg");
  expect(file.type).toBe("image/jpeg");
  expect(new Uint8Array(await file.arrayBuffer())).toEqual(jpeg);
  expect(fetch.mock.calls[0][0]).toBe(assets[0].webDownloadUrl);
});

it("rejects external or wrong-gallery URLs before fetching any selected photo", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    prepareGalleryZip(
      galleryId,
      [assets[0], { ...assets[1], webDownloadUrl: "https://example.com/leak" }],
      "web",
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toThrow("unavailable");
  expect(fetch).not.toHaveBeenCalled();
});

it("stops at a rejected photo without returning a partial ZIP or fetching later photos", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(photoResponse())
    .mockResolvedValueOnce(new Response("{}", { status: 404 }));
  vi.stubGlobal("fetch", fetch);
  await expect(
    prepareGalleryZip(
      galleryId,
      assets.slice(0, 3),
      "web",
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toThrow("access may have expired");
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("bounds streamed bytes when Content-Length is absent", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(photoResponse(new Uint8Array(4 * 1024 * 1024 + 1))),
  );
  await expect(
    preparePhotoShare(galleryId, assets[0], new AbortController().signal),
  ).rejects.toThrow("too large");
});

it("enforces the cumulative ZIP limit and stops before the next large body", async () => {
  const bytes = new Uint8Array(20 * 1024 * 1024);
  const fetch = vi.fn().mockImplementation(async () => {
    const response = photoResponse(bytes);
    response.headers.set("content-length", String(bytes.length));
    return response;
  });
  vi.stubGlobal("fetch", fetch);
  await expect(
    prepareGalleryZip(
      galleryId,
      assets,
      "full",
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toThrow("Select fewer");
  expect(fetch).toHaveBeenCalledTimes(5);
});

it("cancels an in-flight stream and never fetches the next photo", async () => {
  const controller = new AbortController();
  const cancel = vi.fn();
  const fetch = vi.fn().mockImplementation(
    async () =>
      new Response(
        new ReadableStream({
          pull(stream) {
            stream.enqueue(jpeg);
            controller.abort();
          },
          cancel,
        }),
        { headers: { "content-type": "image/jpeg" } },
      ),
  );
  vi.stubGlobal("fetch", fetch);
  await expect(
    prepareGalleryZip(galleryId, assets, "web", controller.signal, vi.fn()),
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});
