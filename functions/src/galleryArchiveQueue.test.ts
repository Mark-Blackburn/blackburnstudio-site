import { expect, it, vi } from "vitest";
import { createGalleryArchiveQueueHandler, parseArchiveQueueMessage } from "./galleryArchiveQueue";
import { createArchiveJob } from "./galleryArchiveJobs";
import type { GalleryAccessRecord } from "./galleryAccess";
import type { GalleryArchiveJobStore, StoredArchiveJob } from "./azureGalleryArchiveJobs";
import type { GalleryAssetStore } from "./azureGalleryDelivery";

const now = 1800000000000;
const gallery: GalleryAccessRecord = {
  id: "g_testGallery12345678", title: "Test", clientDisplayName: "Test",
  message: "", status: "published", expiresAt: now + 3600000,
  accessTokenHash: "a".repeat(64), accessTokenVersion: 2, sessionVersion: 3,
};
const asset = {
  galleryId: gallery.id, id: "a_testAsset12345678", altText: "Test",
  width: 100, height: 100, displayOrder: 0, webByteSize: 6, fullByteSize: 6,
};
const selection = {
  variant: "full" as const, assets: [{ id: asset.id, photoNumber: 1, byteSize: 6 }], totalBytes: 6,
};
function setup() {
  let job = createArchiveJob(gallery, selection, now);
  let version = 1;
  const read = vi.fn(async () => ({ job: { ...job }, etag: String(version) } as StoredArchiveJob));
  const update = vi.fn(async (previous: StoredArchiveJob, next: typeof job) => {
    if (previous.etag !== String(version)) return false;
    job = next; version++;
    return true;
  });
  const jobs = { read, update, create: vi.fn() } as unknown as GalleryArchiveJobStore;
  const access = { readGallery: vi.fn(async () => gallery) };
  const assets = { listAssets: vi.fn(async () => [asset]), readAsset: vi.fn() } as unknown as GalleryAssetStore;
  const upload = vi.fn(async (_g, _j, _s, _signal, progress) => {
    await progress(1, 6);
    return { blobName: "private", archiveBytes: 200 };
  });
  const handler = createGalleryArchiveQueueHandler({ jobs, access, assets, upload, now: () => now });
  return { handler, jobs, access, assets, upload, getJob: () => job };
}
const message = { galleryId: gallery.id, jobId: "z_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef" };

it("rejects malformed queue messages", () => {
  expect(() => parseArchiveQueueMessage({ galleryId: "../../x", jobId: message.jobId })).toThrow();
  expect(() => parseArchiveQueueMessage("not-json")).toThrow();
  expect(parseArchiveQueueMessage(JSON.stringify(message))).toEqual(message);
});

it("claims and finishes a queued job after publication and asset checks", async () => {
  const env = setup();
  const job = env.getJob();
  await env.handler({ galleryId: gallery.id, jobId: job.id });
  expect(env.getJob().status).toBe("ready");
  expect(env.getJob().photosCompleted).toBe(1);
  expect(env.upload).toHaveBeenCalledTimes(1);
  await env.handler({ galleryId: gallery.id, jobId: job.id });
  expect(env.upload).toHaveBeenCalledTimes(1);
});

it("expires revoked jobs before reading photographs", async () => {
  const env = setup();
  env.access.readGallery.mockResolvedValue({ ...gallery, sessionVersion: 99 });
  const job = env.getJob();
  await env.handler({ galleryId: gallery.id, jobId: job.id });
  expect(env.getJob().status).toBe("expired");
  expect(env.upload).not.toHaveBeenCalled();
});

it("fails closed if an asset changes during preparation", async () => {
  const env = setup();
  (env.assets.listAssets as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...asset, fullByteSize: 10 }]);
  const job = env.getJob();
  await expect(env.handler({ galleryId: gallery.id, jobId: job.id })).rejects.toThrow("no longer available");
  expect(env.getJob().status).toBe("failed");
  expect(env.upload).not.toHaveBeenCalled();
});
