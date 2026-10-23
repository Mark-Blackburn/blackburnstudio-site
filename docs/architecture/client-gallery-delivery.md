# Private gallery photos and downloads

Builds on the [gallery access layer](client-gallery-access.md). The static client
shell now exchanges fragment credentials, loads authenticated metadata, displays
private images, and offers individual web/full-resolution JPEG downloads. The
existing labelled public sample remains separate and needs no cookie.

## Browser behavior

The loader removes any fragment with `history.replaceState` before API access,
including malformed credentials. A valid token is sent only in one JSON POST
body. It is not put in browser storage, image/download URLs, analytics or logs.
React Strict Mode effect replay shares the initial exchange promise rather than
submitting twice. Refresh without a fragment uses the existing HttpOnly cookie.
A same-gallery hash navigation starts a fresh loader, including after sign-out;
it clears the new fragment immediately and resets the signed-out state. One shell
coordinator serializes loads/exchanges and logout across all loader replacements.
Logout waits for every earlier exchange; later exchanges wait for logout. Obsolete
responses therefore settle before sign-out clears the cookie, and cannot restore
access afterwards. Failed operations do not block the remaining queue.
After a transient initial metadata failure, focus/timer refresh waits for that
attempt to settle and retries only metadata; it never repeats token exchange.
Gallery changes discard prior displayed state. Focus and a 60-second interval
recheck the current session; a failed check removes the displayed gallery.
Sign-out immediately hides photographs and shows “Signing out…” with a request
to keep the page open while queued or in-flight work finishes. Only after logout
settles does the final unavailable state appear. Successful sign-out clears the
chosen gallery cookie through its same-origin endpoint.
If sign-out cannot be confirmed, shared-device users are told to clear this
website's cookies/site data. Closing a browser does not reliably remove a
persistent session cookie.

The browser validates the response DTO and accepts only exact same-origin image
and download paths for the requested gallery and asset. Arbitrary external URLs,
SAS strings, internal fields and cross-gallery URLs cannot enter component state.
Gallery routes remain excluded from analytics and the sitemap. The generic
loading shell contains no private gallery metadata in generated HTML.

## Delivery boundary

`GET /api/galleries/{galleryId}/assets/{assetId}/{variant}` accepts only `view`,
`web` and `full`. Every metadata, image and download request validates the signed
cookie and current gallery publication, expiry, versions and link binding.
An additional check after storage IO prevents starting a successful response
when access was revoked or expired during that IO. Previously received bytes
cannot be recalled; already displayed photos may remain until the next UI check.
Each authorization lookup reads the clock again after the Table request and
checks both session and gallery expiry against that fresh time. Link exchange
also rechecks gallery expiry after storage IO before issuing a cookie.

The Table asset is looked up under that gallery's partition. Blob names are
derived from validated opaque IDs, never from caller paths or stored URLs:

```
<galleryId>/<assetId>/web.jpg
<galleryId>/<assetId>/full.jpg
```

The Function uses managed identity to read a private container and returns bytes
through the same-origin API. It issues no SAS and no storage redirect. Container
properties are checked before each Blob download; public containers are refused.
All replies use no-store, no-referrer and nosniff headers. JPEG replies use a
restrictive sandbox CSP. Downloads use generated safe attachment filenames;
original filenames and Blob paths are not exposed. Missing/failed storage reads
produce a generic failure without printing SDK details.

The first version supports JPEG only, at most 250 photographs per gallery,
4 MiB per web export and 20 MiB per full-resolution file. These are application
limits, not a claim about Azure's maximum response size. Reads have a 20-second
deadline and validate declared/actual length and JPEG signature. Responses are
buffered within these limits; there is no archive download, byte-range resume,
image conversion or support for video/RAW/PNG/WebP yet. Prepare full-resolution
JPEGs within the limit, and web exports with EXIF/location metadata removed.
Downloads retain the supplied image bytes; this service does not remove EXIF.

## Azure setup and release

Use the existing storage account, `ClientGalleries` table and a new private
`client-galleries` container. Keep account-level anonymous Blob access disabled
and storage account key authentication disabled. Runtime permissions are Table
Data Contributor on the gallery table and Blob Data Reader on the container.
The uploader separately needs operator write roles. No public upload/admin
endpoint or browser storage credentials are added.

The prepared CLI script creates those two resources, assigns scoped runtime and
operator roles, creates a dedicated Key Vault key only if missing, and supplies
gallery settings. It preserves an existing valid key and stops on other vault
errors instead of silently rotating credentials. The runtime's existing UAMI
and Key Vault reference identity/Secrets User role must remain configured.
The operator needs the Azure resource/role management and vault-secret rights
already used during contact setup. Role propagation may take a few minutes.

Run from a checkout containing both gallery PRs in Cloud Shell:

```sh
python3 functions/scripts/provision-gallery.py --apply \
  --operator-object-id 06f7482b-b478-4579-a144-3377a7d51373
```

Provisioning does not deploy code or change the enablement flags. It writes the
following additional settings:

| Setting | Value |
| --- | --- |
| `GALLERY_BLOB_ENDPOINT` | `https://stblackburnstudiodata.blob.core.windows.net` |
| `GALLERY_BLOB_CONTAINER` | `client-galleries` |
| `GALLERY_DELIVERY_ENABLED` | Set separately to `true` after Function deployment. Requires `GALLERY_API_ENABLED=true`. |

After merge, deploy **Blackburn Studio Function deployment** manually from main.
The website deploys through its existing static workflow; unpublished gallery
links remain unavailable while the backend is not enabled. Once the Function
package is deployed, enable both flags:

```sh
az functionapp config appsettings set \
  --resource-group rg-markblackburn-web --name func-blackburnstudio-api \
  --settings GALLERY_API_ENABLED=true GALLERY_DELIVERY_ENABLED=true \
  --output none

az rest --method post \
  --url "https://management.azure.com/subscriptions/05c3168d-4b17-4a13-99db-69b66106a5a4/resourceGroups/rg-markblackburn-web/providers/Microsoft.Web/sites/func-blackburnstudio-api/syncfunctiontriggers?api-version=2022-03-01" \
  --output none
```

Use one synthetic gallery for the first live check. Create its link with the
operator access CLI from the access guide. Keep that link private. Then upload
one web/full JPEG pair through the uploader, from the `functions` directory
after `npm ci && npm run build` on Node 22:

```sh
export GALLERY_TABLE_ENDPOINT=https://stblackburnstudiodata.table.core.windows.net
export GALLERY_TABLE_NAME=ClientGalleries
export GALLERY_BLOB_ENDPOINT=https://stblackburnstudiodata.blob.core.windows.net
export GALLERY_BLOB_CONTAINER=client-galleries

node scripts/upload-gallery-assets.cjs <<'JSON'
{"galleryId":"g_REPLACE_WITH_RETURNED_ID","assets":[{"webFile":"/path/to/web.jpg","fullFile":"/path/to/full.jpg","altText":"Controlled test photograph"}]}
JSON
```

The uploader uses the signed-in Azure CLI identity and never account keys. It
checks publication, expiry, container privacy, image sizes/dimensions and total
asset count. Each asset gets a new opaque ID. Uploads require create-if-absent
conditions; the metadata row is created only after both variants exist. Failed
uploads before metadata registration attempt get best-effort ETag-protected
cleanup. An ambiguous Table response preserves uploaded blobs, since the row
may have committed. Inspect unreferenced objects before retrying a failed batch;
repeating a batch can create duplicate photographs. Use one operator at a time.

Open the private link through the real website, verify the fragment disappears,
refresh successfully, view the photo and download both variants. Revoke that
test gallery and confirm new metadata/image/download requests are denied. A
signed-out browser without the link must see only the generic unavailable page.
This single controlled check establishes live cookie forwarding and private
delivery, which mocked browser/API tests cannot establish.

To disable gallery delivery, set `GALLERY_DELIVERY_ENABLED=false`; it removes
the image route and restores empty authorized asset lists. Disable the whole
gallery API with `GALLERY_API_ENABLED=false`. Contact is independent of these
flags. Neither action deletes gallery records, blobs or the key. Gallery metadata
and photo retention/deletion remains an operator responsibility in this slice;
contact retention must never enumerate gallery partitions.

## Verification

Local tests cover fragment clearing, no automatic exchange retry, Strict Mode,
returning sessions, sign-out, cross-gallery navigation, DTO whitelisting,
revocation, deterministic Blob paths, container privacy and bounded JPEG reads.
The static smoke script adds a synthetic private gallery, mobile viewer,
individual downloads and sign-out to the existing public/contact checks. It
uses a public sample photo and simulated responses, not customer data or Azure.

References:

- https://learn.microsoft.com/azure/storage/blobs/storage-blob-download-javascript
- https://learn.microsoft.com/javascript/api/@azure/storage-blob/blobclient
- https://learn.microsoft.com/rest/api/storagerp/blob-containers/create?view=rest-storagerp-2025-06-01
