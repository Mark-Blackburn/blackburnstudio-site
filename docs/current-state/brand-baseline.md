# Blackburn Studio Brand Baseline (Current State)

Last reviewed: 2026-06-27

## Purpose

This baseline describes the brand expression currently implemented in the website. It is descriptive, not aspirational.

Primary sources:

- [app/layout.tsx](../../app/layout.tsx)
- [app/page.tsx](../../app/page.tsx)
- [app/work/page.tsx](../../app/work/page.tsx)
- [app/work/portraits/page.tsx](../../app/work/portraits/page.tsx)
- [app/work/families/page.tsx](../../app/work/families/page.tsx)
- [app/work/couples/page.tsx](../../app/work/couples/page.tsx)
- [app/work/japan/page.tsx](../../app/work/japan/page.tsx)
- [app/globals.css](../../app/globals.css)
- [public/site.webmanifest](../../public/site.webmanifest)

## Current brand name usage

Verified usage:

- Primary name shown as Blackburn Studio across metadata, headers and footers.
- Contact email uses domain `theblackburn.studio`.

No alternate brand names are present in current page copy.

## Current positioning statements

Implemented positioning is photography-first, with repeated emphasis on:

- Honesty and humanity
- Cinematic but natural imagery
- Quiet, considered, emotionally grounded work
- Curation and pace rather than volume

Examples appear in [app/layout.tsx](../../app/layout.tsx), [app/page.tsx](../../app/page.tsx), and [app/work/page.tsx](../../app/work/page.tsx).

## Repeated language and themes

Recurring descriptors:

- honest
- cinematic
- human
- natural light
- quiet
- considered
- curated
- connection
- real moments
- atmosphere and memory

This lexical pattern is consistent across home and category pages.

## Tone of voice

Current tone characteristics:

- Calm and understated
- Reflective and observational
- Minimal hype language
- Editorial rather than promotional

The writing style uses short, controlled statements with restrained adjectives.

## Visual characteristics

Current implemented characteristics:

- Predominantly dark visual base (`bg-black`, neutral greys).
- Large photographic surfaces with subtle overlays and restrained motion.
- High contrast white/neutral typography over dark backgrounds.
- Rounded cards and rounded CTA buttons.
- Generous vertical spacing and focused content width (`max-w-6xl` and `max-w-4xl` containers).

## Typography

Verified font implementation:

- Primary font: Geist (`next/font/google`) via [app/layout.tsx](../../app/layout.tsx).
- Mono font loaded as Geist Mono for variable mapping.
- System fallback stack in [app/globals.css](../../app/globals.css): system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif.

Typographic style notes:

- Headings are large, medium-weight, tight tracking/leading.
- Navigation and labels use uppercase with extended letter spacing.
- Body copy remains compact and restrained in width.

## Colour palette

### Explicitly defined values

- Background token: `#0a0a0a` in [app/globals.css](../../app/globals.css)
- Foreground token: `#f4f4f5` in [app/globals.css](../../app/globals.css)
- Manifest theme/background colour: `#000000` in [public/site.webmanifest](../../public/site.webmanifest)

### Utility-class palette usage

Frequent classes indicate neutral monochrome usage:

- `bg-black`, `bg-neutral-900`
- `text-white`, `text-neutral-300`, `text-neutral-400`, `text-neutral-500`
- Borders/overlays in white alpha variants (`white/20`, `white/40`, etc.)

Requires verification:

- Exact hex values for Tailwind neutral scale are framework-defined and not explicitly declared in this repo.

## Spacing and layout characteristics

Implemented rhythm patterns:

- Wide gutters (`px-6`, `md:px-8`) and large vertical section spacing.
- Strong content containers (`max-w-6xl` across core pages; narrower series section in home Japan feature).
- Editorial asymmetry in selected image blocks and category grids.
- Frequent use of rounded corners (`rounded-2xl`, `rounded-full`) to soften visual tone.

## Image presentation

Current approach:

- Image-led pages with minimal accompanying text.
- Cards use full-bleed imagery and hover scale transitions.
- Lightbox uses object-contain viewport with morph transitions from card origin.
- Blur placeholders used where configured via `getImagesWithBlur`.

## Photography style as represented in copy and sequencing

Observed framing:

- Portrait-led identity with emphasis on human presence.
- Family and couples work described as warm, relaxed and connection-based.
- Japan series framed as contemplative and textural.
- Sequence comments in grid files indicate deliberate narrative pacing.

Sources include category grid/page files under [app/work](../../app/work).

## Use of animation or motion

Implemented motion language:

- Subtle entrance animations (`rise-in`, `fade-in`, `fade-slide`) in [app/globals.css](../../app/globals.css).
- Hover micro-motion on cards and arrows.
- Advanced gallery motion in lightbox: morph transitions, eased gestures, drag feedback.
- Reduced-motion handling in CSS and lightbox logic.

## Button and link treatment

Common treatment patterns:

- Rounded-pill buttons for primary actions.
- Light border and white text on dark backgrounds.
- Understated hover states rather than high-energy effects.
- Small uppercase labels for secondary cues.

## Logo or wordmark usage

Verified current state:

- No standalone graphic logo component in repository.
- Wordmark is typographic text "Blackburn Studio" in headers and footers.

Requires verification:

- Whether an external brand kit or logo asset exists outside this repository.

## Favicon and application icon usage

Configured icon set:

- `favicon.ico`, `favicon.svg`, 16/32/96 PNG favicons, and `apple-touch-icon.png` declared in [app/layout.tsx](../../app/layout.tsx).
- PWA manifest icons in [public/site.webmanifest](../../public/site.webmanifest).

## Apparent brand values (inferred from implemented copy and design)

Current values signalled by implementation:

- Authenticity over spectacle
- Human connection over stylisation
- Deliberate curation over volume
- Quiet confidence over overt sales language

## Brand strengths

- Distinct and coherent photography identity across routes.
- Consistent visual and verbal tone.
- Strong alignment between copy, imagery, and interaction design.
- Premium-feeling gallery interactions that support perceived quality.

## Brand risks when introducing Digital services

Current-state risks (if unmanaged):

- The existing site language is tightly photography-specific, so abrupt digital-service messaging could feel off-brand.
- Current IA does not separate service narratives, increasing risk of mixed signals.
- Repeated hard-coded page chrome may lead to inconsistent updates during expansion.

## Elements that should be protected during future expansion

From current implementation, these elements underpin brand recognisability:

- Human, calm, low-hype tone.
- Dark, restrained, image-first visual system.
- Editorial sequencing and curation sensibility.
- Consistent wordmark usage and minimalist navigation.
- Premium interaction quality in galleries/lightbox.

## Facts, assumptions, and verification notes

### Verified in repository

- Brand expression is currently photography-led and consistent.
- Typography, colour tokens, icon configuration, and motion primitives are implemented in source.

### Requires verification

- Off-site brand guidelines, logo systems, or messaging frameworks.
- Broader business positioning beyond currently published pages.

### Known brand-adjacent debt

- Repeated copy and structural patterns across page files may make future brand updates slower and more error-prone.
