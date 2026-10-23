# Private gallery access API

## Delivered boundary

The subsequent [private delivery slice](client-gallery-delivery.md) connects
the browser and JPEG/download routes to this access boundary. The empty-assets
and fixture-only descriptions below describe this access slice in isolation.

The website static deployment [39868501802](https://github.com/Mark-Blackburn/blackburnstudio-site/actions/runs/39868501802)
succeeded on 23 October 2026. The operator linked `func-blackburnstudio-api`
to SWA Production and confirmed a browser migration-test enquiry showed success
and arrived by email at 10:12 Melbourne time. The latest successful Hybrid push
deployment before cutover was [39672576118](https://github.com/Mark-Blackburn/blackburnstudio-site/actions/runs/39672576118),
commit `3f8f6bd5b4e8d9fea3253419c9246231685c6dd5`.
This records contact delivery, not a full public-route, analytics or rollback test.

This slice adds the gallery's backend access layer and an operator CLI. It is
disabled by default. The static gallery shell still shows only the public sample.
No private customer photos are served yet: authorized metadata returns an empty
asset list. The next slice connects the browser fragment exchange, private Blob
images and full/web downloads to this authorization boundary. Do not send these
new access links to customers until that delivery slice is available.

## API contract

| Route | Behavior |
| --- | --- |
| `POST /api/galleries/{galleryId}/exchange` | Same-origin JSON `{ "token": "..." }` exchanges a bearer link token for a session cookie. Response contains only `{ "success": true }`. |
| `GET /api/galleries/{galleryId}` | Requires the gallery's session cookie; re-reads current gallery state and returns only display metadata. |
| `POST /api/galleries/{galleryId}/logout` | Same-origin local sign-out clears the selected gallery cookie. |

All responses, including errors, set `Cache-Control: no-store`, no-referrer and
noindex headers. Wrong credentials, unknown IDs, expired, draft, unpublished and
revoked galleries return the same generic 404. Storage/configuration failures
return generic 503 responses and log only `[gallery-api] Request failed`.
Raw tokens, cookies, record identifiers and SDK exceptions are not logged by
the handlers. Keep request-body/header logging disabled in observability tools.

Exchange and logout require an exact `Origin` match with the configured public
origin. They do not derive trust from forwarded host/IP headers or the SWA
client-principal header. The linked SWA backend protects Function ingress;
gallery authorization is separately enforced in the handler. There is no
public administrative endpoint.

## Credentials and revocation

Access links use 32 random bytes encoded as base64url in a URL fragment:
`/clients/<opaque-id>#access=<token>`. Only a gallery-bound, domain-separated
HMAC-SHA256 hash is stored. Hash comparison uses a constant-time primitive.
The upcoming browser loader must remove the fragment before starting exchange,
keep the token only in memory for that exchange, and never persist it in browser
storage or send it to analytics. The token remains reusable until revoked or
expired; possession of the link grants access.

Sessions are authenticated HMAC envelopes with a random nonce, gallery ID,
versions and absolute expiry. Cookies use a gallery-specific `__Host-` name,
`Secure`, `HttpOnly`, `SameSite=Strict`, root Path and no Domain. A session lasts
at most 12 hours and cannot outlive the gallery. Every metadata request checks
current publication status, gallery expiry, token version, session version and
a keyed binding to the current access-token hash. Deleting/recreating an ID
with a fresh token therefore does not revive an old session.

The session is signed, not encrypted; its payload contains no client names,
email addresses, Blob paths or raw access-token hash. There is no session table
or per-session cleanup job. Local logout clears the browser cookie; a copied
cookie remains valid until expiry or gallery-wide revocation. The operator's
revoke action marks the gallery revoked and increments both versions. It uses
an exact ETag to avoid overwriting concurrent changes. Revocation affects new
authorization decisions; it cannot retract data already received by a client.

## Storage and configuration

Use a separately pre-created `ClientGalleries` table, separate from contact
rate-limit data. Grant the runtime identity Table Data Contributor only on that
table. The API never provisions tables or uses storage account keys.

| Function setting | Value |
| --- | --- |
| `GALLERY_API_ENABLED` | Exact value `true` registers the three routes; unset/false leaves them absent. |
| `GALLERY_TABLE_ENDPOINT` | `https://stblackburnstudiodata.table.core.windows.net` |
| `GALLERY_TABLE_NAME` | `ClientGalleries` |
| `GALLERY_PUBLIC_ORIGIN` | `https://www.theblackburn.studio` |
| `GALLERY_ACCESS_HMAC_KEY` | Separate random 32-byte key encoded as 64 hex characters, supplied by a Key Vault reference. Do not reuse the contact limiter key. |

Missing configuration does not prevent the contact Function from registering.
Enabled gallery requests fail closed until their own configuration is valid.
Both signing and access-token hashing use this dedicated key with different
domain prefixes. Key rotation invalidates existing links and sessions; issue
new links afterward. Never expose this key through `NEXT_PUBLIC_*` variables.

Gallery records live in partition `gallery-access-v1`, row key equal to the
opaque gallery ID. Fields are `id`, `title`, `clientDisplayName`, `message`,
`status`, numeric epoch-ms `expiresAt`, `accessTokenHash`, `accessTokenVersion`
and `sessionVersion`. No email or Blob paths are needed in these access records.
Expired metadata records are denied immediately but not deleted by this slice;
their eventual retention policy is separate from contact cleanup.

All exchanges of syntactically valid IDs/tokens share a durable ceiling of 30
attempts per rolling five minutes, including unsuccessful exchanges. An exact
ETag write protects the single fixed `gallery-exchange-v1/global` row; bounded
retries fail closed. The row contains at most 30 timestamps and cannot grow
with random caller IDs. This deliberately conservative global ceiling can
temporarily block legitimate exchanges during an attack. Existing sessions do
not consume it. It is not an IP limiter or a replacement for ingress/cost controls.

## Operator CLI

After provisioning the table, runtime role and Key Vault secret named
`gallery-access-hmac-key`, the signed-in operator separately needs secret-read
permission and table-scoped write permission. The CLI uses `AzureCliCredential`
for Table access and captures the secret through Azure CLI without printing it.
It is excluded from the runtime package by the deployment workflow's explicit
file staging. Run from `functions` after `npm ci && npm run build` on Node 22:

```sh
export GALLERY_TABLE_ENDPOINT=https://stblackburnstudiodata.table.core.windows.net
export GALLERY_TABLE_NAME=ClientGalleries
export GALLERY_PUBLIC_ORIGIN=https://www.theblackburn.studio
export GALLERY_KEY_VAULT_NAME=kv-blackburnstudio01

node scripts/manage-gallery-access.cjs create <<'JSON'
{"title":"Controlled validation gallery","clientDisplayName":"Test client","message":"Validation only","expiresAt":"2026-11-01T00:00:00Z"}
JSON
```

Create generates an opaque ID and bearer token, creates rather than upserts the
record, and prints the access link once. Treat the terminal output as a secret;
do not paste it into a PR, logs or this public repository. Expiry must be in the
future and at most 366 days away. To revoke, provide the returned ID only:

```sh
node scripts/manage-gallery-access.cjs revoke <<'JSON'
{"id":"g_REPLACE_WITH_RETURNED_ID"}
JSON
```

## Validation and remaining delivery work

Function tests cover token exchange, origin/body checks, cookie flags, expiry,
cross-gallery isolation, session tampering, version/hash revocation, generic
errors and metadata field whitelisting. Adapter tests cover shared budgets,
conditional writes under competing creates/updates, expiry, malformed rows,
bounded contention, missing tables and authorization outages. These are local
contract tests, not live Azure or SWA cookie-forwarding evidence.

Before enabling real links, implement and test the browser loader and private
asset routes. Each image/download route must reuse the same fresh gallery
authorization, resolve only that gallery's approved assets, and enforce private
storage and response headers. Validate one synthetic gallery end to end through
the linked SWA, including revocation; keep the public sample as a separate fixture.

References:

- https://learn.microsoft.com/javascript/api/@azure/functions/httpresponseinit
- https://learn.microsoft.com/javascript/api/@azure/data-tables/tableclient
- https://learn.microsoft.com/azure/static-web-apps/functions-bring-your-own
