import { HttpRequest } from "@azure/functions";
import { expect, it, vi } from "vitest";
import { createGallerySession, galleryCookieName, type GalleryAccessRecord } from "../src/galleryAccess";
import { createGalleryArchiveHttpHandlers } from "../src/galleryArchiveHttp";
import { createArchiveJob } from "../src/galleryArchiveJobs";

const galleryId = "g_privateGallery123456";
const assetId = "a_privateAsset12345678";
const secret = "ab".repeat(32);
const now = Date.UTC(2026, 9, 26);
const origin = "https://www.theblackburn.studio";
function harness() {
  let clock = now;
  const gallery: GalleryAccessRecord = {
    id: galleryId, title: "Private", clientDisplayName: "Test", message: "",
    expiresAt: now + 86400000, status: "published", accessTokenHash: "cd".repeat(32),
    accessTokenVersion: 1, sessionVersion: 1,
  };
  const asset = { galleryId, id: assetId, altText: "", width: 100, height: 100,
    displayOrder: 0, webByteSize: 120, fullByteSize: 120 };
  const selection = { variant: "full" as const, assets: [{ id: assetId, photoNumber: 1, byteSize: 120 }], totalBytes: 120 };
  const job = createArchiveJob(gallery, selection, now);
  const store = { readGallery: vi.fn(async () => gallery) };
  const assets = { listAssets: vi.fn(async () => [asset]) };
  const jobs = {
    create: vi.fn(async () => {}),
    read: vi.fn(async () => ({ job, etag: "etag" })),
    update: vi.fn(async () => true),
  };
  const queue = { enqueue: vi.fn(async () => {}) };
  const handlers = createGalleryArchiveHttpHandlers({
    store, secret, origin, assets, jobs, queue, now: () => clock,
  });
  const session = createGallerySession(gallery, secret, now).value;
  function request(method: "POST" | "GET", options: { authorized?: boolean; origin?: string; body?: string; jobId?: string } = {}) {
    const req = new HttpRequest({
      method, url: `${origin}/api/galleries/${galleryId}/archives`,
      params: { galleryId, jobId: options.jobId ?? job.id },
      headers: {
        ...(options.authorized === false ? {} : { cookie: `${galleryCookieName(galleryId)}=${session}` }),
        ...(method === "POST" ? { origin: options.origin ?? origin, "content-type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: new ReadableStream<Uint8Array>({ start(controller) {
        controller.enqueue(Buffer.from(options.body ?? JSON.stringify({ variant: "full", assetIds: [assetId] })));
        controller.close();
      } }) } : {}),
    });
    if (method === "POST") Object.defineProperty(req, "body", {
      value: new ReadableStream<Uint8Array>({ start(controller) {
        controller.enqueue(Buffer.from(options.body ?? JSON.stringify({ variant: "full", assetIds: [assetId] })));
        controller.close();
      } }), configurable: true,
    });
    return req;
  }
  return { gallery, job, store, assets, jobs, queue, handlers, request,
    setTime: (value: number) => { clock = value; } };
}

it("rejects unauthenticated archive creation without accessing assets or queue", async () => {
  const h = harness();
  expect((await h.handlers.create(h.request("POST", { authorized: false }))).status).toBe(404);
  expect(h.assets.listAssets).not.toHaveBeenCalled();
  expect(h.queue.enqueue).not.toHaveBeenCalled();
});

it("rejects cross-origin archive requests before touching gallery storage", async () => {
  const h = harness();
  expect((await h.handlers.create(h.request("POST", { origin: "https://attacker.test" }))).status).toBe(403);
  expect(h.store.readGallery).not.toHaveBeenCalled();
});

it("creates and enqueues an authenticated archive", async () => {
  const h = harness();
  const response = await h.handlers.create(h.request("POST"));
  expect(response.status).toBe(202);
  expect(h.jobs.create).toHaveBeenCalledOnce();
  expect(h.queue.enqueue).toHaveBeenCalledWith({ galleryId, jobId: expect.stringMatching(/^z_/) });
});

it("fails closed if the gallery is revoked while validating the selection", async () => {
  const h = harness();
  h.assets.listAssets.mockImplementationOnce(async () => { h.gallery.sessionVersion++; return []; });
  expect((await h.handlers.create(h.request("POST"))).status).not.toBe(202);
  expect(h.queue.enqueue).not.toHaveBeenCalled();
});

it("marks a newly created job failed when queue submission fails", async () => {
  const h = harness();
  h.queue.enqueue.mockRejectedValueOnce(new Error("queue unavailable"));
  await expect(h.handlers.create(h.request("POST"))).rejects.toThrow("queue unavailable");
  expect(h.jobs.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: "failed" }));
});

it("rejects oversized request bodies without creating an archive", async () => {
  const h = harness();
  const response = await h.handlers.create(h.request("POST", { body: " ".repeat(25000) }));
  expect(response.status).toBe(400);
  expect(h.jobs.create).not.toHaveBeenCalled();
});

it("denies status when the session expires during the final storage lookup", async () => {
  const h = harness();
  let reads = 0;
  h.store.readGallery.mockImplementation(async () => {
    if (++reads === 2) h.setTime(now + 12 * 3600000);
    return h.gallery;
  });
  const response = await h.handlers.status(h.request("GET"));
  expect(response.status).toBe(404);
});

it("does not overwrite a concurrently completed stale archive job", async () => {
  const h = harness();
  h.setTime(now + 16 * 60000);
  h.jobs.update.mockResolvedValueOnce(false);
  h.jobs.read.mockResolvedValueOnce({ job: h.job, etag: "old" })
    .mockResolvedValueOnce({ job: { ...h.job, status: "ready", archiveBytes: 500 }, etag: "new" });
  const response = await h.handlers.status(h.request("GET"));
  expect(response.status).toBe(200);
  expect(response.jsonBody).toMatchObject({ status: "ready" });
  expect(h.jobs.update).toHaveBeenCalledOnce();
});
