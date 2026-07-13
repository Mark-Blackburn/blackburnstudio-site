# Launch Route Plan

Status: Proposed

Last reviewed: 2026-06-28

## Objective

Define the initial public route set for launch and the sequencing assumptions needed to implement it safely.

## Route-by-route migration plan

| Route | Current state | Proposed role | Content change required | Likely component change | Metadata change required | Redirect required | Launch dependency | Risk | Validation required |
|---|---|---|---|---|---|---|---|---|---|
| `/` | Existing homepage | Studio-led launch entry with pathways to Photography and Digital | Yes, revise structure and section emphasis | Homepage layout and CTA block updates | Yes, revise title/description to reflect dual-discipline launch | No | Final homepage brief and approved pathway hierarchy | Overloaded homepage messaging | Confirm CTAs route to `/work`, `/digital`, `/about`, `/contact` |
| `/work` | Existing Photography hub | Retained Photography landing route | Yes, light framing updates only | Minor navigation and contextual-link adjustments | Optional refinement only | No | Top-level nav mapping and Photography prominence | Scope creep into route restructure | Confirm `/work` remains Photography hub |
| `/work/portraits` | Existing Photography route | Retained Photography collection route | No material change expected | Minimal or none | Optional review only | No | Preserve existing gallery content | Unintended copy or layout drift | Confirm route unchanged and reachable from `/work` |
| `/work/families` | Existing Photography route | Retained Photography collection route | No material change expected | Minimal or none | Optional review only | No | Preserve existing gallery content | Unintended copy or layout drift | Confirm route unchanged and reachable from `/work` |
| `/work/couples` | Existing Photography route | Retained Photography collection route | No material change expected | Minimal or none | Optional review only | No | Preserve existing gallery content | Unintended copy or layout drift | Confirm route unchanged and reachable from `/work` |
| `/work/japan` | Existing Photography route | Retained Photography collection route | No material change expected | Minimal or none | Optional review only | No | Preserve existing gallery content | Unintended copy or layout drift | Confirm route unchanged and reachable from `/work` |
| `/digital` | Not currently present | New Digital landing route | Yes, new page content required | New route/page component set | Yes, new route metadata required | No | Approved Digital service hierarchy and evidence-safe claims | Overclaiming unsupported Digital proof | Confirm Websites lead and deeper capabilities remain secondary |
| `/about` | Not currently present as dedicated route | New dedicated About route | Yes, new page content required | New route/page component | Yes, new route metadata required | No | Approved practitioner and studio narrative boundaries | Biography wording imbalance | Confirm route exists and primary nav points here |
| `/contact` | Not currently present as dedicated route | New dedicated Contact route | Yes, new page content required | New route/page component | Yes, new route metadata required | No | Contact pathway and enquiry framing decisions | Friction in enquiry flow | Confirm route exists and primary nav points here |
| `/digital/projects/[slug]` | Not currently present | Deferred Digital project/case-study detail route family | Not for launch | Not for launch | Not for launch | No | Approved case-study selection plus publication permissions | Premature route expansion without evidence | Confirm route remains deferred unless approvals are complete |

## Route constraints

- No existing Photography route is removed.
- No existing Photography route is renamed.
- `/work` remains the Photography hub.
- `/about` and `/contact` are dedicated launch routes.
- Homepage anchors may be temporarily supported but are not final primary navigation targets.
- No launch redirects are required.
- `/digital/projects/[slug]` remains deferred unless approved case-study content is ready.

## Sequencing assumptions

1. Finalise launch IA and nav labels.
2. Finalise launch copy outlines for `/`, `/digital`, `/about`, `/contact`.
3. Implement route shells and metadata.
4. Integrate existing photography routes without URL changes.
5. Validate internal linking and navigation across desktop/mobile.
6. Run metadata and static export checks.

## Validation checklist (pre-release)

- All launch routes build successfully in static export.
- Top-level navigation appears consistently across launch routes.
- Photography routes remain indexable and reachable via nav.
- Digital route does not over-claim unsupported capabilities.
- Contact pathway is consistent on homepage, Digital, and Contact pages.
- OG/Twitter metadata remains complete on new routes.

## Risks to monitor

- Inconsistent language between Photography and Digital sections.
- Overexpansion of Digital claims without corresponding proof.
- Adding too many secondary routes before launch evidence exists.
