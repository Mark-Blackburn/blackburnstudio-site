# Contact rate-limit retention

## Scope and policy

The contact limiter stores pseudonymous HMAC row keys and a bounded list of
attempt timestamps. Active rows keep enforcing the rolling one-hour limit.
The optional maintenance timer removes inactive records with a service-maintained
`Timestamp` strictly older than 24 hours. Normal operation therefore targets
roughly 24–25 hours of inactivity before removal; outages, backlog or preserved
unsafe rows can extend this. It is not an automatic Table TTL or a retention SLA.

Maintenance never creates a table, rotates an HMAC key, clears a partition or
resets active allowances. It uses the same preconfigured Table endpoint and
table name as the limiter, through the runtime managed identity. No HMAC secret
or email credential is needed by the cleanup operation. The existing
table-scoped Storage Table Data Contributor role includes entity deletion;
do not widen it to the account or subscription for this timer.

## Configuration and deployment

| `CONTACT_RATE_LIMIT_RETENTION_MODE` | Behavior |
| --- | --- |
| Unset, empty, or `disabled` | No maintenance timer registered. |
| `dry-run` | Timer counts eligible records without deleting them. |
| `delete` | Timer deletes eligible records using exact ETags. |
| Any other nonempty value | Registered timer fails safely with a generic configuration error. |

The schedule is `0 15 * * * *`: minute 15 of every hour in the Function host's
timezone (UTC by default). `runOnStartup` is false and `useMonitor` is true.
Timer monitoring uses `AzureWebJobsStorage`, separately from the application
data table. Verify the runtime identity's existing host Blob Storage permissions
and confirm the timer is indexed after configuration changes and host restart.
No additional HTTP maintenance endpoint or public deletion route is exposed.

Merge and manually deploy the Function package before enabling maintenance.
Start with `dry-run`, observe a scheduled invocation and verify its counts.
Use `delete` only after the isolated live validation below and a review of the
dry-run results. Setting an app setting restarts the app; because indexing is
conditional, always check the Function list after enabling or disabling it.
Neither merging nor deploying with the setting unset deletes records.

Example dry-run configuration (prints no application settings):

```bash
az functionapp config appsettings set \
  --resource-group rg-markblackburn-web \
  --name func-blackburnstudio-api \
  --settings CONTACT_RATE_LIMIT_RETENTION_MODE=dry-run \
  --output none
```

## Safeguards and limits

The query is restricted to partition `contact-email-v1` and old service
timestamps. It selects only the keys, service timestamp, ETag metadata and
attempt timestamps. Every result is independently checked before deletion:

- The partition and HMAC key shape must match the limiter's records.
- The service timestamp must be valid and strictly older than the fixed cutoff.
- The stored attempts must be a valid array of at most five nonnegative integer
  timestamps. All must have left the one-hour window; future attempts are kept.
- The enumerated ETag must be present, nonblank and not a wildcard.

Deletion sends that exact ETag as `If-Match`. A concurrent submission changes
the entity ETag, causing 412; maintenance preserves the updated record without
retrying deletion. A record already removed by another invocation is benign.
If cleanup wins the race before a contact submission's conditional replacement,
the contact adapter treats that missing entity as a bounded conflict: it re-reads
and conditionally creates the new allowance. A missing table still fails closed.
Missing tables, permission failures, unknown 404s and other storage outages stop
the invocation. There is no unconditional delete or fallback to memory.

Each invocation examines at most 500 returned records and runs storage work
under a 45-second abort signal. Query paging is handled by the SDK; it can fetch
a page larger than the processing cap. Partial deletions can occur before a
timeout or storage failure, and subsequent scheduled runs resume by querying
remaining old rows. Capacity is at most 500 deletions per hour. This is intended
for this site's initial traffic, not unrestricted high-volume ingestion.

Preserved unsafe records count towards the cap. A large block of corrupt rows
can prevent progress beyond that block; alert and investigate rather than
automatically removing them. Table filters on timestamp are not a secondary
index: query cost can grow with the partition, so monitor storage traffic as well
as deletion counts. Successful dry runs still read storage and do not clean it.

## Logs and monitoring

Completion logs contain mode and counts only: `scanned`, `eligible`, `deleted`,
`conflicts`, `skipped`, `limitReached`. No addresses, HMAC keys, row identifiers,
SDK exception bodies or tokens are logged. Failures emit a generic error and
throw a fresh generic exception, so the host can mark the invocation failed
without recording the original SDK error.

Before cutover, configure and verify monitoring for failed or missing timer
invocations, repeated `limitReached`, and nonzero `skipped` results. Watch contact
503/429 rates, storage growth and costs as described in the limiter guide.
If cleanup fails, contact limits continue to use the same durable state; data
retention needs attention, rather than disabling enforcement.

## Validation gates

Automated tests cover dry-run behavior, age boundaries, malformed and active
records, exact ETag deletion, concurrent updates, already-deleted rows, missing
tables and permission failures, scan bounds, clocks and log sanitization. A real
TableClient test uses a simulated HTTP transport to verify SDK Timestamp/ETag
deserialization and the outgoing `If-Match` header. Registration tests verify
that maintenance remains opt-in and never runs on startup. These tests send no
email and do not delete Azure data.

Follow this live Azure validation procedure. Results recorded on 22 October 2026
are in [the live validation record](contact-retention-validation-2026-10-22.md);
its remaining production and monitoring checks still apply:

1. Use a dedicated temporary validation table and a table-scoped test identity.
   Confirm query and delete access without broadening production permissions.
2. Seed fixture records, enumerate an old candidate, update it concurrently and
   confirm deletion with the old ETag returns 412 and preserves the new attempts.
   Verify unchanged expired fixtures are removable. Azure's service timestamp
   cannot be backdated: either age fixtures for 24 hours, or run the exported
   cleanup function with a controlled advanced clock against that temporary
   table only. Never advance the cleanup clock against production records.
3. Prove a denied table operation fails, contains no sensitive logs, and recovers
   when the isolated test configuration is restored. Remove temporary fixtures
   and test permissions after recording results.
4. Observe production `dry-run`. Newly created records may legitimately produce
   zero eligible results for the first 24 hours. Verify the selected table and
   expected counts before enabling `delete`.
5. Enable `delete`, confirm a scheduled run and check actual old-record removal
   while current allowances remain enforced. Record those results before
   enabling the website's static cutover switch.

To stop maintenance, set the mode to `disabled` and verify the timer is no
longer indexed. This leaves contact enforcement and its stored rows intact.

References:

- https://learn.microsoft.com/azure/azure-functions/functions-bindings-timer
- https://learn.microsoft.com/javascript/api/@azure/data-tables/tableclient
