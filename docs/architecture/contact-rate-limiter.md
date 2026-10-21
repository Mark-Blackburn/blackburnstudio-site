# Durable contact limiter: gallery runtime prerequisite

The gallery runtime migration also moves contact submission to the linked
Function App. This slice adds shared contact rate-limit storage before that
migration. It does not enable static export, deploy Azure resources, change
the existing browser contact transport, or add gallery authentication/storage.

## Settings for the deployed Function App

| Setting | Value |
| --- | --- |
| `CONTACT_RATE_LIMIT_MODE` | `table` |
| `CONTACT_RATE_LIMIT_TABLE_ENDPOINT` | HTTPS Table service origin, e.g. `https://<account>.table.core.windows.net` |
| `CONTACT_RATE_LIMIT_TABLE_NAME` | Pre-created table, e.g. `ContactRateLimits` |
| `CONTACT_RATE_LIMIT_HMAC_KEY` | 64 hexadecimal characters representing 32 cryptographically random bytes; supply through a Key Vault reference |

Use `DefaultAzureCredential` with the Function's managed identity in Azure.
Local Table testing can use an authenticated Azure CLI identity. Never put
storage keys, SAS credentials or HMAC material in source, URLs or logs. Unresolved Key Vault references and malformed key values are rejected before
credential or storage access. No connection string is used by this adapter. All instances and environments
sharing an allowance must use the same table and HMAC key; use separate tables
and secrets for development and production. Key rotation resets the derived
identifiers and therefore resets existing allowances. Coordinate rotation
across instances; the key is required throughout a rolling deployment.

Create the table through provisioning, not from the request handler. Grant the
Function identity `Storage Table Data Contributor` scoped to that table (or a
more narrowly tailored custom entity role). Configure Key Vault reference
access separately. A missing table, denied identity or unresolved secret must
be treated as an outage. The Function performs no automatic table creation.

SDK references:
- https://learn.microsoft.com/javascript/api/@azure/data-tables/tableclient
- https://learn.microsoft.com/javascript/api/@azure/data-tables/updatetableentityoptions

## Algorithm and failure behavior

Each normalized email maps to an HMAC row key under partition `contact-email-v1`.
The row contains at most five accepted attempt timestamps. On each request,
read the row, discard entries at least one hour old, then conditionally create
or replace it using its exact ETag. A concurrent create (409) or changed ETag
(412) causes a re-read, for at most eight attempts. Other failures propagate.
Missing or wildcard ETags and malformed timestamps fail closed. Future
timestamps are retained conservatively if clocks differ. Azure host clocks
must remain synchronized.

The limiter counts attempts before the email transport runs. An email provider
failure consumes an allowance; it does not roll back and accidentally reopen
slots during concurrent traffic. Storage errors return the existing generic
503 response, while an exhausted email allowance returns 429. Neither path
sends email. No logs include addresses, HMAC keys, derived row identifiers or
SDK exception details.

The production registration injects the configured limiter. The unconfigured
handler factory fails closed. Local development can explicitly use `memory`
mode only with `AZURE_FUNCTIONS_ENVIRONMENT=Development` and no
`WEBSITE_INSTANCE_ID` or `WEBSITE_HOSTNAME`. The example local settings select
this mode; never copy it to deployed settings.

## Retention and abuse controls before cutover

Azure Table Storage has no automatic TTL for these rows. Expired timestamps
are discarded on the next submission, but inactive rows remain. The optional
`contactRateLimitRetention` timer supplies bounded cleanup with a 24-hour
inactivity threshold, well beyond the one-hour rolling window. It is disabled
unless explicitly configured. See [retention operation and validation](contact-rate-limit-retention.md)
for dry-run, ETag safeguards, scheduling, limits, monitoring and live gates.
HMAC identifiers are pseudonymous data and still need this retention policy.

This limit applies per email, not per verified sender, IP or global endpoint.
A caller changing addresses can bypass it and create additional rows. The
existing honeypot and validation remain, but managed ingress/abuse controls,
alerts, appropriate retention and traffic/cost monitoring are still required.
Do not describe this slice alone as production-ready abuse prevention.

## Validation and next deployment gate

Automated tests cover concurrent instances, restart persistence through a
shared store, rolling expiry boundaries, opaque keys, clock rollback, corrupt
records, contention exhaustion, adapter ETags, missing tables and permissions,
and configuration failures. Email transport tests remain isolated; no real
emails are sent. The shared-store concurrency tests model Table atomicity;
they are not a live Azure integration test.

Before switching the form, prove the following in an isolated deployed
environment with a controlled mail sink:

1. Provision the table, identity permissions, Key Vault secret and Function
   configuration; deploy the isolated package with its production dependencies.
2. Submit through two Function instances or restart between submissions. Five
   attempts for one normalized address succeed; the sixth returns 429. Inspect
   storage to confirm only HMAC keys and timestamps are stored.
3. Deny storage access or remove configuration and verify a generic 503 with no
   email sent and no sensitive logs. Restore settings and verify recovery.
4. Exercise retention with a concurrently updated row and confirm ETag safety.
5. Validate the static-export SWA routing and linked same-origin API; linked
   backends are unavailable in SWA PR preview environments. Keep the current
   contact Server Action until deployment parity and rollback are proven.
6. Proceed to gallery token exchange, session revocation and private image
   delivery only after the runtime path is verified.
