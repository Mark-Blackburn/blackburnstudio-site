import { Readable } from "node:stream";
import type { ContainerClient } from "@azure/storage-blob";
import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import type { GalleryArchiveJobStore } from "./azureGalleryArchiveJobs";
import type { GalleryAccessStore } from "./galleryAccess";
import type { GalleryAssetStore } from "./azureGalleryDelivery";
import { authorizeGalleryRequest, GALLERY_HEADERS, galleryResponse } from "./galleryHttp";
import { archiveJobIsAccessible, ARCHIVE_JOB_ID } from "./galleryArchiveJobs";

const MAX_ARCHIVE_BYTES = 300 * 25 * 1024 * 1024 + 1024 * 1024;
const unavailable = () => galleryResponse(404, { message: "Archive unavailable." });

export interface ArchiveDownloadDependencies {
  store: GalleryAccessStore;
  secret: string;
  jobs: GalleryArchiveJobStore;
  assets: GalleryAssetStore;
  container: ContainerClient;
  now?: () => number;
}

export function parseArchiveRange(value: string | null, length: number):
  { start: number; end: number } | null | "invalid" {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return "invalid";
  if (!Number.isSafeInteger(length) || length <= 0) return "invalid";
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return "invalid";
    return { start: Math.max(0, length - suffix), end: length - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : length - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start >= length || start > end) return "invalid";
  return { start, end: Math.min(end, length - 1) };
}

export function createGalleryArchiveDownloadHandler(deps: ArchiveDownloadDependencies) {
  const now = deps.now ?? Date.now;
  return async (request: HttpRequest): Promise<HttpResponseInit> => {
    if (request.method !== "GET" && request.method !== "HEAD")
      return galleryResponse(405, { message: "Method not allowed." });
    const gallery = await authorizeGalleryRequest(request, deps);
    if (!gallery) return unavailable();
    const jobId = request.params.jobId;
    if (!jobId || !ARCHIVE_JOB_ID.test(jobId)) return unavailable();
    const stored = await deps.jobs.read(gallery.id, jobId);
    if (!stored || !archiveJobIsAccessible(stored.job, gallery, now()) ||
        stored.job.status !== "ready") return unavailable();

    // Recheck container privacy on every download; no SAS or public URL.
    const properties = await deps.container.getProperties();
    if (properties.blobPublicAccess) throw new Error("Archive container is public");
    const blob = deps.container.getBlobClient(`${gallery.id}/${jobId}.zip`);
    const metadata = await blob.getProperties();
    const length = metadata.contentLength ?? NaN;
    if (stored.job.archiveBytes !== length) throw new Error("Archive size mismatch");
    if (!Number.isSafeInteger(length) || length < 100 || length > MAX_ARCHIVE_BYTES ||
        metadata.contentType !== "application/zip") throw new Error("Invalid archive blob");
    const range = request.method === "HEAD" ? null : parseArchiveRange(request.headers.get("range"), length);
    if (range === "invalid") return {
      status: 416,
      headers: { ...GALLERY_HEADERS, "Content-Range": `bytes */${length}`,
        "Accept-Ranges": "bytes" },
    };
    const start = range?.start ?? 0;
    const end = range?.end ?? length - 1;
    const size = end - start + 1;
    const headers = {
      ...GALLERY_HEADERS,
      "Content-Type": "application/zip",
      "Content-Length": String(size),
      "Content-Disposition": 'attachment; filename="blackburnstudio-gallery.zip"',
      "Accept-Ranges": "bytes",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${length}` } : {}),
    };
    // Ensure no selected photograph was removed after archive preparation.
    const published = await deps.assets.listAssets(gallery.id);
    const currentIds = new Set(published.map(asset => asset.id));
    if (stored.job.selection.assets.some(asset => !currentIds.has(asset.id))) return unavailable();
    // Do not start the private blob stream until authorization is rechecked.
    const latest = await authorizeGalleryRequest(request, deps);
    if (!latest || !archiveJobIsAccessible(stored.job, latest, now()))
      return unavailable();
    if (request.method === "HEAD") return { status: range ? 206 : 200, headers };
    const response = await blob.download(start, size, { maxRetryRequests: 0 });
    if (!response.readableStreamBody || response.contentLength !== size)
      throw new Error("Archive download stream unavailable");
    const finalAuth = await authorizeGalleryRequest(request, deps);
    if (!finalAuth || !archiveJobIsAccessible(stored.job, finalAuth, now())) {
      (response.readableStreamBody as Readable).destroy();
      return unavailable();
    }
    // Azure Functions Node v4 HTTP streaming must be enabled at host startup.
    return {
      status: range ? 206 : 200,
      headers,
      body: Readable.toWeb(response.readableStreamBody as Readable) as ReadableStream,
    };
  };
}
