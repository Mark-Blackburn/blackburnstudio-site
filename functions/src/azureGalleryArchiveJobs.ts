import type { TableClient } from "@azure/data-tables";
import type { GalleryArchiveJob, ArchiveJobStatus } from "./galleryArchiveJobs";
import { ARCHIVE_JOB_ID } from "./galleryArchiveJobs";
import { GALLERY_ID } from "./galleryAccess";

const PARTITION_PREFIX = "gallery-archives-";
const MAX_SNAPSHOT_CHARS = 50000;

export interface StoredArchiveJob {
  job: GalleryArchiveJob;
  etag: string;
}

export interface GalleryArchiveJobStore {
  create(job: GalleryArchiveJob): Promise<void>;
  read(galleryId: string, jobId: string): Promise<StoredArchiveJob | null>;
  update(previous: StoredArchiveJob, next: GalleryArchiveJob): Promise<boolean>;
}

const statuses: ArchiveJobStatus[] = ["queued", "processing", "ready", "failed", "expired"];

function validJob(job: GalleryArchiveJob, galleryId: string, jobId: string): boolean {
  return job.id === jobId && job.galleryId === galleryId &&
    ARCHIVE_JOB_ID.test(job.id) && GALLERY_ID.test(job.galleryId) &&
    Number.isSafeInteger(job.gallerySessionVersion) && job.gallerySessionVersion > 0 &&
    Number.isSafeInteger(job.galleryTokenVersion) && job.galleryTokenVersion > 0 &&
    Number.isSafeInteger(job.createdAt) && job.createdAt >= 0 &&
    Number.isSafeInteger(job.expiresAt) && job.expiresAt > job.createdAt &&
    statuses.includes(job.status) &&
    Number.isSafeInteger(job.photosCompleted) && job.photosCompleted >= 0 &&
    Number.isSafeInteger(job.bytesCompleted) && job.bytesCompleted >= 0 &&
    job.selection && ["web", "full"].includes(job.selection.variant) &&
    Array.isArray(job.selection.assets) &&
    job.selection.assets.length > 0 && job.selection.assets.length <= 300 &&
    job.selection.assets.every(asset =>
      typeof asset.id === "string" && /^a_[A-Za-z0-9_-]{16,64}$/.test(asset.id) &&
      Number.isSafeInteger(asset.photoNumber) && asset.photoNumber >= 1 && asset.photoNumber <= 300 &&
      Number.isSafeInteger(asset.byteSize) && asset.byteSize >= 3 && asset.byteSize <= 25 * 1024 * 1024) &&
    new Set(job.selection.assets.map(asset => asset.id)).size === job.selection.assets.length &&
    new Set(job.selection.assets.map(asset => asset.photoNumber)).size === job.selection.assets.length &&
    Number.isSafeInteger(job.selection.totalBytes) &&
    job.selection.totalBytes === job.selection.assets.reduce((n, a) => n + a.byteSize, 0) &&
    job.photosCompleted <= job.selection.assets.length &&
    job.bytesCompleted <= job.selection.totalBytes;
}

function encode(job: GalleryArchiveJob) {
  if (!validJob(job, job.galleryId, job.id)) throw new Error("Invalid archive job");
  const snapshot = JSON.stringify(job);
  if (snapshot.length > MAX_SNAPSHOT_CHARS) throw new Error("Archive snapshot too large");
  return { partitionKey: PARTITION_PREFIX + job.galleryId, rowKey: job.id, snapshot };
}

function decode(value: unknown, galleryId: string, jobId: string): GalleryArchiveJob {
  if (!value || typeof value !== "object") throw new Error("Invalid archive row");
  const row = value as { snapshot?: unknown; partitionKey?: unknown; rowKey?: unknown };
  if (row.partitionKey !== PARTITION_PREFIX + galleryId || row.rowKey !== jobId ||
      typeof row.snapshot !== "string" || row.snapshot.length > MAX_SNAPSHOT_CHARS)
    throw new Error("Invalid archive row");
  const job: GalleryArchiveJob = JSON.parse(row.snapshot);
  if (!validJob(job, galleryId, jobId)) throw new Error("Invalid archive snapshot");
  return job;
}

export function createAzureArchiveJobStore(table: TableClient): GalleryArchiveJobStore {
  return {
    async create(job) {
      await table.createEntity(encode(job));
    },
    async read(galleryId, jobId) {
      if (!GALLERY_ID.test(galleryId) || !ARCHIVE_JOB_ID.test(jobId)) return null;
      let row;
      try {
        row = await table.getEntity(PARTITION_PREFIX + galleryId, jobId);
      } catch (error) {
        if (typeof error === "object" && error !== null && "statusCode" in error &&
            error.statusCode === 404) return null;
        throw error;
      }
      if (!row.etag || row.etag === "*") throw new Error("Missing archive ETag");
      return { job: decode(row, galleryId, jobId), etag: row.etag };
    },
    async update(previous, next) {
      if (!previous.etag || previous.etag === "*" ||
          next.id !== previous.job.id || next.galleryId !== previous.job.galleryId ||
          next.createdAt !== previous.job.createdAt ||
          next.expiresAt !== previous.job.expiresAt ||
          next.gallerySessionVersion !== previous.job.gallerySessionVersion ||
          next.galleryTokenVersion !== previous.job.galleryTokenVersion ||
          JSON.stringify(next.selection) !== JSON.stringify(previous.job.selection))
        throw new Error("Archive job identity cannot change");
      const allowed: Record<ArchiveJobStatus, ArchiveJobStatus[]> = {
        queued: ["processing", "failed", "expired"],
        processing: ["processing", "ready", "failed", "expired"],
        ready: ["expired"], failed: ["expired"], expired: [],
      };
      if (!allowed[previous.job.status].includes(next.status) ||
          next.photosCompleted < previous.job.photosCompleted ||
          next.bytesCompleted < previous.job.bytesCompleted)
        throw new Error("Invalid archive job transition");
      try {
        await table.updateEntity(encode(next), "Replace", { etag: previous.etag });
        return true;
      } catch (error) {
        if (typeof error === "object" && error !== null && "statusCode" in error &&
            (error.statusCode === 412 || error.statusCode === 404)) return false;
        throw error;
      }
    },
  };
}
