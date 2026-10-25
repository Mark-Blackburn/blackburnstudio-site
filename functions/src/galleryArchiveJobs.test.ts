import { expect, it } from "vitest";
import { ARCHIVE_JOB_ID, archiveJobIsAccessible, createArchiveJob, publicArchiveStatus } from "./galleryArchiveJobs";
import type { GalleryAccessRecord } from "./galleryAccess";

const now = 1_800_000_000_000;
const gallery: GalleryAccessRecord = {
  id: "g_testGallery12345678", title: "Test", clientDisplayName: "Test",
  message: "", status: "published", expiresAt: now + 3600000,
  accessTokenHash: "a".repeat(64), accessTokenVersion: 2, sessionVersion: 3,
};
const selection = {
  variant: "full" as const,
  assets: [{ id: "a_testAsset12345678", photoNumber: 3, byteSize: 5000 }],
  totalBytes: 5000,
};

it("creates an opaque archive ID with expiry no later than gallery expiry", () => {
  const job = createArchiveJob(gallery, selection, now);
  expect(job.id).toMatch(ARCHIVE_JOB_ID);
  expect(job.expiresAt).toBe(gallery.expiresAt);
  expect(job.status).toBe("queued");
  expect(archiveJobIsAccessible(job, gallery, now)).toBe(true);
  expect(publicArchiveStatus(job)).toEqual({
    jobId: job.id, status: "queued", expiresAt: new Date(job.expiresAt).toISOString(),
    photosCompleted: 0, photosTotal: 1, bytesCompleted: 0, bytesTotal: 5000,
  });
});

it("rejects revoked, expired, republished or cross-gallery jobs", () => {
  const job = createArchiveJob(gallery, selection, now);
  for (const altered of [
    { ...gallery, status: "revoked" as const },
    { ...gallery, sessionVersion: 4 },
    { ...gallery, accessTokenVersion: 3 },
    { ...gallery, id: "g_otherGallery12345678" },
  ]) expect(archiveJobIsAccessible(job, altered, now)).toBe(false);
  expect(archiveJobIsAccessible(job, gallery, job.expiresAt)).toBe(false);
  expect(() => createArchiveJob({ ...gallery, status: "revoked" }, selection, now)).toThrow();
});

it("caps archive lifetime at 24 hours even for long-lived galleries", () => {
  const job = createArchiveJob({ ...gallery, expiresAt: now + 7 * 86400000 }, selection, now);
  expect(job.expiresAt).toBe(now + 86400000);
});
