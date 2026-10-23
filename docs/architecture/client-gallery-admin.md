# Gallery administration

The `/admin/galleries` screen manages the existing private-gallery service. It
lists galleries with continuation paging, creates published galleries with an
expiry, generates a replacement link, revokes access, and uploads JPEG pairs.
A new/replacement bearer link is shown only in the current view, with Copy and
Open controls. Save it before changing gallery or leaving. Stored hashes cannot
recover old links; replacement invalidates the previous link and all sessions.
Admin metadata and issuing responses include a non-secret access-token version.
The issuing response uses the exact committed version, not a later read. The UI
retains it with the displayed link and clears that link when refresh observes a
different version, including replacement by another operator. An unchanged
version preserves a still-active link.

## Authentication and release

No new password system or public upload capability. The screen uses SWA's
Microsoft (`aad`) sign-in. Every admin API request requires a platform principal
with `authenticated` and `gallery-admin` roles, as well as the `aad` provider and
nonempty user ID. SWA `/api/admin/*` route authorization independently requires
`gallery-admin`. POSTs require the exact configured public Origin, including
multipart uploads. A client gallery link/cookie never grants admin privileges.

This boundary relies on the linked Function's App Service Authentication v2
accepting only the SWA integration. Do not enable administration on a directly
anonymous Function or one with additional identity providers. The application
must not trust an externally supplied principal on such an endpoint. Confirm
this in **Function App → Authentication**, and check the direct Function URL
rejects a request carrying a forged gallery-admin principal. Local mock tests
cannot establish live ingress/header protection.

Sources:
- https://learn.microsoft.com/azure/static-web-apps/user-information
- https://learn.microsoft.com/azure/static-web-apps/functions-bring-your-own#security-constraints
- https://learn.microsoft.com/azure/static-web-apps/authentication-authorization

Release order:

1. Merge and allow the static website deployment to finish. Manually run the
   Function deployment from main, as with the gallery delivery slice.
2. In **swa-blackburnstudio-v2 → Role management**, invite the operator's Microsoft
   account with provider Microsoft Entra ID and role `gallery-admin`. Accept the
   invitation using that account, then sign in at `/admin/galleries`.
3. Verify the Function ingress authentication described above. Give its existing
   managed identity **Storage Blob Data Contributor**, scoped only to the
   `client-galleries` container. It already has scoped Table Data Contributor.
   Keep contact roles unchanged. Example Cloud Shell command:

   ```bash
   GALLERY_RUNTIME_ID=$(az identity show --resource-group rg-markblackburn-web \
     --name func-blackburnstudio-api-uami --query principalId --output tsv)
   az role assignment create --assignee-object-id "$GALLERY_RUNTIME_ID" \
     --assignee-principal-type ServicePrincipal \
     --role "Storage Blob Data Contributor" \
     --scope /subscriptions/05c3168d-4b17-4a13-99db-69b66106a5a4/resourceGroups/rg-markblackburn-web/providers/Microsoft.Storage/storageAccounts/stblackburnstudiodata/blobServices/default/containers/client-galleries \
     --output none
   ```

4. Set `GALLERY_ADMIN_ENABLED=true` on the Function, then sync its triggers using
   the existing deployment instructions. API and delivery flags remain enabled.
   Default/unset leaves all admin routes absent. No provisioning or enablement
   is performed by this PR. To disable admin, set this flag false; client access
   and contact remain independent.
5. One controlled check: anonymous and ordinary authenticated visitors cannot
   call admin APIs; the invited Microsoft account can create a test gallery,
   copy its link and upload a JPEG. Open the client link, verify a 2048px-or-smaller
   web download versus the original full JPEG, then replace/revoke access. Test
   a small multi-file upload and confirm the admin never receives a storage key,
   SAS, original Blob path, or stored bearer hash. Keep the test link private.

## Upload behavior and limits

The browser generates a JPEG at up to 2048 pixels on the longest edge, JPEG
quality .85, without copying EXIF. Smaller images are not enlarged. The full
JPEG is unchanged and retains metadata; the screen explicitly says so. Operator
input is JPEG-only, 20 MiB full / 4 MiB web; multipart bodies have a streamed
25 MiB ceiling. Both variants are checked for JPEG headers, size and dimensions
on the server. Web dimensions cannot exceed 2048px. No filenames select Blob
paths. There is no server native image processor or new runtime dependency.

The browser uploads one photo at a time, publishes only after both private
Blobs exist, and reports progress and partial completion. There are no automatic
mutation retries. If a response is lost, the current photo might be published;
the screen stops, clears the file selection, and warns the operator to inspect
the gallery before retrying. This is not a resumable/background uploader. Keep
the page open; navigation while busy triggers the browser's leave-page prompt.

Publication uses a conditional Azure Table transaction in the photo partition.
A reserved `__allocation_v1` row tracks asset count and next display order. The
transaction updates that row with its exact ETag and creates the photo record
atomically. A stale writer cannot publish after another uploader advances the
allocation, even if its request was delayed for minutes. There is no Blob lease
or application-level retry of failed publication. Ambiguous completion preserves
the uploaded bytes, since a metadata row may have committed.

Both the admin API and the updated CLI use this protocol. Existing galleries
bootstrap the count/order from their current asset rows with create-if-absent;
concurrent initializers converge on the winning row. Readers validate and skip
the allocation row, so 250 photographs still list correctly. Stop old CLI
processes before deploying this version and rebuild the CLI before using it
again: older binaries do not participate in conditional allocation. After the
first allocation row exists, keep a compatible Function reader when rolling
back; the pre-admin reader does not recognize that row.

Sidebar refresh also refreshes the selected gallery independently if its record
is outside the returned page. A failed selected-record refresh clears its panel
and link. Newly created links are preserved when their gallery remains active.
HTTP 400 shows public validation guidance; POST transport/response failures
explicitly warn that a photo or other change may have committed, and ask the
operator to inspect before retrying. No mutation is retried automatically.

First-version boundaries: no photo deletion, gallery editing, ZIP downloads or
background conversion. Revoked/expired galleries cannot be uploaded to or
reactivated by link replacement. Admin list JSON exposes only display metadata,
not credentials. Admin pages are noindex and excluded from existing analytics
and sitemap generation. All admin API responses are no-store; API errors never
log bearer links, image bytes, SDK details or principal contents.
