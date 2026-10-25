# Server-side client gallery archives — implementation plan (issue #55)

## Decision and scope
Supersede browser-generated multi-part ZIPs in PR #56. A 268-image / ~3.48 GB full-resolution gallery should yield **one ZIP**. The draft branch now implements authenticated archive request/status/download routes, a queue worker, private block-blob upload, ZIP64 streaming and an opt-in gallery UI. These components are **not production-ready or enabled**. Do not deploy archive routes until the durable worker, authorization, limits and cleanup are complete.

## Existing constraints verified from repository
- Next.js website is statically exported; API routes are handled by a separate Azure Functions Node 22 app.
- Gallery auth uses a signed HttpOnly cookie and `authorizeGalleryRequest`, which checks gallery state and expiry; same-origin POST protection is present for exchange/logout.
- Source images are in a private Azure Blob container, read through managed identity; metadata is in Azure Tables.
- At most 300 JPEGs per gallery, up to 25 MiB each full-resolution and 4 MiB web.
- Current per-photo Function downloads buffer each image; **do not reuse this buffered method to assemble a multi-GB archive**.

## Architecture to implement
1. **Request**: POST `/api/galleries/{galleryId}/archives` with `{variant:"full"|"web",assetIds:[...]}`. Validate origin, body size, authenticated session, publication, expiry, asset membership, duplicates and byte limits. Resolve exact photo numbers from the server's published asset ordering. Create a durable job and enqueue it; return `202 {jobId,status:"queued"}`.
2. **Worker**: queue-triggered (or Durable Functions) job reads private source Blob streams and writes a **streaming ZIP64-capable** uncompressed archive to a separate private temporary container. Use block uploads/backpressure and bounded memory; no local multi-GB file or whole-archive Buffer. Recheck gallery publication/revocation before processing, and make worker attempts idempotent.
3. **Status**: authenticated GET `/archives/{jobId}` returns queued/processing/ready/failed/expired, photos completed, bytes completed and total. Enforce ownership, gallery version, expiry and no-store.
4. **Download**: authenticated GET `/archives/{jobId}/download`, after rechecking current access. Support content length, attachment name and HTTP Range (206/416) for browser resume where runtime supports streaming; never expose Blob SAS or raw storage paths.
5. **Cleanup**: delete partial uploads on failure, expire ready archives (proposed max 24h, never beyond gallery expiry), and enforce storage lifecycle policy. Prevent duplicate/repeated requests from exhausting resources through per-gallery concurrency/size limits and job deduplication.

## Infrastructure decisions required before worker implementation
- Confirm **actual** Azure Functions hosting SKU and execution/scale/time limits; current repository does not establish the deployed SKU. Use a dedicated worker plan if the existing plan cannot reliably build a 3.48–7.5 GiB ZIP.
- Confirm queue and archive container provisioning, managed identity role scopes, lifecycle policies and budgets.
- Select ZIP library with verified ZIP64 streaming output and compatibility; use private streaming Blob upload with retries and ETag-based completion.
- Verify end-to-end routing of streamed/Range responses through the website's same-origin proxy.
- Define persistence schema for jobs, stable asset snapshot, gallery version, lease/attempt, progress, expiry and errors.

## Verification gates
- Tests for selection validation, original numbering, sparse selection, 300-image boundary and byte limits.
- Worker integration tests for exact source bytes, ZIP64 >4 GiB, failure halfway through, idempotent retry, cancellation/revocation and cleanup.
- API tests for cross-gallery access, expired session, forged IDs, duplicate requests, request-size limits, origin checks and HTTP Range.
- Smoke test on mobile and desktop, including browser refresh while processing.
- Real private 268-photo / 3.48 GB gallery: one extractable ZIP, all 268 names exactly once, no reupload, bounded memory and measured Azure costs.

## Release safety
Keep existing per-photo downloads functioning. Do not merge PR #56's 500 MB browser archive implementation. Ship server-side routes behind a separate opt-in feature flag only after worker tests and Azure provisioning are ready. Roll back by disabling the flag, leaving existing gallery access untouched.

## Implementation checkpoint (25 October 2026)
- Archive output byte count is now persisted with READY job records and checked against the private Blob's actual size on download. ZIP source numbering is revalidated against current published ordering before upload.
- The download route streams Blob data with HTTP byte-range support; runtime and reverse-proxy handling of multi-gigabyte streams **has not been verified**.
- CI builds/tests are necessary but not proof of real Azure execution, streaming ZIP compatibility or reliability.

## Blocking reliability work before enabling
1. **Worker recovery:** Processing jobs now carry a durable claim timestamp; status requests mark them failed after 50 minutes (five minutes beyond the worker timeout), so the customer can request a new archive. This is **not** an automatic retry or full lease-based recovery. Add an ETag-guarded attempt/lease with heartbeat and a scheduled reconciliation pass. Never let two attempts commit the same archive; use attempt-specific blob names or a safe conditional publication protocol.
2. **Retries and cancellation:** Current failure handler marks jobs FAILED and rethrows, so queue redelivery does not retry them. Define bounded retry classification, stale-attempt recovery and customer cancellation behavior.
3. **Request limits:** Enforce a durable per-gallery cap on active jobs, request throttling and deduplication to prevent expensive repeated 7.5 GiB preparations.
4. **Cleanup:** Add scheduled deletion of expired/revoked ready blobs and abandoned staging uploads. Confirm container lifecycle policies; an expired job must never authorize a download.
5. **HTTP behavior:** Validate Azure Functions HTTP streaming, Front Door/App Service same-origin proxy, Content-Length/Range forwarding and disconnect behavior at 3.48 GiB.
6. **ZIP correctness:** Independently extract a generated ZIP with a standard unzip implementation and test >4 GiB ZIP64 behavior.
7. **Queue configuration:** Provision private queue and archive container; verify managed-identity enqueue, dequeue and Blob/Table access. Confirm queue message encoding expectations for the trigger.
8. **Frontend:** Verify selection/status payload contracts, avoid leaking server-only flags into production unexpectedly, handle polling timeouts and preserve the prior download flow while disabled.

## Azure settings to provision only after plan validation
- `GALLERY_ARCHIVE_API_ENABLED=true` and `GALLERY_ARCHIVE_WORKER_ENABLED=true` are separate opt-in gates. `NEXT_PUBLIC_GALLERY_SERVER_ARCHIVES_ENABLED=true` enables the client UI path at build time.
- `GALLERY_ARCHIVE_QUEUE_ENDPOINT` is the HTTPS queue-service origin used for managed-identity enqueue.
- `GALLERY_ARCHIVE_QUEUE_STORAGE` is the Azure Functions queue-trigger connection prefix; configure the appropriate identity-based `__queueServiceUri` and required host storage settings.
- `GALLERY_ARCHIVE_BLOB_CONTAINER` must name a **private container distinct** from the original gallery images container.
- Confirm required least-privilege data-plane roles, hosting timeout and queue poison-message handling before activation.

## Preflight and release runbook (not executed)
1. In Azure Portal, inspect `func-blackburnstudio-api` → Overview / Scale out / Configuration. Record hosting plan name, SKU, memory, execution timeout, identity and storage account. **Do not enable archive settings until this is checked.**
2. Confirm `stblackburnstudiodata` has a private archive Blob container and a private `gallery-archive-jobs` Storage Queue. Use a dedicated container and a lifecycle rule that removes committed archive blobs after a suitable safety margin beyond 24 hours; do not delete original photographs.
3. Grant the Function App managed identity minimum required Blob Data Reader for the source container, Blob Data Contributor for the archive container, Queue Data Message Sender for the queue and Queue Data Message Processor for the worker. Confirm identity-based queue-trigger connection settings and `AzureWebJobsStorage` host permissions.
4. Test a single 3-photo archive with archive worker/API enabled in an isolated test environment and the client UI flag **off**. Confirm queue enqueue/trigger, private Blob upload, ETag job transitions, authenticated status, GET/HEAD, Range 206/416, session revocation and expiry.
5. Independently extract the ZIP and compare JPEG bytes, filename numbering and entry count; then test the actual 268-photo / 3.48 GB selection. Record time to ready, peak worker memory, download completion and Azure request/storage costs.
6. Only after passing all tests, enable the client UI flag for a controlled deployment. Preserve the existing browser download fallback and document rollback.
7. **Do not merge this draft PR on the basis of green CI alone.** Remaining blocking work includes automatic retry, stale-attempt cleanup, per-gallery request limits and tested retention.


## Hosting decision — 25 October 2026

The Azure Portal screenshots establish two distinct services:
- `func-blackburnstudio-api`: Azure Functions **Consumption Y1** (not a dedicated App Service plan). The Consumption execution ceiling is **10 minutes**, so the existing 45-minute in-process abort does **not** extend the host limit.
- `swa-blackburnstudio-v2`: **Azure Static Web Apps Standard**. This is not an App Service Standard compute plan and cannot be repurposed as an always-running ZIP worker.

**Decision:** keep the website and API on their current plans. Do not enable the existing `app.storageQueue` ZIP worker in production on Consumption Y1 for a 268-image / ~3.48 GB workload. Treat the current Function queue registration as a prototype adapter, not the target production executor.

**Preferred production executor to validate:** an event-driven Azure Container Apps Job, using the same private storage, Table job ledger, ZIP64 encoder and managed identity. The queue message must remain the durable work item. Implement a Node CLI entrypoint that claims a job and exits nonzero on failure, then deploy a Container Apps event-driven Job with queue-based scaling and a sufficiently long replica timeout. Set a maximum concurrent execution count appropriate to storage throughput and budget. A container job must not rely on the 10-minute Function limit. The worker should reuse `createConfiguredGalleryArchiveWorker` and the existing queue message format rather than duplicating archive logic.

**Important design constraints:**
- The existing queue worker marks processing jobs `failed` on caught exceptions; it does **not** implement genuine automatic retries despite the current comment. A process crash can leave a job `processing`; status polling currently marks it failed after 50 minutes. The new executor needs attempt ownership/lease renewal and a recovery/requeue path, with idempotent blob commits and cleanup of orphaned uploads.
- The current HTTP download streams a Blob through the Function App. HTTP response duration, upstream Static Web Apps routing, idle timeouts, client interruptions and resume behavior must be verified separately. Do not infer that a 3.48 GB authenticated download works merely because the ZIP worker is moved.
- Never expose archive blobs publicly or issue long-lived anonymous download URLs. Preserve session/token revocation and expiry checks at download time.
- Container Apps Jobs incur execution/resource and storage/queue costs. Compare a low-concurrency event-driven job against a dedicated Functions plan and alternative direct-to-Blob authenticated delivery using real test duration, memory and throughput; **no cost estimate is verified yet**.
- Keep `GALLERY_ARCHIVE_WORKER_ENABLED`, `GALLERY_ARCHIVE_API_ENABLED` and `NEXT_PUBLIC_GALLERY_SERVER_ARCHIVES_ENABLED` disabled in production until the end-to-end trial passes. No Azure resources or paid services have been provisioned as part of this design decision.

### Stranded queued jobs
The status endpoint also marks queued jobs failed after 15 minutes without a worker claim, using ETag concurrency protection. This is a customer-visible escape hatch, not durable automatic retry; a production queue worker must reconcile lost messages and crashed processing attempts without requiring an active browser polling session.

### Container prototype checkpoint

`functions/Dockerfile.gallery-archive` builds the Node 22 worker image; `functions/src/galleryArchiveContainerJob.ts` provides a disabled-by-default one-message entrypoint and `.github/workflows/gallery-archive-container.yml` builds the image in CI without publishing it. This entrypoint is **not** a Storage Queue consumer and must not be deployed as an event-driven Container Apps Job yet: Container Apps queue scaling creates replicas, but each replica must explicitly dequeue and acknowledge a queue message with visibility renewal, or the queue will not drain correctly. The `GALLERY_ARCHIVE_JOB_MESSAGE` environment input is suitable for isolated testing only, not automatic queue delivery.

Production prerequisites: implement a real Storage Queue consumer with managed identity, bounded dequeue visibility, renewal during ZIP upload, delete-on-terminal completion, retry/poison handling, job claim recovery and a per-job processing lease. Coordinate the existing 15-minute queued and 50-minute processing status timeouts with these leases; otherwise long-running valid work can be falsely failed. Validate container memory and ZIP integrity under representative load. Container image CI is intentionally build-only.

### Queue-consumer implementation checkpoint (26 October 2026)

The opt-in container entrypoint now supports `GALLERY_ARCHIVE_QUEUE_CONSUMER_ENABLED=true` when `GALLERY_ARCHIVE_CONTAINER_JOB_ENABLED=true` and no test-only `GALLERY_ARCHIVE_JOB_MESSAGE` is provided. `galleryArchiveQueueConsumer.ts` consumes one message, renews visibility, and acknowledges after the handler returns; `azureGalleryArchiveMessageQueue.ts` uses managed identity and Azure Storage Queue REST operations. No deployment configuration has been enabled.

**Still not production ready:** the archive handler currently marks errors terminal, so queue redelivery is not a functional retry; processing ownership does not have a recoverable heartbeat/lease; a visibility renewal error must interrupt the upload, not merely prevent acknowledgement; poison queue messages need explicit dead-letter handling; and the 50-minute status timeout must be aligned to a configurable worker deadline. These are mandatory release gates, along with verifying the Azure REST adapter against real queue responses and the full-size ZIP download path.
