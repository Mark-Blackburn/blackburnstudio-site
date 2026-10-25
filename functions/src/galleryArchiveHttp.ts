import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import type { GalleryAccessStore } from "./galleryAccess";
import type { GalleryAssetStore } from "./azureGalleryDelivery";
import type { GalleryArchiveJobStore } from "./azureGalleryArchiveJobs";
import { authorizeGalleryRequest, galleryResponse } from "./galleryHttp";
import { archiveJobIsAccessible, createArchiveJob, publicArchiveStatus, ARCHIVE_JOB_ID } from "./galleryArchiveJobs";
import { validateArchiveSelection, InvalidArchiveSelection } from "./galleryArchiveSelection";

export interface ArchiveJobQueue {
  enqueue(message: { galleryId: string; jobId: string }): Promise<void>;
}

export interface ArchiveHttpDependencies {
  store: GalleryAccessStore;
  secret: string;
  origin: string;
  assets: GalleryAssetStore;
  jobs: GalleryArchiveJobStore;
  queue: ArchiveJobQueue;
  now?: () => number;
}

const MAX_BODY_BYTES = 24 * 1024;
const QUEUED_STALE_MS = 15 * 60 * 1000;
const PROCESSING_STALE_MS = 50 * 60 * 1000;
const unavailable = () => galleryResponse(404, { message: "Archive unavailable." });

async function readRequest(request: HttpRequest): Promise<unknown> {
  if (!request.body) throw new InvalidArchiveSelection("Missing archive request");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new InvalidArchiveSelection("Archive request too large");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new InvalidArchiveSelection("Invalid archive request");
  } finally {
    reader.releaseLock();
  }
}

export function createGalleryArchiveHttpHandlers(deps: ArchiveHttpDependencies) {
  const now = deps.now ?? Date.now;
  async function create(request: HttpRequest): Promise<HttpResponseInit> {
    if (request.method !== "POST") return galleryResponse(405, { message: "Method not allowed." });
    if (request.headers.get("origin") !== deps.origin ||
        ["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? ""))
      return galleryResponse(403, { message: "Request unavailable." });
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
      return galleryResponse(415, { message: "JSON required." });
    const gallery = await authorizeGalleryRequest(request, deps);
    if (!gallery) return unavailable();
    let body: unknown;
    try { body = await readRequest(request); }
    catch (error) {
      if (error instanceof InvalidArchiveSelection)
        return galleryResponse(400, { message: error.message });
      throw error;
    }
    const assets = await deps.assets.listAssets(gallery.id);
    let selection;
    try { selection = validateArchiveSelection(body, assets); }
    catch (error) {
      if (error instanceof InvalidArchiveSelection)
        return galleryResponse(400, { message: error.message });
      throw error;
    }
    const rechecked = await authorizeGalleryRequest(request, deps);
    if (!rechecked || rechecked.accessTokenVersion !== gallery.accessTokenVersion ||
        rechecked.sessionVersion !== gallery.sessionVersion) return unavailable();
    const job = createArchiveJob(rechecked, selection, now());
    await deps.jobs.create(job);
    try {
      await deps.queue.enqueue({ galleryId: gallery.id, jobId: job.id });
    } catch (error) {
      const saved = await deps.jobs.read(gallery.id, job.id);
      if (saved) await deps.jobs.update(saved, { ...saved.job, status: "failed" });
      throw error;
    }
    return galleryResponse(202, publicArchiveStatus(job));
  }

  async function status(request: HttpRequest): Promise<HttpResponseInit> {
    if (request.method !== "GET") return galleryResponse(405, { message: "Method not allowed." });
    const gallery = await authorizeGalleryRequest(request, deps);
    if (!gallery) return unavailable();
    const jobId = request.params.jobId;
    if (!jobId || !ARCHIVE_JOB_ID.test(jobId)) return unavailable();
    let saved = await deps.jobs.read(gallery.id, jobId);
    if (!saved || !archiveJobIsAccessible(saved.job, gallery, now())) return unavailable();
    // Fail abandoned jobs with an ETag guard; never overwrite a concurrent
    // successful completion. A queued job can also be stranded by lost queue
    // delivery before any worker has claimed it.
    if ((saved.job.status === "queued" && now() - saved.job.createdAt > QUEUED_STALE_MS) ||
        (saved.job.status === "processing" &&
         saved.job.processingStartedAt !== undefined &&
         now() - saved.job.processingStartedAt > PROCESSING_STALE_MS)) {
      await deps.jobs.update(saved, { ...saved.job, status: "failed" });
      saved = await deps.jobs.read(gallery.id, jobId);
      if (!saved || !archiveJobIsAccessible(saved.job, gallery, now())) return unavailable();
    }
    return galleryResponse(200, publicArchiveStatus(saved.job));
  }

  return { create, status };
}
