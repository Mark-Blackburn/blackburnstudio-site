# Blackburn Studio Content Inventory (Current State)

Last reviewed: 2026-06-27

## Scope

This inventory covers current public pages implemented in [app](../../app), with supporting references to shared components and content/data files.

## Route inventory

| Route | Page title | Page purpose | Primary heading | Major sections | Photography collection or data source | Primary call to action | Secondary calls to action | Metadata title | Metadata description | Internal links | External links | Contact details shown | Future review status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | Home | Introduce Blackburn Studio and direct users to work and enquiry | Honest, cinematic photography with a human edge | Hero, Work (Portraits), About, Japan, Contact, Footer | Home portraits and Japan feature images from `/images` path and `getImagesWithBlur("images", japanSources)` in [app/page.tsx](../../app/page.tsx) | View work | Enquire, View selected work, mailto contact | Blackburn Studio - Honest, cinematic photography (from root metadata) | Blackburn Studio focuses on portrait photography with a natural, human approach... (from root metadata) | `/work`, `#work`, `#about`, `#contact` | None | `hello@theblackburn.studio` | Revise |
| `/work` | Selected Work | Present category index to all photography series | Selected Work | Header/nav, Intro, Category card grid, Footer | Category cards use `/images/work-*.jpg` in [app/work/page.tsx](../../app/work/page.tsx) | View series (per card) | Header nav links | Selected Work - Blackburn Studio | A curated collection of portrait, family, couple and personal landscape work. | `/`, `/work`, `/#about`, `/#contact`, `/work/portraits`, `/work/families`, `/work/couples`, `/work/japan` | None | None on page body | Retain |
| `/work/portraits` | Portraits series page | Display portrait gallery with lightbox browsing | Portraits | Header/nav, Intro, PortraitsGrid gallery, Back to work, Footer | `getImagesWithBlur()` default portrait sources in [lib/getImagesWithBlur.ts](../../lib/getImagesWithBlur.ts), rendered by [app/work/portraits/PortraitsGrid.tsx](../../app/work/portraits/PortraitsGrid.tsx) | Open image (gallery card) | Back to work, header nav links | Portraits - Blackburn Studio | Inherits root description (route defines title only) | `/`, `/work`, `/#about`, `/#contact` | None | None on page body | Retain |
| `/work/families` | Families series page | Display families gallery with lightbox browsing | Families | Header/nav, Intro, FamiliesGrid gallery, Back to work, Footer | `familySources` array in [app/work/families/page.tsx](../../app/work/families/page.tsx) passed to `getImagesWithBlur("families", familySources)` and rendered in [app/work/families/FamiliesGrid.tsx](../../app/work/families/FamiliesGrid.tsx) | Open image (gallery card) | Back to work, header nav links | Families - Blackburn Studio | Inherits root description (route defines title only) | `/`, `/work`, `/#about`, `/#contact` | None | None on page body | Retain |
| `/work/couples` | Couples series page | Display couples gallery with lightbox browsing | Couples | Header/nav, Intro, CouplesGrid gallery, Back to work, Footer | `couplesSources` array in [app/work/couples/page.tsx](../../app/work/couples/page.tsx) passed to `getImagesWithBlur("couples", couplesSources)` and rendered in [app/work/couples/CouplesGrid.tsx](../../app/work/couples/CouplesGrid.tsx) | Open image (gallery card) | Back to work, header nav links | Couples - Blackburn Studio | Inherits root description (route defines title only) | `/`, `/work`, `/#about`, `/#contact` | None | None on page body | Retain |
| `/work/japan` | Japan series page | Display Japan gallery with lightbox browsing | Japan | Header/nav, Intro, JapanGrid gallery, Back to work, Footer | `japanSources` array in [app/work/japan/page.tsx](../../app/work/japan/page.tsx) passed to `getImagesWithBlur("japan", japanSources)` and rendered in [app/work/japan/JapanGrid.tsx](../../app/work/japan/JapanGrid.tsx) | Open image (gallery card) | Back to work, header nav links | Japan - Atmosphere & Memory - Blackburn Studio | A photographic study of atmosphere, texture and quiet memory in Japan. | `/`, `/work`, `/#about`, `/#contact` | None | None on page body | Retain |

## Navigation inventory

### Home header navigation

Source: [app/page.tsx](../../app/page.tsx)

- Brand label: Blackburn Studio (text only)
- Links: `/work`, `#about`, `#contact`

### Work and series header navigation

Source pages: [app/work/page.tsx](../../app/work/page.tsx), [app/work/portraits/page.tsx](../../app/work/portraits/page.tsx), [app/work/families/page.tsx](../../app/work/families/page.tsx), [app/work/couples/page.tsx](../../app/work/couples/page.tsx), [app/work/japan/page.tsx](../../app/work/japan/page.tsx)

- Brand link to `/`
- Work link to `/work`
- About link to `/#about`
- Contact link to `/#contact`

## Footer inventory

Source pages: home and all work/category pages under [app](../../app)

Shared footer content:

- Wordmark text: Blackburn Studio
- Copyright line with dynamic year
- No legal-policy links
- No social links

## Reusable-content inventory

### Reused structural patterns

- Repeated header/nav pattern across all work/category routes.
- Repeated footer pattern across all routes.
- Repeated "Back to work" button on all category pages.

### Reused component system

- Shared gallery/lightbox exports in [components/gallery/index.ts](../../components/gallery/index.ts).
- Shared card and lightbox implementation reused by all category grids.

### Reused language themes

- "quiet", "considered", "natural", "human", "real moments", and "curated" recur across pages.

## Photography collection inventory

| Collection | Route | Data definition | Folder path used by loader | Approx image count (defined sources) | Notes |
|---|---|---|---|---:|---|
| Portraits | `/work/portraits` | `portraitSources` default in [lib/getImagesWithBlur.ts](../../lib/getImagesWithBlur.ts) | `portraits` (default) | 7 | Loader default path is lowercase; on-disk folder appears as `public/Portraits` and requires verification on case-sensitive builds |
| Families | `/work/families` | `familySources` in [app/work/families/page.tsx](../../app/work/families/page.tsx) | `families` | 12 | Sequenced for editorial pacing |
| Couples | `/work/couples` | `couplesSources` in [app/work/couples/page.tsx](../../app/work/couples/page.tsx) | `couples` | 5 | Sequenced for editorial pacing |
| Japan | `/work/japan` | `japanSources` in [app/work/japan/page.tsx](../../app/work/japan/page.tsx) | `japan` | 14 | Sequenced for editorial pacing |
| Home Japan feature | `/` | `japanSources` in [app/page.tsx](../../app/page.tsx) | `images` | 3 | Separate from `/work/japan` set |
| Work card thumbnails | `/work` | `categories` array in [app/work/page.tsx](../../app/work/page.tsx) | `images` | 4 | Uses `work-*.jpg` category cards |

## Duplicated or inconsistent copy

Verified observations:

- Global description and home copy are aligned around portrait-first positioning.
- Category intros reuse similar phrasing and tone.

Potential inconsistencies or duplication requiring review:

- Similar "View selected work" CTA copy appears in multiple home sections and always links to `/work` rather than to route-specific destinations.
- Header and footer copy is duplicated in multiple files instead of centralised.
- Existing historical docs in [docs/gallery-lightbox-current-state.md](../gallery-lightbox-current-state.md) describe older route status that no longer matches current implementation (for example, references to placeholder category routes).

## Missing metadata or content gaps

Verified gaps:

- `/work/portraits`, `/work/families`, and `/work/couples` define `metadata.title` only and rely on inherited description.
- No route-level Open Graph or Twitter metadata objects detected.
- No `robots` or `sitemap` files in repository.
- No explicit service/pricing/process/about-team pages.
- No legal pages (privacy, terms, cookies) detected.

Requires verification:

- Whether legal pages or SEO artefacts are provided externally at hosting level.

## Facts, assumptions, and gaps classification

### Verified in repository

- All six public routes listed above are implemented.
- Contact is currently email-based only.
- Gallery content is manually curated in code-defined arrays.

### Requires verification

- Production-domain canonical URL strategy.
- Externally managed legal/compliance pages.
- Any unpublished pages or redirects configured outside repository.

### Known content debt

- Repeated header/footer and recurring copy fragments increase maintenance effort.
- Metadata completeness is inconsistent across category routes.
