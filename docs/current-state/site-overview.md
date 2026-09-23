# Blackburn Studio Site Overview (Current State)

Last reviewed: 2026-09-23

## 2026-09-23 implementation update

Blackburn Studio Digital now uses a problem-first, outcome-led service structure. Websites remain an important capability, but they are no longer presented as the default solution.

Current Digital service categories:

- Websites & digital presence
- Domains, hosting & technical setup
- Workflow & business systems
- Ongoing digital support

Microsoft 365 remains a specific implementation and support service under Workflow & business systems rather than a top-level category. The current positioning source is [docs/strategy/digital-positioning-2026.md](../strategy/digital-positioning-2026.md).

## 2026-07-15 implementation update

Home and photography routes were aligned with the shared studio UI primitives while preserving image-first presentation and existing route structure.

Verified changes:

- Home and work routes now use shared `SectionEyebrow` for section labels where appropriate.
- Primary CTA surfaces on home/work now use `StudioButton` while preserving quiet photography-first hierarchy.
- Work category pages now use shared `StudioButton` for the existing "Back to work" action.
- Shared `SiteHeader` and `SiteFooter` remain consistently applied across all launch routes.
- Home hero CTA links now use dedicated routes (`/work`, `/digital`).

Explicit exception retained:

- Home hero background still uses raw `<img>` in [app/page.tsx](../../app/page.tsx) to preserve current base URL behavior (`NEXT_PUBLIC_IMAGE_BASE_URL`) under static export. The existing `@next/next/no-img-element` warning remains intentionally deferred for a lower-risk follow-up.

## Scope and method

This document describes the implemented website as it currently exists in this repository. It does not propose redesigns or future-state changes.

Primary source files:

- [app/layout.tsx](../../app/layout.tsx)
- [app/page.tsx](../../app/page.tsx)
- [app/digital/page.tsx](../../app/digital/page.tsx)
- [app/about/page.tsx](../../app/about/page.tsx)
- [app/contact/page.tsx](../../app/contact/page.tsx)
- [app/work/page.tsx](../../app/work/page.tsx)
- [app/work/portraits/page.tsx](../../app/work/portraits/page.tsx)
- [app/work/couples/page.tsx](../../app/work/couples/page.tsx)
- [app/work/families/page.tsx](../../app/work/families/page.tsx)
- [app/work/japan/page.tsx](../../app/work/japan/page.tsx)
- [components/site/SiteHeader.tsx](../../components/site/SiteHeader.tsx)
- [components/site/SiteFooter.tsx](../../components/site/SiteFooter.tsx)
- [package.json](../../package.json)

## Current purpose of the website

The site currently presents Blackburn Studio as a dual-discipline practice with Photography and Digital pathways.

Verified evidence:

- Global metadata title and description in [app/layout.tsx](../../app/layout.tsx).
- Home hero messaging and section structure in [app/page.tsx](../../app/page.tsx).
- Digital service and project-highlight structure in [app/digital/page.tsx](../../app/digital/page.tsx).
- Work category structure in [app/work/page.tsx](../../app/work/page.tsx).
- Dedicated About and Contact routes in [app/about/page.tsx](../../app/about/page.tsx) and [app/contact/page.tsx](../../app/contact/page.tsx).

## Current Blackburn Studio positioning

The positioning language is practical and human-centred across both disciplines.

Home messaging combines photography with practical digital problem solving and provides clear pathways into the Photography and Digital disciplines.

Digital now leads with the business problem and desired outcome rather than a predetermined technology. The public service structure covers websites and digital presence, domains/hosting/technical setup, workflow and business systems, and ongoing digital support. Microsoft 365 is presented as one possible platform within the broader workflow and business-systems capability.

These statements appear in [app/layout.tsx](../../app/layout.tsx), [app/page.tsx](../../app/page.tsx), [app/digital/page.tsx](../../app/digital/page.tsx), and routes under [app/work](../../app/work).

## Apparent target audience

Verified from page copy and calls to action, the apparent audience is:

- Prospective portrait, family and couples clients seeking commissioned photography.
- Potential collaborators and commissioners via the dedicated contact path and email CTA surfaces.
- Visitors interested in curated artistic work (Japan series positioning).
- Small businesses and organisations needing website improvement, workflow simplification, or practical digital platform support (`/digital`).

Requires verification:

- Whether there are distinct audience segments not represented publicly (for example, commercial clients, agencies, or coaching audiences).

## Primary domain

Verified:

- Public contact email is `hello@theblackburn.studio` in [app/page.tsx](../../app/page.tsx).

Requires verification:

- Primary production hostname and DNS routing are not defined in this repository.

## Public routes

Verified App Router pages in repository:

- `/` from [app/page.tsx](../../app/page.tsx)
- `/digital` from [app/digital/page.tsx](../../app/digital/page.tsx)
- `/digital/websites` from [app/digital/websites/page.tsx](../../app/digital/websites/page.tsx)
- `/digital/hosting-domains` from [app/digital/hosting-domains/page.tsx](../../app/digital/hosting-domains/page.tsx)
- `/digital/workflow-systems` from [app/digital/workflow-systems/page.tsx](../../app/digital/workflow-systems/page.tsx)
- `/digital/microsoft-365` from [app/digital/microsoft-365/page.tsx](../../app/digital/microsoft-365/page.tsx)
- `/digital/support` from [app/digital/support/page.tsx](../../app/digital/support/page.tsx)
- `/about` from [app/about/page.tsx](../../app/about/page.tsx)
- `/contact` from [app/contact/page.tsx](../../app/contact/page.tsx)
- `/work` from [app/work/page.tsx](../../app/work/page.tsx)
- `/work/portraits` from [app/work/portraits/page.tsx](../../app/work/portraits/page.tsx)
- `/work/families` from [app/work/families/page.tsx](../../app/work/families/page.tsx)
- `/work/couples` from [app/work/couples/page.tsx](../../app/work/couples/page.tsx)
- `/work/japan` from [app/work/japan/page.tsx](../../app/work/japan/page.tsx)

No API routes are present under [app](../../app).

## Primary navigation

Navigation is now centralised in [components/site/SiteHeader.tsx](../../components/site/SiteHeader.tsx) and shared across home, digital, about, contact, and work routes.

Primary links:

- `/work` (Photography)
- `/digital` (Digital)
- `/about`
- `/contact`

## Home page structure

Implemented sections in [app/page.tsx](../../app/page.tsx):

1. Hero section with background image, positioning copy and Digital/Photography CTA buttons.
2. Studio split introducing the Digital and Photography pathways.
3. Featured Portraits photography.
4. About section introducing the practical problem-solving approach and engineering background.
5. Contact section linking to the dedicated contact route and selected work.
6. Shared footer with route links and email.

## Digital page structure

Implemented sections in [app/digital/page.tsx](../../app/digital/page.tsx):

1. Problem-first hero with CTAs to `/contact` and `#services`.
2. Shared Digital service navigation using the current outcome-led taxonomy.
3. Problem framing explaining why the need should be understood before choosing technology.
4. Engineering-background and practical problem-solving approach.
5. Four core service cards: Websites & digital presence; Domains, hosting & technical setup; Workflow & business systems; Ongoing digital support.
6. Selected Digital work.
7. Managed-service explanation and engagement options.
8. Four-stage process: Understand, Recommend, Improve or build, Support and improve.
9. Link to the Blackburn Studio tools insight.
10. Closing problem-led contact invitation.

## Work section structure

### Work index page (`/work`)

In [app/work/page.tsx](../../app/work/page.tsx), `/work` includes:

- Intro heading "Selected Work".
- Four category cards linking to `/work/portraits`, `/work/families`, `/work/couples`, `/work/japan`.
- Per-category descriptive text.

### Category pages

Each category page in [app/work/portraits/page.tsx](../../app/work/portraits/page.tsx), [app/work/families/page.tsx](../../app/work/families/page.tsx), [app/work/couples/page.tsx](../../app/work/couples/page.tsx), and [app/work/japan/page.tsx](../../app/work/japan/page.tsx) follows a shared pattern:

- Header/navigation.
- Category heading and descriptive paragraph.
- Gallery grid component.
- "Back to work" CTA.
- Footer.

## Current photography categories

Verified categories:

- Portraits
- Families
- Couples
- Japan

Sources: [app/work/page.tsx](../../app/work/page.tsx) and category route files under [app/work](../../app/work).

## Current calls to action

Primary CTAs observed:

- "Explore digital solutions" (`/digital`) on home hero in [app/page.tsx](../../app/page.tsx)
- "View portfolio" (`/work`) on home hero in [app/page.tsx](../../app/page.tsx)
- "View selected work" links to `/work` in home sections in [app/page.tsx](../../app/page.tsx)
- "View series" links to each category in [app/work/page.tsx](../../app/work/page.tsx)
- "Back to work" on all category pages under [app/work](../../app/work)
- Contact email CTA `mailto:hello@theblackburn.studio` in [app/page.tsx](../../app/page.tsx)

## Public contact method

Verified public method:

- Email link: `mailto:hello@theblackburn.studio` in [app/page.tsx](../../app/page.tsx), [app/digital/page.tsx](../../app/digital/page.tsx), and [app/contact/page.tsx](../../app/contact/page.tsx)

Not observed in repository:

- Contact form handling
- Phone number
- Social profile links

## Strengths of current site

Verified strengths based on implementation:

- Clear and consistent dual-discipline positioning across routes.
- Cohesive visual language (dark backdrop, restrained copy, consistent typography).
- Reusable gallery and lightbox system shared across categories.
- Local image assets and static export deployment model support predictable publishing.
- Straightforward navigation and route structure.

## Limitations relevant to ongoing launch evolution

Verified limitations in current implementation:

- Content is code-defined rather than CMS-driven, so service expansion still requires code edits.
- Metadata coverage remains uneven across pages (some routes define title only and do not provide route-level Open Graph/Twitter objects).
- Detailed Digital case-study routes remain deferred (project highlights are intentionally non-linked cards at launch).

Requires verification:

- Whether additional unpublished routes, external systems, or content pipelines exist outside this repository.

## Blackburn Studio and Mark Blackburn Coaching relationship

Verified repository findings:

- The current public site intentionally references Mark Blackburn on About and related studio-context pages.
- No public route is positioned as Mark Blackburn Coaching, and coaching remains outside the Blackburn Studio site scope.

Requires verification:

- Any strategic, legal, or commercial relationship beyond this public-site scope is not represented in this repository.

## Facts, assumptions, and known gaps

### Facts verified in repository

- The website is currently positioned as a dual-discipline studio spanning photography and digital services.
- Public routes are limited to home and work/category pages listed above.
- Contact method is an email mailto link.
- Site-wide metadata, favicon, and web manifest are implemented.

### Assumptions or external details requiring verification

- Production domain and DNS configuration.
- Actual audience segmentation and conversion performance.
- Any external brand or business relationship not represented in code.

### Known gaps and technical debt relevant at overview level

- Repeated layout/navigation/footer markup across route files.
- Digital service routes are code-defined and use a shared service-navigation model; there is not yet a CMS-backed Digital content model.
- Metadata depth is inconsistent between routes.

## Strategic question

> Can Blackburn Studio become a unified photography and digital practice without weakening its distinctive photography identity?
