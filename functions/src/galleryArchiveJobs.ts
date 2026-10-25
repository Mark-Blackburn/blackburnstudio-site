import { randomBytes } from "node:crypto";
import type { ArchiveSelection } from "./galleryArchiveSelection";
import type { GalleryAccessRecord } from "./galleryAccess";

export type ArchiveJobStatus = "queued" | "processing" | "ready" | "failed" | "expired";
export const ARCHIVE_JOB_ID = /^z_[A-Za-z0-9_-]{32}$/;
export const ARCHIVE_JOB_TTL_MS = 24 * 60 * 60 * 1000;

export interface GalleryArchiveJob {
  id: string;
  galleryId: string;
  gallerySessionVersion: number;
  galleryTokenVersion: number;
  createdAt: number;
  expiresAt: number;
  status: ArchiveJobStatus;
  selection: ArchiveSelection;
  photosCompleted: number;
  bytesCompleted: number;
  archiveBytes?: number;
  processingStartedAt?: number;
}

export function createArchiveJob(
  gallery: GalleryAccessRecord, selection: ArchiveSelection, now: number,
): GalleryArchiveJob {
  if (gallery.status !== "published" || gallery.expiresAt <= now ||
      !Number.isSafeInteger(now) || now < 0)
    throw new Error("Gallery unavailable");
  return {
    id: `z_${randomBytes(24).toString("base64url")}`,
    galleryId: gallery.id,
    gallerySessionVersion: gallery.sessionVersion,
    galleryTokenVersion: gallery.accessTokenVersion,
    createdAt: now,
    expiresAt: Math.min(gallery.expiresAt, now + ARCHIVE_JOB_TTL_MS),
    status: "queued",
    selection,
    photosCompleted: 0,
    bytesCompleted: 0,
  };
}

/** An archive must never survive publication, token or session revocation. */
export function archiveJobIsAccessible(job: GalleryArchiveJob, gallery: GalleryAccessRecord, now: number): boolean {
  return ARCHIVE_JOB_ID.test(job.id) &&
    job.galleryId === gallery.id &&
    gallery.status === "published" &&
    gallery.expiresAt > now &&
    job.expiresAt > now &&
    gallery.sessionVersion === job.gallerySessionVersion &&
    gallery.accessTokenVersion === job.galleryTokenVersion;
}

/** Never expose private selection snapshots, storage paths or worker state to clients. */
export function publicArchiveStatus(job: GalleryArchiveJob) {
  return {
    jobId: job.id,
    status: job.status,
    expiresAt: new Date(job.expiresAt).toISOString(),
    photosCompleted: job.photosCompleted,
    photosTotal: job.selection.assets.length,
    bytesCompleted: job.bytesCompleted,
    bytesTotal: job.selection.totalBytes,
  };
}
