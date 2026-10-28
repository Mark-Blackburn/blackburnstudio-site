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

## Worker trial result — 28 October 2026

Execution `job-blackburn-archive-test-bqjy20y` succeeded (started
`2026-10-28T09:52:12Z`). The operator verified READY, three photos, 1,541,589 source
bytes and a 1,542,239-byte archive. Python confirmed entry numbering/order, CRC
and exact JPEG SHA-256 equality. This is real Azure worker/Blob/Table evidence.

## Direct Function HTTP trial

The operator created `func-bsarchtest05c3168d` in the test group, running Node 22
on Linux Consumption with the existing test identity. Application Insights is
disabled. This deliberately matches the current production host type for the
HTTP experiment; it does not migrate or configure production.

From the updated draft-branch checkout:

```bash
npm exec --yes --package=node@22 -- bash functions/scripts/deploy-gallery-archive-test-api.sh
npm exec --yes --package=node@22 -- node functions/scripts/gallery-archive-azure-test.cjs http-test
```

The deploy script builds and stages only the runtime files and production npm
dependencies. It uploads the package to private `archive-test-code`, grants the
test identity reader access to that container, and configures an external
package URL with managed-identity authentication (no SAS). It sets gallery API,
delivery and archive flags only on the fixed test Function App; admin, contact,
retention and the Consumption queue worker stay disabled. It restarts and syncs
that host. Failures do not trigger deployment to another app or plan.

The HTTP checker uses a synthetic signed session from the private test fixture.
It tests missing/tampered session rejection, READY status, full GET with exact
ZIP bytes, HEAD (including ignored Range), prefix/suffix ranges, two-part resume,
416 responses, wrong-origin POST and stale-selection rejection. It then
**permanently revokes only the disposable gallery** with an ETag-guarded update
and checks that the same session can no longer access status, GET or HEAD.
Successful evidence is retained privately as `http-result.json`. Rerunning the
complete suite after revocation requires a fresh trial fixture; never restore
old production token/session versions to repeat a test.

This suite does not test real browser token exchange/cookie issuance, SWA proxy
forwarding, successful queue-backed POST creation or multi-GB HTTP delivery.
Those remain separate practical checks. The offline HTTP assertion self-test
runs in Function CI and rejects simulated auth leakage, ignored ranges,
corrupted resumed bytes and ineffective revocation.

## Cleanup

After collecting evidence, remove only the disposable group:

```bash
az group delete --subscription 05c3168d-4b17-4a13-99db-69b66106a5a4 --name rg-blackburn-archive-test --yes
```

Do not delete `rg-markblackburn-web` or any production storage resources.
