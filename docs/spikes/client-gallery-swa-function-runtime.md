# Client Gallery SWA / Function Runtime Spike

## Decision

Adopt **Option A**: static-export the Blackburn Studio frontend and use a
linked, bring-your-own Node 22 Azure Function App for same-origin `/api`.

This is the only assessed option that is both supported by Azure Static Web
Apps (SWA) documentation and provides the planned backend capabilities:
managed identity, private Blob and Table Storage access, Key Vault references,
short-lived SAS issuance, and an SWA-routed same-origin API.

This spike makes no deployment, application, authentication, storage, or Azure
resource changes.

## Current Deployment Model

### Repository-derived findings

- The repository uses Next.js `16.3.3`, App Router, and Node
  `>=22.12.0 <23`.
- `next.config.ts` only sets `images.unoptimized`; it does not set
  `output: "export"`.
- The SWA workflow has `app_location: "/"`, `api_location: ""`, and
  `output_location: ""`.
- `npm run build` on Node `v22.23.2` succeeded and produced these dynamic
  routes:
  - `/clients/[galleryId]`
  - `/contact`
- All other listed application routes were static in the build output.
- There are no `app/**/route.ts` Route Handlers.
- `/clients/[galleryId]` is an async Server Component. It awaits `params` and
  performs a server-side lookup of the sample fixture.
- `/contact` is an async Server Component. It awaits request search parameters
  to preselect contact services.
- `ContactEnquiryForm` calls the `"use server"` `submitContactForm` action.
  The action validates, rate limits in memory, reads Resend-related environment
  variables, and sends through Resend.

The application therefore currently depends on SWA's managed Hybrid Next.js
backend for dynamic route rendering and the Server Action.

### Microsoft-documented constraints

Microsoft describes Hybrid Next.js on SWA as preview support for Server
Components, SSR, and Next Route Handlers. Its Hybrid Next.js guide explicitly
lists linked Azure Functions, App Service, Container Apps, and API Management
as unsupported linked API integrations.

Sources:

- https://learn.microsoft.com/azure/static-web-apps/deploy-nextjs-hybrid
- https://learn.microsoft.com/azure/static-web-apps/apis-overview

The installed `node_modules/next/dist/docs` directory was not present in this
checkout after `npm ci`, so this spike used the current official Next.js static
export documentation and the installed application's actual build output. No
claim in this document depends on stale repository architecture notes.

## Microsoft Platform Constraints

### Verified SWA constraints

- Linked bring-your-own APIs require SWA Standard or above.
- A linked Azure Function receives SWA requests at `/api`; the Function must
  retain its `/api` route prefix.
- `api_location` must be `""` before linking an existing Function App.
- Linked APIs are not supported in SWA pull-request environments.
- Linked Function Apps need publicly reachable ingress: the integration does
  not support Function App IP restrictions, Private Link, or service endpoint
  restrictions on the Function App itself.
- SWA route configuration supports wildcard routes and rewrites. A rewrite
  changes the served content without changing the browser URL.
- API route rules can enforce SWA roles. API functions receive the SWA client
  principal in `x-ms-client-principal`; the function must still enforce any
  domain-specific authorization itself.

Sources:

- https://learn.microsoft.com/azure/static-web-apps/functions-bring-your-own
- https://learn.microsoft.com/azure/static-web-apps/configuration
- https://learn.microsoft.com/azure/static-web-apps/user-information

### Verified Function capability fit

Microsoft's SWA API comparison lists managed identity and Key Vault references
as unavailable to managed Functions but available to bring-your-own Functions.
Azure Functions documentation supports managed identity connections to Blob and
Table Storage and recommends least-privilege RBAC. Function Apps can use Key
Vault references and VNet integration to reach private Storage or Key Vault
endpoints, subject to the selected hosting plan and network design.

Sources:

- https://learn.microsoft.com/azure/static-web-apps/apis-functions
- https://learn.microsoft.com/azure/azure-functions/manage-connections
- https://learn.microsoft.com/azure/azure-functions/functions-networking-options
- https://learn.microsoft.com/azure/app-service/app-service-key-vault-references

## Current Dynamic Runtime Dependencies

### `/clients/[galleryId]`

The current route must not become a statically generated gallery: it resolves a
sample fixture on the server today, and production gallery identifiers are
opaque and unbounded. A production gallery's assets, token state, client name,
and signed URLs must never be embedded into generated HTML.

The UI boundary is reusable. `ClientGallery` is a Client Component and consumes
a deliberately limited DTO containing only client-displayable fields. The
current private layout supplies `noindex, nofollow, noarchive` and clears
inherited canonical, Open Graph, and Twitter metadata.

### `/contact`

The page's service query parsing is request-dependent today. The contact action
is also a hard static-export blocker because Next static export does not support
Server Actions. Resend keys and sender/recipient settings are currently read
from the Next runtime environment.

### Other Server Components

The public work pages use server-side filesystem image work, but it is
build-time-compatible: static export executes Server Components at build time
when they do not consume dynamic request APIs. It is not a runtime blocker.

## Static Export Feasibility

### Reversible experiment

This spike temporarily added `output: "export"` to `next.config.ts`, ran
`npm run build` on Node `v22.23.2`, and then restored the file immediately.
The build failed with:

```text
Page "/clients/[galleryId]" is missing "generateStaticParams()"
```

This confirms the immediate arbitrary-route blocker. The final working tree
does not retain the experimental configuration.

### Required changes for export

1. Replace `app/clients/[galleryId]` with a static `/clients` application shell
   and a client-side runtime data loader. Do not enumerate private gallery IDs
   through `generateStaticParams`.
2. Configure Next static export and the SWA static-export workflow settings.
   The resulting `out` directory becomes the deploy output.
3. Replace `/contact` server search-parameter parsing with browser-side parsing
   or another static-safe input path.
4. Replace the contact Server Action with a same-origin `POST /api/contact`.
5. Move the server action's transport-independent validation, sanitization,
   request DTO, and result contract into a shared module usable by the browser
   and Function. Keep final validation, honeypot handling, rate limiting, and
   Resend calls in the Function.
6. Preserve existing static-compatible metadata, sitemap, robots, image
   handling, and analytics code. The current public pages do not need a
   runtime-only migration simply because they are Server Components.

Current Next static-export documentation confirms that arbitrary dynamic routes
without `generateStaticParams`, request-dependent handlers, and Server Actions
are unsupported. It also confirms that client-side data loading is supported.

Source: https://nextjs.org/docs/app/guides/static-exports

## Client Gallery Static Shell Feasibility

The desired URL can be retained:

```text
/clients/<opaque-gallery-id>#access=<token>
```

Recommended request flow:

1. SWA serves a static `/clients` shell for requests matching `/clients/*`
   through a verified `staticwebapp.config.json` rewrite.
2. The browser reads the opaque gallery ID from `location.pathname` after
   hydration and the token from `location.hash`.
3. The browser sends the ID and token to a same-origin `/api` token-exchange
   endpoint.
4. The Function validates the bearer token and gallery state, then returns a
   minimal gallery DTO and short-lived, least-privilege image URLs or
   authenticated image endpoints.
5. The browser removes the sensitive fragment with `history.replaceState` once
   exchange succeeds or fails, avoiding accidental copy/share persistence.

Fragments are not sent in HTTP requests, so the initial shell request never
contains the access token. The static HTML contains no gallery data. The API
must still avoid logging bearer values, must rate-limit exchange attempts, and
must set `Cache-Control: no-store` for exchange and gallery-data responses.

SWA wildcard rewrite support is documented, but the exact static shell output
path must be proven in a deployment-focused follow-up after the `/clients`
shell exists. Use a route-specific rewrite rather than `navigationFallback`:
Hybrid Next.js does not support navigation fallback, and static API/content
routing needs explicit testing for direct navigation and refresh.

The existing privacy protections can remain:

- `app/clients/layout.tsx` can retain private noindex metadata for the static
  shell.
- `isPrivateRoute` already excludes both `/clients` and `/admin` from GA before
  page-view metadata is read or sent.
- `sitemap.ts` derives from public `INDEXABLE_ROUTES` and currently omits
  private paths.

## Contact Form Impact

The smallest clean migration is:

```text
Browser ContactEnquiryForm -> POST /api/contact -> linked Function -> Resend
```

The component can retain its fields, local validation feedback, success/error
states, and public analytics event. Replace only the server-action import with
a typed same-origin fetch boundary.

The Function becomes authoritative for all validation and sanitization, the
honeypot, rate limiting, and Resend delivery. The current in-memory rate limit
is not distributed across serverless instances; production should use a
durable shared limiter or a suitable managed edge/API control. Store the Resend
key in Key Vault and expose it to the Function through a Key Vault reference.

This migration simplifies the runtime model by placing all server-side delivery
operations in the same Function App that owns client-gallery access. It does
not require a browser-visible secret or a cross-origin request.

## Architecture Options

| Option | Security and platform fit | Complexity and operational impact | Verdict |
| --- | --- | --- | --- |
| A. Static export + linked Function `/api` | Supported SWA integration; same-origin API; Function supports managed identity and Key Vault. Function ingress must stay publicly reachable for SWA linking. | Requires one intentional migration of gallery shell and contact submission; requires Standard SWA; no linked backend in PR environments. | **Recommended** |
| B. Hybrid Next + separate public Function origin | Avoids export migration, but bypasses SWA's same-origin proxy and integrated client-principal path. Requires CORS, direct Function authentication/authorization, CSRF/origin controls if cookies are used, and separate API-domain operations. | Higher security and operational complexity; SWA role and `x-ms-client-principal` assumptions do not automatically transfer to a direct cross-origin Function call. | Reject |
| C. Hybrid Next + Route Handlers in SWA-managed runtime | Hybrid docs support Route Handlers, but Microsoft does not document the managed Hybrid backend as providing the controlled Function App identity, Key Vault, storage-networking, or predictable backend ownership required here. The API comparison specifically reserves managed identity and Key Vault references for bring-your-own Functions. | Lower initial code change but leaves core security/runtime capabilities unproven and platform-owned. | Reject |
| D. Move dynamic application/backend to App Service or another host | Can provide full runtime and network control, including a private backend design. | Highest migration, cost, and operational burden; discards SWA's useful static hosting and same-origin API integration. | Contingency only |

## Recommended Architecture

Static export plus linked Functions is preferred because it keeps one public
origin, removes the public site's unnecessary Next runtime dependency, and
locates all sensitive operations in a backend designed for Azure identity and
private data access.

The important constraint is not optional: a linked Function App cannot itself
use inbound Private Link or Function App IP restrictions. If security policy
requires the Function API ingress to be private, Option A is no longer valid
and Option D must be reassessed. Private Blob Storage and Key Vault remain
feasible through Function outbound VNet integration and private endpoints.

## Proposed Migration Sequence

1. Confirm the target production SWA is Standard and identify its resource
   group, hostname, environment behavior, and backend-link state.
2. Create a separate Function App repository or deployment unit on Node 22,
   with contract tests for `/api/contact`, token exchange, gallery metadata,
   and image access.
3. Extract shared contact DTO and validation helpers; migrate the browser form
   from Server Action to `/api/contact` without changing its UX.
4. Replace the fixture dynamic route with a static `/clients` shell and tested
   client-side loading states. Retain its private metadata and GA exclusion.
5. Add static-export configuration and deploy workflow changes. Add a tested
   SWA route rewrite from `/clients/*` to the generated shell path.
6. Provision and secure gallery storage, tables, Key Vault, managed identity,
   RBAC, monitoring, and Function deployment. Link the Function only after the
   static SWA deployment is working and `api_location` remains empty.
7. Implement token exchange, revocation/session version checks, short-lived
   image access, and admin authorization. Add end-to-end tests against an
   environment that has a linked backend.
8. Define a separate PR testing strategy because SWA linked APIs are not
   available in PR environments: Function unit/contract tests and an isolated
   deployed integration environment are required.

## Azure Resources Required Later

- Existing SWA upgraded or confirmed as Standard.
- A Node 22 Azure Function App and its hosting plan, deployment workflow, and
  Application Insights resource.
- A Function host storage account, plus a separate gallery Storage Account with
  private Blob containers and Table Storage as appropriate.
- Azure Key Vault for Resend and any non-identity secrets.
- System-assigned or user-assigned managed identity with minimum Blob, Table,
  and Key Vault roles.
- VNet integration, private DNS, and private endpoints for gallery storage and
  Key Vault if network isolation is required for data services.
- A linked backend association from SWA to the Function App after static export
  is deployed.

## Security Considerations

- Treat the bearer fragment as a credential: generate high-entropy tokens,
  store only a keyed hash, compare in constant time, expire and revoke them,
  and avoid tokens in logs, analytics, telemetry, redirects, and URLs beyond
  the initial fragment.
- Do not return Blob paths, storage account details, raw table records, client
  email addresses, or persistent SAS URLs to the browser.
- Use short-lived, narrowly scoped read-only image access and validate gallery
  session/token version on every sensitive request.
- Apply `no-store` to gallery and token API responses. Keep private routes out
  of the sitemap and analytics.
- Use Function managed identity with least-privilege RBAC. Keep Resend and
  similar third-party secrets in Key Vault.
- Admin routes should use SWA/Entra roles at the edge and verify the decoded
  client principal in the Function for domain authorization. A bearer client
  gallery flow should be independently authorized and must not imply admin
  access.

## Validation / Evidence

### Executed in this spike

- Confirmed Node `v22.23.2`.
- Ran `npm ci` successfully.
- Ran `npm run build` successfully and recorded the route table above.
- Ran and reverted the static-export experiment; only the expected missing
  `generateStaticParams` error was retained as evidence.
- Checked for Route Handlers: none exist.
- Confirmed the workflow's `api_location: ""` and `output_location: ""`.
- Performed read-only Azure CLI discovery. The CLI is authenticated, but
  `az staticwebapp list` returned no SWA resources in the active subscription.

### Documentation verified

The Microsoft and Next documentation linked throughout this record was fetched
during this spike. The Hybrid Next.js and bring-your-own Functions articles
were current as of their January 2026 updates; SWA configuration, API overview,
and identity articles were current through March-June 2026.

## Open Questions

1. Which Azure subscription and resource group host the production SWA? The
   active authenticated subscription has no discoverable SWA resources.
2. Is production already on Standard, and is a linked backend currently absent?
3. Is publicly reachable Function ingress acceptable when the Function itself
   is protected by the SWA linked-backend integration? If not, evaluate Option
   D before implementation.
4. What is the target Function hosting plan, region, and VNet/private endpoint
   design for private Storage and Key Vault access?
5. What non-PR environment will host end-to-end tests for the linked `/api`
   backend, given the documented PR-environment limitation?
6. What exact generated shell path will the static export emit, and which SWA
   rewrite rule serves it correctly on direct `/clients/<id>` navigation? Prove
   this with a deployment test before enabling client links.