# Isolated Azure archive worker trial

The owner approved an AUD $5 allowance on 27 October 2026. This is not a hard
Azure spending cap. All trial resources belong to `rg-blackburn-archive-test`
in Australia East; production flags and resources remain unchanged. PR #57 stays
draft and unmerged. Delete the test resource group after the trial, including the
Basic registry (which has an ongoing charge while retained).

## Provisioned checkpoint

- Private storage account: `stbsarchtest05c3168d` (Standard LRS).
- Consumption environment: `cae-blackburn-archive-test`, logs destination none.
- Registry: `acrbsarchtest05c3168d` (Basic, admin credentials disabled).
- Image: `gallery-archive-worker:11e8849`, digest
  `sha256:4d3561fefc1b6bf2aa9af5c88d14cba7591f95f6e66dbe6f56dcdcdf2b008e10`.
- Identity: `id-blackburn-archive-test`, AcrPull on that registry.
- Manual job: `job-blackburn-archive-test`, 1 CPU / 2 GiB, timeout 600 seconds,
  zero replica retries, parallelism/completion count one. Created but not started.

## Prepare

From a checkout of this draft branch, run:

```bash
npm exec --yes --package=node@22 -- bash functions/scripts/prepare-gallery-archive-azure-test.sh
```

The preparation script installs/builds the Function package, grants the signed-in
operator Blob/Table access on the test account, and seeds three existing public
JPEGs from the reviewed commit. No client photograph or production key is read.
Worker Blob permissions are scoped to the source and output test containers;
Table access is scoped to the test account. The separate private control container
retains the fixture, hashes, job ID and disposable HMAC key for session recovery.
The worker has no Blob permission on that control container. The key is configured
as a job secret, never printed. The source sample is intentionally identical in
web/full variants; web resizing is outside this worker test.

The helper refuses to replace an existing seeded trial. Rerunning preparation
reuses it while queued, rather than creating duplicate jobs. If RBAC propagation
returns HTTP 403, wait a few minutes and rerun preparation. Job expiry is 24 hours;
an expired trial needs explicit replacement, not blind reseeding/retries.

## Start once and inspect

Only after preparation succeeds, start one execution:

```bash
az containerapp job start -g rg-blackburn-archive-test -n job-blackburn-archive-test
```

Creation and preparation do not start the job. This first execution uses the
test-only explicit message input; it does not exercise Storage Queue transport,
event-driven scaling, automatic retry or crash recovery.

From the checkout (compile again if the ephemeral filesystem was lost):

```bash
npm exec --yes --package=node@22 -- node functions/scripts/gallery-archive-azure-test.cjs status
npm exec --yes --package=node@22 -- node functions/scripts/gallery-archive-azure-test.cjs verify
```

Verification requires READY and a private archive container, checks persisted
Blob length/type, downloads only the small test ZIP, and uses Python `zipfile` to
verify exactly three entries, numbering/order, CRC, lengths and SHA-256 equality
with the source JPEGs. Status and test credentials are retained in private Azure
storage; they do not depend on copying terminal output.

## Remaining isolated checks

Worker success does not prove deployed HTTP authorization, GET/HEAD/206/416,
revocation, queue behavior, memory under a larger workload or multi-GB delivery
through Functions/SWA. A separate test API and controlled larger trials follow.
Production recovery, retention and request limits remain release gates.

## Cleanup

After collecting evidence, remove only the disposable group:

```bash
az group delete --subscription 05c3168d-4b17-4a13-99db-69b66106a5a4 --name rg-blackburn-archive-test --yes
```

Do not delete `rg-markblackburn-web` or any production storage resources.
