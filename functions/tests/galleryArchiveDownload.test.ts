import { Readable } from "node:stream";
import type { ContainerClient } from "@azure/storage-blob";
import { HttpRequest } from "@azure/functions";
import { expect, it, vi } from "vitest";
import { createGallerySession, galleryCookieName, type GalleryAccessRecord } from "../src/galleryAccess";
import { createArchiveJob } from "../src/galleryArchiveJobs";
import { createGalleryArchiveDownloadHandler } from "../src/galleryArchiveDownload";

const galleryId = "g_privateGallery123456";
const assetId = "a_privateAsset12345678";
const secret = "ab".repeat(32);
const now = Date.UTC(2026, 9, 26);
function harness() {
  const gallery: GalleryAccessRecord = {
    id: galleryId, title: "Private", clientDisplayName: "Test", message: "",
    expiresAt: now + 86400000, status: "published", accessTokenHash: "cd".repeat(32),
    accessTokenVersion: 1, sessionVersion: 1,
  };
  const asset = { galleryId, id: assetId, altText: "", width: 100, height: 100,
    displayOrder: 0, webByteSize: 120, fullByteSize: 120 };
  const selection = { variant: "full" as const, assets: [{ id: assetId, photoNumber: 1, byteSize: 120 }], totalBytes: 120 };
  const job = { ...createArchiveJob(gallery, selection, now), status: "ready" as const, archiveBytes: 500 };
  const stream = Readable.from([Buffer.alloc(500)]);
  const download = vi.fn(async (_offset = 0, count = 500) => ({ readableStreamBody: count === 500 ? stream : Readable.from([Buffer.alloc(count)]), contentLength: count }));
  const blob = { getProperties: vi.fn(async () => ({ contentLength: 500, contentType: "application/zip" })), download };
  const container = { getProperties: vi.fn(async () => ({ blobPublicAccess: undefined })),
    getBlobClient: vi.fn(() => blob) };
  const store = { readGallery: vi.fn(async () => gallery), consumeExchange: vi.fn(async () => true) };
  const assets = { listAssets: vi.fn(async () => [asset]), readAsset: vi.fn(async () => asset) };
  const jobs = { read: vi.fn(async () => ({ job, etag: "etag" })), create: vi.fn(async () => {}), update: vi.fn(async () => true) };
  const handler = createGalleryArchiveDownloadHandler({
    store, secret, assets, jobs, container: container as unknown as ContainerClient, now: () => now,
  });
  const session = createGallerySession(gallery, secret, now).value;
  function request(method = "GET", headers: Record<string, string> = {}, authorized = true) {
    return new HttpRequest({
      method, url: `https://www.theblackburn.studio/api/galleries/${galleryId}/archives/${job.id}/download`,
      params: { galleryId, jobId: job.id },
      headers: { ...headers, ...(authorized ? { cookie: `${galleryCookieName(galleryId)}=${session}` } : {}) },
    });
  }
  return { gallery, asset, job, stream, download, blob, container, store, assets, jobs, handler, request };
}

it("denies requests without a session before touching archive storage", async () => {
  const h = harness();
  expect((await h.handler(h.request("GET", {}, false))).status).toBe(404);
  expect(h.jobs.read).not.toHaveBeenCalled();
  expect(h.container.getProperties).not.toHaveBeenCalled();
});

it("streams ranged GET responses with exact private headers", async () => {
  const h = harness();
  const response = await h.handler(h.request("GET", { range: "bytes=100-199" }));
  expect(response.status).toBe(206);
  expect(response.headers).toMatchObject({
    "Content-Length": "100", "Content-Range": "bytes 100-199/500",
    "Content-Type": "application/zip", "Cache-Control": "no-store",
  });
  expect(h.download).toHaveBeenCalledWith(100, 100, { maxRetryRequests: 0 });
  expect(response.body).toBeDefined();
});

it("returns full metadata for HEAD with Range and never opens a blob stream", async () => {
  const h = harness();
  const response = await h.handler(h.request("HEAD", { range: "bytes=9999-10000" }));
  expect(response.status).toBe(200);
  expect(response.headers).toMatchObject({ "Content-Length": "500" });
  expect((response.headers as Record<string, string>)["Content-Range"]).toBeUndefined();
  expect(h.download).not.toHaveBeenCalled();
});

it("returns 416 for an invalid GET range without starting the download", async () => {
  const h = harness();
  const response = await h.handler(h.request("GET", { range: "bytes=999-1000" }));
  expect(response.status).toBe(416);
  expect(response.headers).toMatchObject({ "Content-Range": "bytes */500" });
  expect(h.download).not.toHaveBeenCalled();
});

it("refuses READY archives containing photographs removed after preparation", async () => {
  const h = harness();
  h.assets.listAssets.mockResolvedValue([]);
  expect((await h.handler(h.request())).status).toBe(404);
  expect(h.download).not.toHaveBeenCalled();
});

it("refuses revoked gallery before accessing archive blobs", async () => {
  const h = harness();
  h.gallery.status = "revoked";
  expect((await h.handler(h.request())).status).toBe(404);
  expect(h.container.getProperties).not.toHaveBeenCalled();
});

it("destroys an opened blob stream when authorization is revoked during download", async () => {
  const h = harness();
  h.download.mockImplementationOnce(async () => {
    h.gallery.sessionVersion++;
    return { readableStreamBody: h.stream, contentLength: 500 };
  });
  const destroy = vi.spyOn(h.stream, "destroy");
  const response = await h.handler(h.request());
  expect(response.status).toBe(404);
  expect(destroy).toHaveBeenCalled();
});



it("streams a complete GET response with the exact full length", async () => {
  const h = harness();
  const response = await h.handler(h.request());
  expect(response.status).toBe(200);
  expect(response.headers).toMatchObject({ "Content-Length": "500", "Content-Type": "application/zip", "Cache-Control": "no-store" });
  expect((response.headers as Record<string, string>)["Content-Range"]).toBeUndefined();
  expect(h.download).toHaveBeenCalledWith(0, 500, { maxRetryRequests: 0 });
  expect((await new Response(response.body as ReadableStream).arrayBuffer()).byteLength).toBe(500);
});
