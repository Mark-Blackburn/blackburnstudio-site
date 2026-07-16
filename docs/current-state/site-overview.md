# Blackburn Studio Site Overview (Current State)

Last reviewed: 2026-07-15

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

Home messaging and structure explicitly combine photography, websites, and useful digital systems, including an early Photography/Digital split section.

Digital service language is present on `/digital`, including websites, workflow/process improvement, and platforms/portals framing.

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

1. Hero section with background image, headline, supporting paragraph, and CTA buttons.
2. Work section with "Primary" Portraits feature and linked image cards.
3. About section with brand philosophy paragraph.
4. Japan feature section with lead and supporting image cards.
5. Contact section with mailto CTA.
6. Shared footer with route links and email.

## Digital page structure

Implemented sections in [app/digital/page.tsx](../../app/digital/page.tsx):

1. Hero with dual CTA (`/contact`, `#selected-digital-work`).
2. Websites capability section.
3. Workflow and process improvement section.
4. Platforms, portals and business systems section.
5. How Blackburn Studio works (six-stage process).
6. Selected Digital work highlights.
7. Deeper capability section.
8. About and credibility section linking to `/about`.
9. Closing contact invitation linking to `/contact` and mailto.

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

- "View photography" (`/work`) on home hero in [app/page.tsx](../../app/page.tsx)
- "Explore digital" (`/digital`) on home hero in [app/page.tsx](../../app/page.tsx)
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
- No explicit Digital-services content model or route grouping.
- Metadata depth is inconsistent between routes.

## Strategic question

> Can Blackburn Studio become a unified photography and digital practice without weakening its distinctive photography identity?
