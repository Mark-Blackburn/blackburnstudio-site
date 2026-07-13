# Target Site Architecture

Status: Proposed

Last reviewed: 2026-06-28

## Purpose

Define the proposed launch information architecture for Blackburn Studio as an umbrella practice containing Photography and Digital.

This architecture is based on approved working decisions in [../strategy/strategic-decisions.md](../strategy/strategic-decisions.md), especially:

- SD-01 umbrella brand model
- SD-02 parallel disciplines model
- SD-03 top-level navigation model
- SD-04 keep `/work` as photography landing route
- SD-06 launch `/digital`
- SD-15 homepage leads with studio brand and clear discipline pathways

Approved working direction applied in this document:

- `/about` and `/contact` are dedicated launch routes.
- Abbreviated About and Contact summaries may remain on `/`.
- Temporary homepage anchor compatibility may be retained during migration.
- Final primary navigation must point to `/about` and `/contact`.

## Proposed route map (launch)

```mermaid
flowchart TD
  A[/] --> B[/work]
  A --> C[/digital]
  A --> D[/about]
  A --> E[/contact]

  B --> B1[/work/portraits]
  B --> B2[/work/families]
  B --> B3[/work/couples]
  B --> B4[/work/japan]
```

## Proposed route map (later candidate)

```mermaid
flowchart TD
  C[/digital] --> F[/digital/projects/[slug]]
```

## Launch route set

- `/`
- `/work`
- `/work/portraits`
- `/work/families`
- `/work/couples`
- `/work/japan`
- `/digital`
- `/about`
- `/contact`

## Route roles at launch

### `/`

- Studio-led entry route for Blackburn Studio.
- Introduces Photography and Digital as parallel disciplines.
- Provides pathway CTAs to `/work` and `/digital`.
- May include abbreviated About and Contact summaries that link to dedicated routes.

### `/work`

- Photography landing route and category hub.
- Maintains continuity for existing Photography discovery and gallery navigation.
- Links to retained collection routes without URL changes.

### `/digital`

- Digital landing route.
- Leads with Websites as the primary offer.
- Presents platforms, portals, systems and automation as deeper capabilities.
- Does not require case-study detail routing at launch.

### `/about`

- Dedicated About route for full studio and practitioner context.
- Receives navigation traffic from primary nav and homepage summary content.

### `/contact`

- Dedicated Contact route for launch enquiries.
- Receives navigation traffic from primary nav, homepage CTA blocks, and Digital CTA blocks.

## Architecture principles

- Keep the current photography route structure intact.
- Add Digital in a way that is clearly visible but not presented as replacing photography.
- Preserve a restrained, studio-led entry at `/`.
- Avoid route churn for launch unless there is a strong implementation reason.
- Reserve deeper Digital case-study routing for a later phase.

## Why `/photography` is excluded

- `/work` already performs the Photography hub role.
- Introducing `/photography` at launch would create avoidable route churn.
- Current approved working direction explicitly excludes `/photography` for launch.

## How existing Photography URLs are protected

- `/work`, `/work/portraits`, `/work/families`, `/work/couples`, and `/work/japan` remain unchanged.
- No existing Photography route is renamed.
- No existing Photography route is removed.
- Navigation and internal linking should continue to reference existing routes.

## How later Digital projects fit beneath `/digital`

- `/digital/projects/[slug]` is a deferred route family for later case-study depth.
- It sits beneath `/digital` as a subordinate layer.
- It should only be introduced when publishable project evidence and permissions are available.

## Why no launch redirects are required

- Launch route set preserves existing Photography URLs.
- New routes are additive (`/digital`, `/about`, `/contact`) rather than replacements.
- Temporary homepage anchors can coexist during migration without becoming final navigation targets.

## Architectural boundaries for launch

- Only the launch route set in this document is in scope.
- No `/photography` route in launch scope.
- No launch redirects in scope.
- No CMS introduction by default.
- No expansion into deferred Digital project routes unless approved evidence is ready.

## Non-launch routes

- `/photography` is explicitly not part of initial launch.
- `/digital/projects/[slug]` is a possible later route only.

## Open implementation checks

- Confirm metadata model for new routes so Photography and Digital pages inherit consistent OG/Twitter fields.
- Confirm content ownership and update flow for Digital case studies if `/digital/projects/[slug]` is introduced later.
