# Launch Route Plan

Status: Implemented for launch baseline

Last reviewed: 2026-07-13

## Objective

Define the initial public route set for launch and record implementation status.

## Route-by-route migration plan

| Route | Current state | Launch role | Content change required | Component change | Metadata change required | Redirect required | Status | Risk | Validation required |
|---|---|---|---|---|---|---|---|---|---|
| `/` | Existing homepage retained | Studio-led entry with Photography and Digital pathways | No structural rewrite in this implementation batch | Integrated shared site header/footer | No route-level metadata change | No | Implemented | Overloaded homepage messaging | Confirm global nav routes to `/work`, `/digital`, `/about`, `/contact` |
| `/work` | Existing Photography hub retained | Photography landing route | No | Integrated shared site header/footer | No | No | Implemented | Scope creep into route restructure | Confirm `/work` remains Photography hub |
| `/work/portraits` | Existing Photography route retained | Photography collection route | No | Integrated shared site header/footer | No | No | Implemented | Unintended copy or layout drift | Confirm route unchanged and reachable from `/work` |
| `/work/families` | Existing Photography route retained | Photography collection route | No | Integrated shared site header/footer | No | No | Implemented | Unintended copy or layout drift | Confirm route unchanged and reachable from `/work` |
| `/work/couples` | Existing Photography route retained | Photography collection route | No | Integrated shared site header/footer | No | No | Implemented | Unintended copy or layout drift | Confirm route unchanged and reachable from `/work` |
| `/work/japan` | Existing Photography route retained | Photography collection route | No | Integrated shared site header/footer | No | No | Implemented | Unintended copy or layout drift | Confirm route unchanged and reachable from `/work` |
| `/digital` | New route implemented | Digital landing route | Yes | New route/page component plus shared header/footer | Yes | No | Implemented | Overclaiming unsupported Digital proof | Confirm evidence-safe copy and CTA/link behavior |
| `/about` | New route implemented | Dedicated About route | Yes | New route/page component plus shared header/footer | Yes | No | Implemented | Biography wording imbalance | Confirm route exists and top-level nav points here |
| `/contact` | New route implemented | Dedicated Contact route | Yes | New route/page component plus shared header/footer | Yes | No | Implemented | Friction in enquiry flow | Confirm route exists and top-level nav points here |
| `/digital/projects/[slug]` | Not present | Deferred Digital project/case-study detail route family | Not for launch | Not for launch | Not for launch | No | Deferred by design | Premature route expansion without evidence | Confirm route remains deferred |

## Route constraints

- No existing Photography route is removed.
- No existing Photography route is renamed.
- `/work` remains the Photography hub.
- `/about` and `/contact` are dedicated launch routes.
- Primary navigation now targets route URLs (`/work`, `/digital`, `/about`, `/contact`).
- No launch redirects are required.
- `/digital/projects/[slug]` remains deferred unless approved case-study content is ready.

## Implementation summary

1. Added shared site chrome components: `SiteHeader` and `SiteFooter`.
2. Added new routes: `/digital`, `/about`, `/contact`.
3. Migrated existing home and work routes to shared chrome.
4. Preserved existing photography route URLs and gallery behavior.
5. Preserved static export compatibility.

## Validation checklist (pre-release)

- All launch routes build successfully in static export (`npm run build` passed).
- Top-level navigation appears consistently across launch routes via shared header.
- Photography routes remain indexable and reachable via nav.
- Digital route intentionally uses text-first project highlights with no fabricated metrics/testimonials.
- Contact pathway is consistent on homepage, Digital, and Contact pages.
- Route-level metadata completeness remains partial and requires follow-up for full OG/Twitter coverage.

## Risks to monitor

- Inconsistent language between Photography and Digital sections.
- Overexpansion of Digital claims without corresponding proof.
- Adding too many secondary routes before launch evidence exists.
