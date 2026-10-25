import { expect, it, vi } from "vitest";
import { runGalleryArchiveContainerJob } from "./galleryArchiveContainerJob";

const valid = { galleryId: "g_testGallery12345678", jobId: "z_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef" };

it("fails closed unless container execution is explicitly enabled", async () => {
  const run = vi.fn();
  await expect(runGalleryArchiveContainerJob({ GALLERY_ARCHIVE_JOB_MESSAGE: JSON.stringify(valid) }, run))
    .rejects.toThrow("disabled");
  expect(run).not.toHaveBeenCalled();
});

it("rejects malformed or missing job messages before running", async () => {
  const run = vi.fn();
  const env = { GALLERY_ARCHIVE_CONTAINER_JOB_ENABLED: "true" };
  await expect(runGalleryArchiveContainerJob(env, run)).rejects.toThrow("Missing");
  await expect(runGalleryArchiveContainerJob({ ...env, GALLERY_ARCHIVE_JOB_MESSAGE: "{}" }, run))
    .rejects.toThrow("Invalid");
  expect(run).not.toHaveBeenCalled();
});

it("passes validated queue identifiers to the existing archive worker", async () => {
  const run = vi.fn(async () => {});
  await runGalleryArchiveContainerJob({
    GALLERY_ARCHIVE_CONTAINER_JOB_ENABLED: "true",
    GALLERY_ARCHIVE_JOB_MESSAGE: JSON.stringify(valid),
  }, run);
  expect(run).toHaveBeenCalledExactlyOnceWith(valid);
});

it("propagates worker failure as a nonzero-process condition", async () => {
  const run = vi.fn(async () => { throw new Error("upload failed"); });
  await expect(runGalleryArchiveContainerJob({
    GALLERY_ARCHIVE_CONTAINER_JOB_ENABLED: "true",
    GALLERY_ARCHIVE_JOB_MESSAGE: JSON.stringify(valid),
  }, run)).rejects.toThrow("upload failed");
});
