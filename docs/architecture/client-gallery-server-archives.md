# Server-side client gallery archives — implementation plan (issue #55)

## Decision and scope
Supersede browser-generated multi-part ZIPs in PR #56. A 268-image / ~3.48 GB full-resolution gallery should yield **one ZIP**. This branch starts with the server-side selection validation contract; **it does not yet generate or serve archives**. Do not deploy archive routes until the durable worker, authorization, limits and cleanup are complete.

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
