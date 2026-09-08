# Client gallery foundation

## Slice 1 boundary

The client gallery is intentionally fixture-only. It has no authentication,
API, Azure SDK, storage, upload, download, persistence, or customer data.

Only the opaque sample ID `g_7Rk3mN9xQ2vL8pT4` resolves to the labelled sample
fixture. Every other ID renders the same unavailable state. The fixture uses
photographs that are already part of the public Blackburn Studio portfolio.

Internal gallery records and client-facing DTOs are separate types. Components
consume only `ClientGallery` and `ClientGalleryAsset`; these omit email addresses,
token/session fields, Blob paths, and signed URLs.

## Runtime boundary

Client gallery images use native `img` elements behind `ClientGalleryImage` and
`ClientGalleryViewer`. This deliberately avoids build-time static imports and
blur placeholders. A later secure implementation can replace `webImageUrl` with
an authenticated same-origin Function endpoint without redesigning the grid or
viewer.

The viewer exposes an optional `renderActions` boundary for later authorized
per-image download actions. Slice 1 does not render download controls.

## Deployment follow-up

The local fixture route uses `app/clients/[galleryId]` and Next.js 16 asynchronous
route params. Before production client authentication is introduced, validate
the deployed Static Web Apps output model. If arbitrary dynamic paths are not
served directly, add a verified SWA rewrite from `/clients/*` to a static client
shell while retaining the opaque gallery ID in the browser URL.

Do not add that rewrite until the target SWA deployment behavior is proven.