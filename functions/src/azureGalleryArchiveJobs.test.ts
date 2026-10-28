import { expect, it, vi } from "vitest";
import type { TableClient } from "@azure/data-tables";
import { createAzureArchiveJobStore } from "./azureGalleryArchiveJobs";
import { createArchiveJob } from "./galleryArchiveJobs";
import type { GalleryAccessRecord } from "./galleryAccess";

const now = 1800000000000;
const gallery: GalleryAccessRecord = {
  id: "g_testGallery12345678", title: "Test", clientDisplayName: "Test",
  message: "", status: "published", expiresAt: now + 3600000,
  accessTokenHash: "a".repeat(64), accessTokenVersion: 2, sessionVersion: 3,
};
const selection = {
  variant: "web" as const, assets: [{ id: "a_testAsset12345678", photoNumber: 1, byteSize: 1000 }],
  totalBytes: 1000,
};
function setup() {
  const rows = new Map<string, { partitionKey: string; rowKey: string; snapshot: string; etag: string }>();
  let revision = 0;
  const key = (partition: string, row: string) => `${partition}/${row}`;
  const table = {
    createEntity: vi.fn(async (row: { partitionKey: string; rowKey: string; snapshot: string }) => {
      const id = key(row.partitionKey, row.rowKey);
      if (rows.has(id)) throw Object.assign(new Error("Conflict"), { statusCode: 409 });
      rows.set(id, { ...row, etag: String(++revision) });
    }),
    getEntity: vi.fn(async (partition: string, row: string) => {
      const found = rows.get(key(partition, row));
      if (!found) throw Object.assign(new Error("Not found"), { statusCode: 404 });
      return found;
    }),
    updateEntity: vi.fn(async (row: { partitionKey: string; rowKey: string; snapshot: string }, _mode: string, options: { etag: string }) => {
      const id = key(row.partitionKey, row.rowKey);
      const found = rows.get(id);
      if (!found || found.etag !== options.etag)
        throw Object.assign(new Error("ETag mismatch"), { statusCode: 412 });
      rows.set(id, { ...row, etag: String(++revision) });
    }),
  };
  return { store: createAzureArchiveJobStore(table as unknown as TableClient), table, rows };
}

it("creates and reads a private durable archive snapshot", async () => {
  const { store } = setup();
  const job = createArchiveJob(gallery, selection, now);
  await store.create(job);
  const saved = await store.read(job.galleryId, job.id);
  expect(saved?.job).toEqual(job);
  expect(saved?.etag).toBeTruthy();
  expect(await store.read(job.galleryId, "z_bad")).toBeNull();
});

it("permits queued -> processing -> ready with optimistic concurrency", async () => {
  const { store } = setup();
  const job = createArchiveJob(gallery, selection, now);
  await store.create(job);
  const first = (await store.read(job.galleryId, job.id))!;
  expect(await store.update(first, { ...job, status: "processing", processingStartedAt: now })).toBe(true);
  expect(await store.update(first, { ...job, status: "processing", processingStartedAt: now })).toBe(false);
  const second = (await store.read(job.galleryId, job.id))!;
  expect(await store.update(second, { ...job, status: "ready", photosCompleted: 1, bytesCompleted: 1000, archiveBytes: 1200 })).toBe(true);
});

it("rejects identity changes, invalid state transitions and regressing progress", async () => {
  const { store } = setup();
  const job = createArchiveJob(gallery, selection, now);
  await store.create(job);
  const first = (await store.read(job.galleryId, job.id))!;
  await expect(store.update(first, { ...job, gallerySessionVersion: 99 })).rejects.toThrow("identity");
  await expect(store.update(first, { ...job, status: "ready" })).rejects.toThrow("transition");
  await store.update(first, { ...job, status: "processing", processingStartedAt: now, bytesCompleted: 500 });
  const second = (await store.read(job.galleryId, job.id))!;
  await expect(store.update(second, { ...second.job, bytesCompleted: 200 })).rejects.toThrow("transition");
});
