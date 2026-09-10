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

The application now exposes one static-compatible `/clients` shell. For requests
whose browser URL is `/clients/<opaque-gallery-id>`, the shell renders a generic
loading state through initial hydration, then reads the current pathname through
Next.js `usePathname()` and parses the single opaque ID segment. It does not read
the access-token fragment or call an API in this slice.

The existing labelled sample remains available through a transitional
client-side fixture lookup so the gallery UI can be regression tested. It uses
only public portfolio images and is not a model for production data loading.
Production gallery metadata and assets must come from the authenticated
same-origin Function API and must never be imported into the static frontend.
The shell's generated HTML contains only a generic loading state.

Client gallery images use native `img` elements behind `ClientGalleryImage` and
`ClientGalleryViewer`. This deliberately avoids build-time static imports and
blur placeholders. A later secure implementation can replace `webImageUrl` with
an authenticated same-origin Function endpoint without redesigning the grid or
viewer.

The viewer exposes an optional `renderActions` boundary for later authorized
per-image download actions. Slice 1 does not render download controls.

## Client shell routing

The current Hybrid Next.js deployment uses the narrow
`/clients/:path+` rewrite in `next.config.ts`. It maps nested client paths to
the `/clients` page while retaining the original browser URL. The source cannot
match `/clients` itself, `/.swa/*`, `/api/*`, `/_next/*`, or unrelated public
routes and assets. The shell accepts only one decoded gallery ID segment, so
deeper paths still fail closed after reaching it.

Next.js rewrites are unsupported by static export and are intentionally
transitional. During the future static-export cutover, remove the Next rewrite
and add the equivalent route-specific rule to `staticwebapp.config.json` at the
root of the deployed static output. No static SWA rewrite is deployed by this
slice.

Direct navigation and refresh behavior still require validation against the
current Hybrid Azure Static Web Apps deployment before private client links are
enabled. The future static rewrite will require the same deployment validation
after the output model changes.