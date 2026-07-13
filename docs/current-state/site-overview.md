# Blackburn Studio Site Overview (Current State)

Last reviewed: 2026-06-27

## Scope and method

This document describes the implemented website as it currently exists in this repository. It does not propose redesigns or future-state changes.

Primary source files:

- [app/layout.tsx](../../app/layout.tsx)
- [app/page.tsx](../../app/page.tsx)
- [app/work/page.tsx](../../app/work/page.tsx)
- [app/work/portraits/page.tsx](../../app/work/portraits/page.tsx)
- [app/work/couples/page.tsx](../../app/work/couples/page.tsx)
- [app/work/families/page.tsx](../../app/work/families/page.tsx)
- [app/work/japan/page.tsx](../../app/work/japan/page.tsx)
- [package.json](../../package.json)

## Current purpose of the website

The site currently presents Blackburn Studio as a photography practice, centred on portrait work and supported by selected family, couples and Japan series pages.

Verified evidence:

- Global metadata title and description in [app/layout.tsx](../../app/layout.tsx).
- Home hero messaging and section structure in [app/page.tsx](../../app/page.tsx).
- Work category structure in [app/work/page.tsx](../../app/work/page.tsx).

## Current Blackburn Studio positioning

The positioning language is explicitly photography-led and human-centred, with recurring wording such as:

- "Honest, cinematic photography"
- "human edge"
- "natural, human approach"
- "quiet, considered"
- "real moments"

These statements appear in [app/layout.tsx](../../app/layout.tsx), [app/page.tsx](../../app/page.tsx), and category pages under [app/work](../../app/work).

## Apparent target audience

Verified from page copy and calls to action, the apparent audience is:

- Prospective portrait, family and couples clients seeking commissioned photography.
- Potential collaborators and commissioners (home contact copy references "Commissions, collaborations").
- Visitors interested in curated artistic work (Japan series positioning).

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
- `/work` from [app/work/page.tsx](../../app/work/page.tsx)
- `/work/portraits` from [app/work/portraits/page.tsx](../../app/work/portraits/page.tsx)
- `/work/families` from [app/work/families/page.tsx](../../app/work/families/page.tsx)
- `/work/couples` from [app/work/couples/page.tsx](../../app/work/couples/page.tsx)
- `/work/japan` from [app/work/japan/page.tsx](../../app/work/japan/page.tsx)

No API routes are present under [app](../../app).

## Primary navigation

### Home navigation

In [app/page.tsx](../../app/page.tsx), home header navigation links to:

- `/work`
- `#about`
- `#contact`

### Work and category navigation

In [app/work/page.tsx](../../app/work/page.tsx) and each category page under [app/work](../../app/work):

- Brand link to `/`
- `Work` link to `/work`
- `About` link to `/#about`
- `Contact` link to `/#contact`

## Home page structure

Implemented sections in [app/page.tsx](../../app/page.tsx):

1. Hero section with background image, headline, supporting paragraph, and CTA buttons.
2. Work section with "Primary" Portraits feature and linked image cards.
3. About section with brand philosophy paragraph.
4. Japan feature section with lead and supporting image cards.
5. Contact section with mailto CTA.
6. Footer with brand name and copyright.

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

- "View work" (`#work`) on home hero in [app/page.tsx](../../app/page.tsx)
- "Enquire" (`#contact`) on home hero in [app/page.tsx](../../app/page.tsx)
- "View selected work" links to `/work` in home sections in [app/page.tsx](../../app/page.tsx)
- "View series" links to each category in [app/work/page.tsx](../../app/work/page.tsx)
- "Back to work" on all category pages under [app/work](../../app/work)
- Contact email CTA `mailto:hello@theblackburn.studio` in [app/page.tsx](../../app/page.tsx)

## Public contact method

Verified public method:

- Email link: `mailto:hello@theblackburn.studio` in [app/page.tsx](../../app/page.tsx)

Not observed in repository:

- Contact form handling
- Phone number
- Social profile links

## Strengths of current site

Verified strengths based on implementation:

- Clear and consistent photography-focused positioning across routes.
- Cohesive visual language (dark backdrop, restrained copy, consistent typography).
- Reusable gallery and lightbox system shared across categories.
- Local image assets and static export deployment model support predictable publishing.
- Straightforward navigation and route structure.

## Limitations relevant to adding Digital services

Verified limitations in current implementation:

- Public information architecture is entirely photography-oriented, with no Digital service route, navigation entry, or content model.
- Header/footer/nav are repeated in multiple page files rather than centralised components, increasing change effort.
- Content is code-defined rather than CMS-driven, so service expansion currently requires code edits.
- Metadata coverage is uneven across pages (some pages define title only).

Requires verification:

- Whether additional unpublished routes, external systems, or content pipelines exist outside this repository.

## Blackburn Studio and Mark Blackburn Coaching relationship

Verified repository findings:

- No references to "Mark Blackburn", "Blackburn Coaching", or "coaching" were found in current source files.

Requires verification:

- Any strategic, legal, or commercial relationship between Blackburn Studio and Mark Blackburn Coaching is not represented in this repository.

## Facts, assumptions, and known gaps

### Facts verified in repository

- The website is currently photography-led in copy, structure, and route taxonomy.
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
