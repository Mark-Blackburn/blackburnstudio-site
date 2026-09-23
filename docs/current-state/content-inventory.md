# Blackburn Studio Content Inventory (Current State)

Last reviewed: 2026-09-23

## 2026-09-23 implementation delta

Digital positioning now starts with the business problem and outcome rather than a predetermined website or software solution. The shared Digital taxonomy is:

- Websites & digital presence
- Domains, hosting & technical setup
- Workflow & business systems
- Ongoing digital support

A dedicated `/digital/workflow-systems` category route now carries the broader workflow offer. `/digital/microsoft-365` remains a specific technology/service page beneath that capability.

## 2026-07-15 implementation delta

This inventory remains valid, with the following verified updates for home and photography routes:

- Home route (`/`) now uses shared `StudioButton` for hero/contact actions and `SectionEyebrow` for section labels.
- Home hero navigation actions now use dedicated routes (`/work`, `/digital`) rather than in-page anchors.
- Work index (`/work`) now uses shared `SectionEyebrow` and includes shared-CTA actions (`/contact`, `/digital`) without changing category structure.
- Work category routes (`/work/portraits`, `/work/families`, `/work/couples`, `/work/japan`) now use shared `SectionEyebrow` and shared `StudioButton` for the existing back-navigation action.
- Gallery/lightbox components and image ordering remain unchanged.

Known deferred item:

- Existing homepage raw `<img>` warning in [app/page.tsx](../../app/page.tsx) remains open by design to avoid introducing risk around `NEXT_PUBLIC_IMAGE_BASE_URL` behavior in static export mode.

## Scope

This inventory summarises the core public routes and content patterns implemented in [app](../../app), with supporting references to shared components and content/data files. For the exhaustive set of indexable public routes, use `INDEXABLE_ROUTES` in [lib/siteConfig.ts](../../lib/siteConfig.ts).

## Route inventory

| Route | Page title | Page purpose | Primary heading | Major sections | Photography collection or data source | Primary call to action | Secondary calls to action | Metadata title | Metadata description | Internal links | External links | Contact details shown | Future review status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | Home | Introduce Blackburn Studio and direct users to Photography and Digital pathways | Photography and digital work, built around what you actually need. | Hero, Studio split (Digital/Photography), Featured Portraits, About, Contact, Footer | Home hero and portrait images from `/images` in [app/page.tsx](../../app/page.tsx) | Explore digital solutions | View portfolio, Explore digital, View photography, Start a conversation | Blackburn Studio — Photography and Digital | Blackburn Studio combines photography with practical digital problem solving for people, businesses and community organisations. | `/work`, `/digital`, `/about`, `/contact` | None | `hello@theblackburn.studio` | Retain |
| `/digital` | Digital solutions for small business | Explain Blackburn Studio's problem-first Digital offer and route visitors into the right service category | Digital work should solve a business problem, not create another one. | Hero, Problem framing, Approach, Core services, Selected Digital work, Managed services, Ways to work together, Process, Insight, Contact | Digital project imagery from [components/digital-work/data](../../components/digital-work/data.ts) | Talk through what you need | Explore services, View digital work, Read the tools insight | Digital Solutions for Small Business - Blackburn Studio | Blackburn Studio helps small businesses improve how they are found, understood and contacted online through websites, digital systems and ongoing support. | `/contact`, `#services`, `/digital/websites`, `/digital/hosting-domains`, `/digital/workflow-systems`, `/digital/support`, `/work#digital-work` | None | Shared footer/contact route | Retain |
| `/about` | About - Blackburn Studio | Introduce the studio, Mark's engineering background and the practical working approach | Blackburn Studio | Intro, profile, experience, What I work on, How I work, Engineering background, Contact CTA | Mark Blackburn profile image | Start a conversation | Photography, Digital | About - Blackburn Studio | Blackburn Studio is run by Mark Blackburn and combines photography with practical digital problem solving, websites, business systems and ongoing support. | `/`, `/work`, `/digital`, `/contact` | None | None on page body | Retain |
| `/contact` | Contact - Blackburn Studio | Provide dedicated contact route for photography, website and workflow enquiries | Tell me what you're working on. | Intro, contact CTA, what-to-include guidance | N/A | `mailto:hello@theblackburn.studio` | Shared nav links | Contact - Blackburn Studio | Photography, website and workflow enquiries are welcome. | `/`, `/work`, `/digital`, `/about` | Mailto | `hello@theblackburn.studio` | Retain |
| `/work` | Selected Work | Present category index to all photography series | Selected Work | Header/nav, Intro, Category card grid, Footer | Category cards use `/images/work-*.jpg` in [app/work/page.tsx](../../app/work/page.tsx) | View series (per card) | Header nav links | Selected Work - Blackburn Studio | A curated collection of portrait, family, couple and personal landscape work. | `/`, `/work`, `/about`, `/contact`, `/digital`, `/work/portraits`, `/work/families`, `/work/couples`, `/work/japan` | None | None on page body | Retain |
| `/work/portraits` | Portraits series page | Display portrait gallery with lightbox browsing | Portraits | Header/nav, Intro, PortraitsGrid gallery, Back to work, Footer | `getImagesWithBlur()` default portrait sources in [lib/getImagesWithBlur.ts](../../lib/getImagesWithBlur.ts), rendered by [app/work/portraits/PortraitsGrid.tsx](../../app/work/portraits/PortraitsGrid.tsx) | Open image (gallery card) | Back to work, header nav links | Portraits - Blackburn Studio | Inherits root description (route defines title only) | `/`, `/work`, `/about`, `/contact`, `/digital` | None | None on page body | Retain |
| `/work/families` | Families series page | Display families gallery with lightbox browsing | Families | Header/nav, Intro, FamiliesGrid gallery, Back to work, Footer | `familySources` array in [app/work/families/page.tsx](../../app/work/families/page.tsx) passed to `getImagesWithBlur("families", familySources)` and rendered in [app/work/families/FamiliesGrid.tsx](../../app/work/families/FamiliesGrid.tsx) | Open image (gallery card) | Back to work, header nav links | Families - Blackburn Studio | Inherits root description (route defines title only) | `/`, `/work`, `/about`, `/contact`, `/digital` | None | None on page body | Retain |
| `/work/couples` | Couples series page | Display couples gallery with lightbox browsing | Couples | Header/nav, Intro, CouplesGrid gallery, Back to work, Footer | `couplesSources` array in [app/work/couples/page.tsx](../../app/work/couples/page.tsx) passed to `getImagesWithBlur("couples", couplesSources)` and rendered in [app/work/couples/CouplesGrid.tsx](../../app/work/couples/CouplesGrid.tsx) | Open image (gallery card) | Back to work, header nav links | Couples - Blackburn Studio | Inherits root description (route defines title only) | `/`, `/work`, `/about`, `/contact`, `/digital` | None | None on page body | Retain |
| `/work/japan` | Japan series page | Display Japan gallery with lightbox browsing | Japan | Header/nav, Intro, JapanGrid gallery, Back to work, Footer | `japanSources` array in [app/work/japan/page.tsx](../../app/work/japan/page.tsx) passed to `getImagesWithBlur("japan", japanSources)` and rendered in [app/work/japan/JapanGrid.tsx](../../app/work/japan/JapanGrid.tsx) | Open image (gallery card) | Back to work, header nav links | Japan - Atmosphere & Memory - Blackburn Studio | A photographic study of atmosphere, texture and quiet memory in Japan. | `/`, `/work`, `/about`, `/contact`, `/digital` | None | None on page body | Retain |

## Navigation inventory

Navigation is centralised in [components/site/SiteHeader.tsx](../../components/site/SiteHeader.tsx) and used by home, digital, about, contact, work, and work-category routes.

- Brand link to `/`
- Photography link to `/work`
- Digital link to `/digital`
- About link to `/about`
- Contact link to `/contact`
- Mobile menu replicates the same route set

## Footer inventory

Source component: [components/site/SiteFooter.tsx](../../components/site/SiteFooter.tsx)

Shared footer content:

- Wordmark text: Blackburn Studio
- Route links: `/work`, `/digital`, `/about`, `/contact`
- Contact email link: `mailto:hello@theblackburn.studio`
- Copyright line with dynamic year
- No legal-policy links
- No social links

## Reusable-content inventory

### Reused structural patterns

- Shared `SiteHeader` and `SiteFooter` now remove repeated chrome markup from route pages.
- Repeated "Back to work" button on all category pages.

### Reused component system

- Shared gallery/lightbox exports in [components/gallery/index.ts](../../components/gallery/index.ts).
- Shared card and lightbox implementation reused by all category grids.

### Reused language themes

- "quiet", "considered", "natural", "human", "real moments", and "curated" recur across pages.

## Photography collection inventory

| Collection | Route | Data definition | Folder path used by loader | Approx image count (defined sources) | Notes |
|---|---|---|---|---:|---|
| Portraits | `/work/portraits` | `portraitSources` default in [lib/getImagesWithBlur.ts](../../lib/getImagesWithBlur.ts) | `portraits` (default) | 7 | Canonical asset directory and public URL path are lowercase: `public/portraits` and `/portraits/...` |
| Families | `/work/families` | `familySources` in [app/work/families/page.tsx](../../app/work/families/page.tsx) | `families` | 12 | Sequenced for editorial pacing |
| Couples | `/work/couples` | `couplesSources` in [app/work/couples/page.tsx](../../app/work/couples/page.tsx) | `couples` | 5 | Sequenced for editorial pacing |
| Japan | `/work/japan` | `japanSources` in [app/work/japan/page.tsx](../../app/work/japan/page.tsx) | `japan` | 14 | Sequenced for editorial pacing |
| Home Japan feature | `/` | `japanSources` in [app/page.tsx](../../app/page.tsx) | `images` | 3 | Separate from `/work/japan` set |
| Work card thumbnails | `/work` | `categories` array in [app/work/page.tsx](../../app/work/page.tsx) | `images` | 4 | Uses `work-*.jpg` category cards |

## Duplicated or inconsistent copy

Verified observations:

- Global description and home copy are aligned around combined photography and digital positioning.
- Category intros reuse similar phrasing and tone.

Potential inconsistencies or duplication requiring review:

- Similar "View selected work" CTA copy appears in multiple home sections and always links to `/work` rather than to route-specific destinations.
- Home hero primary actions now use dedicated routes (`/work`, `/digital`) rather than in-page anchors.
- Existing historical docs in [docs/gallery-lightbox-current-state.md](../gallery-lightbox-current-state.md) describe older route status that no longer matches current implementation (for example, references to placeholder category routes).

## Missing metadata or content gaps

Verified gaps:

- No public Digital pricing page.
- No detailed Digital case-study routes.
- No legal pages (privacy, terms, cookies) detected.

Verified technical SEO coverage:

- All public routes define titles, descriptions, self-referencing canonical URLs and consistent Open Graph/Twitter metadata.
- Generated `/sitemap.xml` and `/robots.txt` routes are present.
- Site-wide `WebSite` and `ProfessionalService` JSON-LD describes the site, services and verified service area without unverified contact or address details.

Requires verification:

- Whether legal pages are provided externally at hosting level.

## Facts, assumptions, and gaps classification

### Verified in repository

- All public routes listed above are implemented.
- Contact is currently email-based only.
- Gallery content is manually curated in code-defined arrays.

### Requires verification

- Production-domain canonical URL strategy.
- Externally managed legal/compliance pages.
- Any unpublished pages or redirects configured outside repository.

### Known content debt

- Repeated header/footer and recurring copy fragments increase maintenance effort.
- Core Digital content remains code-defined, so taxonomy or service-copy changes still require code updates.
