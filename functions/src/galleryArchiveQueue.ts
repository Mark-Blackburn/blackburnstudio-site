import type { GalleryArchiveJobStore } from "./azureGalleryArchiveJobs";
import type { GalleryAccessStore } from "./galleryAccess";
import { archiveJobIsAccessible, ARCHIVE_JOB_ID } from "./galleryArchiveJobs";
import { GALLERY_ID } from "./galleryAccess";
import type { GalleryAssetStore } from "./azureGalleryDelivery";
import { validateArchiveSelection, type ArchiveSelection } from "./galleryArchiveSelection";

export interface ArchiveQueueMessage { galleryId: string; jobId: string }
export interface ArchiveUploadResult { blobName: string; archiveBytes: number }
export type ArchiveUploader = (
  galleryId: string, jobId: string, selection: ArchiveSelection,
  signal: AbortSignal, progress: (photos: number, bytes: number) => Promise<void>,
) => Promise<ArchiveUploadResult>;

export interface ArchiveWorkerDependencies {
  jobs: GalleryArchiveJobStore;
  access: Pick<GalleryAccessStore, "readGallery">;
  assets: GalleryAssetStore;
  upload: ArchiveUploader;
  now?: () => number;
  timeoutMs?: number;
}

export function parseArchiveQueueMessage(value: unknown): ArchiveQueueMessage {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid archive queue message");
  const item = parsed as Record<string, unknown>;
  if (typeof item.galleryId !== "string" || !GALLERY_ID.test(item.galleryId) ||
      typeof item.jobId !== "string" || !ARCHIVE_JOB_ID.test(item.jobId))
    throw new Error("Invalid archive queue identifiers");
  return { galleryId: item.galleryId, jobId: item.jobId };
}

/**
 * Queue handler: claim job by ETag, verify live publication, stream archive,
 * and publish READY only if the gallery still authorizes this job.
 * Exceptions currently mark the job failed; queue redelivery cannot retry a\n * terminal job. Production automatic retry needs attempt leases and recovery.
 */
export function createGalleryArchiveQueueHandler(deps: ArchiveWorkerDependencies) {
  const clock = deps.now ?? Date.now;
  const timeoutMs = deps.timeoutMs ?? 45 * 60 * 1000;
  return async (message: unknown): Promise<void> => {
    const { galleryId, jobId } = parseArchiveQueueMessage(message);
    let stored = await deps.jobs.read(galleryId, jobId);
    if (!stored || stored.job.status === "ready" || stored.job.status === "expired" ||
        stored.job.status === "failed") return;
    if (stored.job.status === "processing") {
      // A claimed job is not retried by a duplicate queue delivery. The
      // status endpoint detects abandoned attempts and marks them failed.
      return;
    }
    const gallery = await deps.access.readGallery(galleryId);
    if (!gallery || !archiveJobIsAccessible(stored.job, gallery, clock())) {
      await deps.jobs.update(stored, { ...stored.job, status: "expired" });
      return;
    }
    if (!await deps.jobs.update(stored, {
      ...stored.job, status: "processing", processingStartedAt: clock(),
    })) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("Archive preparation timed out")), timeoutMs);
    try {
      const selection = stored.job.selection;
      // Verify current asset metadata before streaming to reject unpublished
      // or modified photographs, not just stale IDs from the original request.
      const published = await deps.assets.listAssets(galleryId);
      const verified = validateArchiveSelection({
        variant: selection.variant,
        assetIds: selection.assets.map(asset => asset.id),
      }, published);
      if (JSON.stringify(verified) !== JSON.stringify(selection))
        throw new Error("Archive selection changed since preparation was requested");
      let lastUpdate = 0;
      const uploaded = await deps.upload(galleryId, jobId, selection, controller.signal, async (photos, bytes) => {
        controller.signal.throwIfAborted();
        const now = clock();
        if (now - lastUpdate < 3000 && photos !== selection.assets.length) return;
        const current = await deps.jobs.read(galleryId, jobId);
        const live = await deps.access.readGallery(galleryId);
        if (!current || current.job.status !== "processing" || !live ||
            !archiveJobIsAccessible(current.job, live, now))
          throw new Error("Archive authorization changed");
        if (!await deps.jobs.update(current, {
          ...current.job, photosCompleted: photos, bytesCompleted: bytes,
        })) throw new Error("Archive progress update conflicted");
        lastUpdate = now;
      });
      if (uploaded.blobName !== `${galleryId}/${jobId}.zip` ||
          !Number.isSafeInteger(uploaded.archiveBytes) ||
          uploaded.archiveBytes < selection.totalBytes ||
          uploaded.archiveBytes > selection.totalBytes + 1024 * 1024)
        throw new Error("Archive upload result invalid");
      stored = await deps.jobs.read(galleryId, jobId);
      const currentGallery = await deps.access.readGallery(galleryId);
      if (!stored || stored.job.status !== "processing" || !currentGallery ||
          !archiveJobIsAccessible(stored.job, currentGallery, clock()))
        throw new Error("Archive authorization changed");
      if (!await deps.jobs.update(stored, {
        ...stored.job, status: "ready",
        photosCompleted: selection.assets.length, bytesCompleted: selection.totalBytes,
        archiveBytes: uploaded.archiveBytes,
      })) throw new Error("Archive completion update conflicted");
    } catch (error) {
      const current = await deps.jobs.read(galleryId, jobId);
      if (current?.job.status === "processing") {
        await deps.jobs.update(current, { ...current.job, status: "failed" });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  };
}
