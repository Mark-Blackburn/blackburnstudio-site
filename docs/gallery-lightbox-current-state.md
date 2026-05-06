# Gallery / Lightbox — Current State

_Snapshot of the gallery and lightbox system as it exists in this repository at the time of writing. Inspection-only; no code changes._

---

## 1. Overview

The site has one fully-implemented gallery: **Portraits** at `/work/portraits`. Three additional category routes exist (`/work/couples`, `/work/families`, `/work/japan`) but currently render placeholder pages — the gallery system is built, designed and proven only on Portraits.

The system provides:

- An editorial, hand-composed grid of portrait images.
- A full-screen lightbox modal that opens via a FLIP-style morph animation from the tapped grid card.
- Premium swipe / keyboard / tap navigation between images.
- A vertical-swipe-to-close gesture with velocity detection.
- Build-time blur placeholders (LQIP) for each image.

**Main user flows**

1. User lands on `/work/portraits`.
2. User taps any card → card morphs into a centred, near-fullscreen lightbox.
3. User swipes / clicks arrows / presses `←` / `→` / taps left or right edges to navigate.
4. User swipes down, presses `Esc`, taps the backdrop, or taps the close button → lightbox morphs back into the originating card.

The category landing page `/work` lists all four categories as editorial entry cards with hover overlays and gradients but does not itself open a lightbox.

---

## 2. File Architecture

### Gallery / lightbox system

- [components/gallery/index.ts](../components/gallery/index.ts)  
  Barrel export. Re-exports `GalleryImageCard`, `Lightbox`, `MORPH_DURATION`, and the type set (`GalleryImage`, `MorphOrigin`, `MorphPhase`, `Axis`). Single import surface for consumers.

- [components/gallery/types.ts](../components/gallery/types.ts)  
  Shared types only:
  - `GalleryImage` — image data shape.
  - `MorphOrigin` — `{ rect: DOMRect; borderRadius: string }` — captured from the originating card.
  - `MorphPhase` — `"opening" | "open" | "closing"`.
  - `Axis` — `"none" | "x" | "y"`.

- [components/gallery/GalleryImageCard.tsx](../components/gallery/GalleryImageCard.tsx)  
  A single tappable grid card. Renders a `next/image` with blur placeholder inside a `rounded-2xl` button, captures `getBoundingClientRect()` and computed `borderRadius` on click, and emits a `MorphOrigin` to the parent.

- [components/gallery/lightbox/constants.ts](../components/gallery/lightbox/constants.ts)  
  All gesture thresholds, easing curves, slide gaps, resistance ratios, and the morph timing constant. Single source of truth.

- [components/gallery/lightbox/useScrollLock.ts](../components/gallery/lightbox/useScrollLock.ts)  
  `useLayoutEffect`-based body scroll lock that records `scrollY`, applies `position: fixed; top: -scrollY; width: 100%` to `document.body`, and restores it (plus `window.scrollTo(0, scrollY)`) on cleanup. Runs pre-paint to prevent a one-frame jump.

- [components/gallery/lightbox/useLightboxGestures.ts](../components/gallery/lightbox/useLightboxGestures.ts)  
  Custom hook that owns:
  - drag state (`dragX`, `dragY`, `animating`).
  - viewport width + slide-gap responsive tracking.
  - reduced-motion detection.
  - axis locking, resistance/dampening math, velocity computation, tap-zone detection.
  - `goPrev` / `goNext` and the touch event handlers.
  Returns drag state plus a `touchHandlers` object.

- [components/gallery/lightbox/MorphOverlay.tsx](../components/gallery/lightbox/MorphOverlay.tsx)  
  The FLIP-morphing image element used during opening / closing. Computes `start` and `end` styles, writes `start` synchronously and animates to `end` inside a `requestAnimationFrame`. Uses subpixel rounding, captured border-radius, `translateZ(0)` GPU hint, blur placeholder. Returns `null` while phase is `"open"`.

- [components/gallery/lightbox/CarouselTrack.tsx](../components/gallery/lightbox/CarouselTrack.tsx)  
  The swipeable inner viewport. Owns:
  - the three-slide window (prev / active / next).
  - the inner translating track (`translate3d`).
  - per-slide scale and opacity math (active scale, side-image opacity ramp).
  - per-slide rendering (`object-contain`, eager loading, empty placeholder, `bg-black` wrapper).

- [components/gallery/lightbox/LightboxControls.tsx](../components/gallery/lightbox/LightboxControls.tsx)  
  Static chrome: close button, desktop prev/next arrow buttons, the live counter (`{n} / {total}`), and the mobile 40vw left/right tap zones (positioned at `z-0` behind the carousel).

- [components/gallery/lightbox/Lightbox.tsx](../components/gallery/lightbox/Lightbox.tsx)  
  Top-level lightbox component. Composes the controls, carousel, and morph overlay. Owns the backdrop (rgba black with opacity tied to `closeProgress` and morph phase) and the dynamic backdrop-blur ramp. Wires keyboard navigation (`Escape`, `←`, `→`).

### Page-level composition

- [app/work/portraits/page.tsx](../app/work/portraits/page.tsx)  
  Server component for `/work/portraits`. Awaits `getImagesWithBlur()` and passes the result to the client `PortraitsGrid`.

- [app/work/portraits/PortraitsGrid.tsx](../app/work/portraits/PortraitsGrid.tsx)  
  Client component. Owns the editorial 4-row grid layout (Tailwind grid, hand-composed spans) and the morph state machine (`openIndex`, `closing`, `origin`, `morphPhase`). Renders `GalleryImageCard` instances and conditionally renders `<Lightbox>`. Re-exports `PortraitImage = GalleryImage` for back-compat with the data layer.

- [app/work/page.tsx](../app/work/page.tsx)  
  `/work` index. Editorial category cards (no lightbox).

### Image data helper

- [lib/getImagesWithBlur.ts](../lib/getImagesWithBlur.ts)  
  Server-only async function. Uses `node:fs/promises` to read each portrait JPEG from `public/portraits/`, runs `getPlaiceholder(buffer)` to produce a base64 LQIP, and returns `PortraitImage[]`. The `sources` array hardcodes the canonical id / file / alt for each image and dictates display order. Marked `import "server-only"`.

### Styling / global

- [app/globals.css](../app/globals.css) — Tailwind v4 entry; defines `--background`, `--foreground` CSS variables, dark theme defaults, and the Geist font variable bindings. Not gallery-specific but provides the dark surface the lightbox sits on.

### Build / config

- [next.config.ts](../next.config.ts) — `output: "export"`, `images.unoptimized: true`. Static export for Azure SWA.
- [tsconfig.json](../tsconfig.json) — defines the `@/*` path alias used by gallery internal imports.

---

## 3. Image Data Model

```ts
// components/gallery/types.ts
export type GalleryImage = {
  id: number;
  src: string;
  alt: string;
  blurDataURL: string;
};
```

| Field          | Required | Source                                                | Used by                                                  |
| -------------- | -------- | ----------------------------------------------------- | -------------------------------------------------------- |
| `id`           | yes      | hardcoded in `lib/getImagesWithBlur.ts` `sources`     | React `key` for slides / cards                            |
| `src`          | yes      | computed `\`/portraits/${file}\``                     | `next/image` `src`                                       |
| `alt`          | yes      | hardcoded in `sources`                                | accessibility, `aria-label` on cards                     |
| `blurDataURL`  | yes      | `getPlaiceholder(buffer).base64` at build time        | `next/image` `placeholder="blur"` (grid + morph overlay) |

There is no width / height, EXIF metadata, capture date, caption, tag, photographer, or session field. No favourites, ratings, sharing metadata, or download URLs.

**Source of images**: local files in `public/portraits/` (lowercase folder name — case matters for Azure Static Web Apps). All images are bundled at build time. There is no remote, SharePoint, blob storage, or API integration.

**Order**: dictated by the `sources` array order in `getImagesWithBlur.ts`, not by `id`. The grid rows in `PortraitsGrid.tsx` reference array indices `[0..6]` directly.

---

## 4. Current Behaviours

### Implemented

- **Open**: tap any grid card → card's bounding rect + computed border-radius captured → `morphPhase: "opening"` → centred 0.92×0.84 viewport rect computed → animated FLIP morph → after `MORPH_DURATION` (260 ms) → `morphPhase: "open"` and the carousel viewport fades in (120 ms with 80 ms delay).
- **Close**: backdrop tap, close button, mobile 40vw tap zones, `Esc`, vertical swipe past threshold, or fast vertical flick → `morphPhase: "closing"` → reverse FLIP morph back to origin rect → state cleared.
- **Navigation**: prev/next arrow buttons (desktop), horizontal swipe (mobile), `←` / `→` keys, mobile 40% left / 40% right in-image tap zones (after detecting tap, not drag).
- **Keyboard**: `Esc` closes, `←` previous, `→` next.
- **Swipe gestures**: see §5.
- **Vertical close**: drag down past 100 px or with velocity ≥ 0.5 px/ms → close (50 ms commit delay so the gesture completes visually).
- **Scroll lock**: `useLayoutEffect`, fixed-body technique, restores scroll position on close.
- **Morph animation**: see §6.
- **Backdrop**: rgba black 0.95 fade on open, animated with `MORPH_DURATION` and `EASE_PREMIUM`. Subtle backdrop blur ramp 0 → 8 px while open, decaying with vertical drag progress.
- **Counter**: live "n / total" display under the active image, `aria-live="polite"`.
- **Eager loading**: all three slides in the carousel use `loading="eager"`; the active slide also gets `priority`. Adjacent images are eagerly fetched so swipes never show a gap.
- **Blur placeholders**: applied on grid cards and the morph overlay; intentionally **disabled** (`placeholder="empty"`) inside the lightbox carousel slides to prevent light bands from blur LQIP showing through `object-contain` letterbox areas.
- **Reduced motion**: morph overlay falls back to a 180 ms opacity-only fade; horizontal navigation skips the animated track and snaps to the new index.
- **Pointer-events guard**: carousel viewport is non-interactive (`pointer-events: none`) until `morphPhase === "open"`, preventing taps/swipes from interrupting morph.
- **Strict axis lock**: once a gesture locks to `x` or `y`, the other axis is forced to 0 and cannot switch mid-gesture.

### Not implemented (explicit absences)

- No captions / metadata / EXIF display.
- No favourites, hearts, ratings.
- No sharing, copy-link, social buttons.
- No tagging, filtering, or search.
- No image download.
- No deep-linking (no URL hash / search-param state for the open image).
- No browser history integration (`pushState` / `popstate`). `Esc` and back-button behaviour are independent.
- No related/series-cross navigation (one lightbox = one category).
- No pinch-to-zoom or double-tap zoom.
- No fullscreen API.
- No carousel infinite-scroll preload beyond the immediate prev/next.
- No focus trap inside the dialog (see §7 for caveat).

---

## 5. Gesture System

All defined in [components/gallery/lightbox/constants.ts](../components/gallery/lightbox/constants.ts) and consumed by [useLightboxGestures.ts](../components/gallery/lightbox/useLightboxGestures.ts).

| Constant                  | Value          | Purpose                                                                          |
| ------------------------- | -------------- | -------------------------------------------------------------------------------- |
| `CLOSE_THRESHOLD`         | 100 px         | Vertical-drag distance threshold for close.                                      |
| `DIRECTION_LOCK`          | 10 px          | One axis must exceed the other by this much before locking.                      |
| `TAP_MOVEMENT_THRESHOLD`  | 8 px           | Below this total movement, a touch is treated as a tap.                          |
| `SLIDE_GAP_MOBILE`        | 24 px          | Gap between slides on mobile.                                                    |
| `SLIDE_GAP_DESKTOP`       | 32 px          | Gap on `md:` and up.                                                             |
| `RESISTANCE_RATIO`        | 0.35           | Multiplier on overshoot past `FREE_DRAG_RATIO`.                                  |
| `FREE_DRAG_RATIO`         | 0.6            | Fraction of viewport width that drags 1:1 before resistance kicks in.            |
| `VELOCITY_THRESHOLD`      | 0.4 px/ms      | Horizontal flick threshold for navigation commit.                                |
| `VERTICAL_CLOSE_VELOCITY` | 0.5 px/ms      | Vertical flick threshold for close.                                              |
| `DISTANCE_RATIO`          | 0.2            | Fraction of viewport width required for a horizontal navigation commit.          |

**Axis locking** — strict; once locked, `dragX` is zeroed in y-mode and `dragY` is zeroed in x-mode. No mid-gesture switching.

**Resistance** — past the `FREE_DRAG_RATIO * width` free zone, the excess is multiplied by `RESISTANCE_RATIO * (1 - exp(-excess / 120))`, giving an eased exponential falloff (rubber-band feel) instead of a hard cap.

**Dampen-start** — micro-movements (< 12 px) are dampened to 60 % to avoid jitter at gesture start.

**Drag-driven scale / opacity** — during horizontal drag, the active slide scales `1 → 0.95` non-linearly (`activeScale = 1 - easedDragProgress * 0.05`). The incoming side-image fades from `0.65` baseline up to `1.0` via `Math.pow(dragProgress, 1.4)`.

**Vertical close feedback** — during vertical drag, the carousel translates `Y(dragY)` and scales `1 → 0.92` and opacity drops `1 → 0.5` over the first 140 px.

**Tap-zone detection** — only fires on `onTouchEnd` if `axisRef === "none"` (no scroll/swipe occurred) and total movement < `TAP_MOVEMENT_THRESHOLD`. Left ≤ 40 % of viewport width = previous; right ≥ 60 % = next; centre 20 % = dead zone.

**Mobile-only tap zones** outside the viewport — separate buttons covering `40vw` left and right at `z-0` (behind the viewport at `z-10`). Provide a forgiving fallback when the tap lands in the letterbox (matte) area.

---

## 6. Animation System

### Easing curves

| Constant       | Value                                      | Used for                                              |
| -------------- | ------------------------------------------ | ----------------------------------------------------- |
| `EASE_PREMIUM` | `cubic-bezier(0.22, 1, 0.36, 1)`           | backdrop, carousel fade-in, snap-back, slide opacity. |
| `EASE_SNAP`    | `cubic-bezier(0.22, 1.08, 0.36, 1)`        | inner track translate snap.                           |
| `EASE_MORPH`   | `cubic-bezier(0.22, 1.08, 0.36, 1)`        | all morph geometry properties.                        |

### Durations

| What                              | Duration | Notes                                  |
| --------------------------------- | -------- | -------------------------------------- |
| Morph (open + close)              | 260 ms   | `MORPH_DURATION` constant.             |
| Carousel viewport fade-in on open | 120 ms with 80 ms delay | Aligns with morph end. |
| Backdrop fade                     | 260 ms   | Same as morph.                         |
| Backdrop-blur transition          | 260 ms   | Same as morph.                         |
| Horizontal navigation slide       | 260 ms   | Hardcoded inside `useLightboxGestures`. |
| Snap-back (cancelled drag)        | 260 ms   | Same.                                  |
| Closing carousel transform/opacity | 220 ms   | Slightly tighter than morph.           |
| Reduced-motion morph fallback     | 180 ms   | Opacity-only fade.                     |

### FLIP / Morph

- Captures the originating card's `getBoundingClientRect()` plus `getComputedStyle(el).borderRadius` at click time.
- A separate fixed-position element (`MorphOverlay`) renders an `next/image` with the captured rect as the start state and the centred 0.92×0.84 viewport rect as the end state.
- All seven of `top`, `left`, `width`, `height`, `transform`, `opacity`, and `border-radius` are transitioned together at `MORPH_DURATION` with `EASE_MORPH`.
- Subpixel rounding (`Math.round`) is applied to all geometry properties to eliminate shimmer on mobile Safari.
- `translateZ(0)` is appended to the `transform` string as a GPU hint; `will-change: transform, top, left, width, height, opacity` is set.
- Initial style is committed synchronously with `setStyle(start)`, then end style is set inside `requestAnimationFrame` to ensure the browser commits the start frame before transitioning.
- During `"opening"` the underlying carousel viewport is `opacity: 0` and `pointer-events: none`; only the morph element is visible. After `MORPH_DURATION`, the viewport fades in (120 ms / 80 ms delay) and the morph overlay returns `null`.

### Backdrop

- `backgroundColor: rgba(0,0,0, (closing || morphPhase==="closing" ? 0 : 0.95) - closeProgress)` where `closeProgress = min(|dragY|/300, 0.6)`.
- `backdrop-filter: blur(${backdropBlurPx}px)` where `backdropBlurPx` ramps `0 → 8 px` while open and decays to 0 with `closeProgress`. WebKit prefix included.

### Reduced motion

- `MorphOverlay` reads `matchMedia("(prefers-reduced-motion: reduce)")` and replaces the geometry transition with a 180 ms opacity-only fade.
- `useLightboxGestures` tracks the same media query in `reducedMotionRef` and skips the animated horizontal slide on `goTo`, jumping directly to the target index.

### Performance hints

- `transform-gpu` Tailwind helper on grid cards, work-page category images and titles, and morph overlay.
- `will-change` declared on the morph element and the work-page title.
- `backface-visibility: hidden` on the work-page category image.
- `transform: translate3d(...)` on the inner carousel track.
- Subpixel rounding on morph geometry.

---

## 7. Accessibility

- Lightbox root has `role="dialog"`, `aria-modal="true"`, `aria-label="Image viewer"`.
- Counter has `aria-live="polite"`.
- All chrome buttons have `aria-label` (Close, Previous, Next).
- Decorative glyphs (×, ‹, ›, →) and all gradient overlays carry `aria-hidden="true"`.
- Grid cards (`GalleryImageCard`) have `aria-label="Open ${alt}"`.
- Keyboard nav: `Esc`, `←`, `→` wired in `Lightbox.tsx`.
- Focus styles: `focus-visible:outline-2 focus-visible:outline-white/60` on all interactive elements; grid cards add `outline-offset-4`.
- Reduced-motion: covered in §6.

**Caveats / gaps**

- No focus trap. Keyboard users can `Tab` out of the dialog into the underlying page (which is body-locked but still in the tab order).
- The dialog does not move focus to a sentinel on open, nor restore focus to the originating card on close.
- The mobile 40vw tap-zone buttons share `aria-label="Previous image"` / `"Next image"` with the desktop arrow buttons, so screen-reader users see duplicates.
- The dialog is mounted only when `openIndex !== null`. There is no `aria-hidden` applied to background content.

---

## 8. Styling Assumptions

- **Tailwind v4** via `@tailwindcss/postcss`. Modern syntax (`aspect-4/5`, not `aspect-[4/5]`).
- **Dark theme is assumed.** The lightbox backdrop, morph overlay, slide wrappers, and viewport all use `bg-black` / `#000`. There is no light-theme variant.
- **Hardcoded colours**: `#000` (morph overlay backgroundColor inline), `bg-black`, `bg-neutral-900` (card placeholder), `text-white`, `text-white/40..70`. CSS variables `--background` and `--foreground` are defined in `globals.css` but not consumed by the gallery system.
- **z-index layering**:
  - Lightbox root: `z-50`.
  - Morph overlay: `zIndex: 60` (inline style — sits above the lightbox root by stacking-context exit).
  - Carousel viewport: `z-10`.
  - Chrome buttons / counter: `z-20` / `z-10`.
  - Mobile tap zones: `z-0` (behind viewport).
- **Safe areas**: `env(safe-area-inset-top)` on the dialog's `paddingTop` and on the close button `top`; `env(safe-area-inset-bottom)` on `paddingBottom` and on the counter `bottom`.
- **Responsive breakpoint**: `768px` (`md:`) is the only breakpoint used. Below it, slide gap is 24 px; at and above, 32 px. Desktop arrows are `hidden md:inline-flex`. The mobile tap zones are `md:hidden`. The carousel uses `(min-width: 768px)` in `next/image` `sizes` strings.
- **Sizing**: viewport is `h-[84vh] w-[92vw] max-w-[92vw]` regardless of breakpoint. The morph end rect is computed at `vw * 0.92, vh * 0.84` to match exactly.
- **Global CSS dependencies**: only `globals.css` for Tailwind base + dark variables and the Geist font variable. No gallery-specific stylesheet.

---

## 9. External Dependencies

| Dep                     | Version  | Used for                                                |
| ----------------------- | -------- | ------------------------------------------------------- |
| `next`                  | 16.2.4   | App Router, `next/image`, `next/link`, server components, static export. |
| `react` / `react-dom`   | 19.2.4   | Hooks, types. React Compiler is in use (warnings emit but do not fail builds). |
| `plaiceholder`          | ^3.0.0   | Build-time base64 LQIP generation in `getImagesWithBlur.ts`. |
| `sharp`                 | ^0.34.5  | Image decode used by `plaiceholder`.                    |
| `tailwindcss` / `@tailwindcss/postcss` | ^4 | All styling. |

**No third-party lightbox / swiper / framer-motion / GSAP / react-spring usage.** All gestures, morph, and animation are implemented directly with React state, `requestAnimationFrame`, CSS transitions, and inline styles.

**No data services**. There is no SharePoint, MS Graph, Azure Blob, REST API, or CMS integration. All images and metadata are committed to `public/portraits/` and `lib/getImagesWithBlur.ts`.

---

## 10. Strengths

- **Self-contained, dependency-light**. Zero gesture/animation libraries; the entire system is `< 600` LOC across 9 files.
- **Premium feel**. The motion language (eased exponential resistance, velocity-assisted nav, FLIP morph with captured border-radius, subpixel rounding, `translateZ(0)` GPU hints, separate carousel fade-in, blur placeholders) is consistent and intentional.
- **Strong gesture model**. Strict axis lock, dampened start, eased resistance, directional velocity check, and 50 ms vertical-close commit delay all add up to a gesture that feels considered rather than reactive.
- **Reduced-motion support**. First-class fallback in both the morph and the gesture hook.
- **Build-time blur placeholders**. Real LQIP, not solid colours; greatly improves perceived loading.
- **Static export friendly**. Works with `output: "export"` and SWA's case-sensitive paths.
- **Refactored cleanly**. Composition is layered (page → grid → cards / lightbox → controls / carousel / morph / hooks / constants), and the barrel + `@/` alias make imports symmetric and discoverable.
- **Tight bundle**. No `useEffect`-driven layout thrash, mostly transform/opacity transitions, GPU-friendly.

---

## 11. Limitations / Risks

- **Single instance only**. The system has only ever rendered Portraits. The Couples / Families / Japan routes are placeholders.
- **No data layer abstraction**. The `getImagesWithBlur` helper hardcodes the source list, the folder name (`portraits`), and the alt text. Adding a new gallery requires duplicating the helper.
- **No metadata model**. Captions, EXIF, tags, dates, ratings, and sharing data are unsupported. Adding them later will require a migration of `GalleryImage`.
- **No deep-linking / history integration**. Refreshing a lightbox loses the open image; back-button behaviour is independent of close.
- **No focus trap**. Tab key escapes the dialog. Focus is not moved to the dialog on open or restored on close.
- **Duplicate aria-labels** on mobile tap-zone buttons vs desktop arrows.
- **Inline `zIndex: 60`** on morph overlay is a style smell; it works because of stacking context but is brittle if the lightbox root's `z-50` changes.
- **Hardcoded sizes**: `0.92 * vw × 0.84 * vh` and `h-[84vh] w-[92vw]` are duplicated in two places (`computeCenteredRect` in `MorphOverlay.tsx` and the carousel viewport classes in `CarouselTrack.tsx`). Drift here would break the morph alignment.
- **Hardcoded 260 ms in `useLightboxGestures.goTo`** — the navigation slide duration is a literal, not the `MORPH_DURATION` constant. (Intentional, but easy to confuse with morph timing.)
- **React Compiler warnings** about `goTo` TDZ and certain effect setStyle patterns are present but non-fatal.
- **Tailwind warnings** about `focus-visible:outline + outline-2` collisions on multiple buttons — pre-existing, non-fatal.
- **Dark-only**. No light-theme branch.
- **No tests**. There are no unit, integration, or E2E tests for the gesture / morph behaviour.
- **No performance instrumentation**. No FPS / long-task / INP measurement for the morph or gestures.
- **Pointer events**: only touch handlers exist. Mouse drag on desktop is not supported; desktop relies entirely on arrows + keyboard. (Acceptable but worth noting.)
- **`useEffect` deps in `MorphOverlay`** include `origin` (a new object reference each render) — relies on the parent only changing it when intended. Currently safe because `origin` is set once per open/close cycle.
- **`pageRef` resize listener** in `useLightboxGestures` writes `viewportWidth` state which causes re-renders on every resize tick.

---

## 12. Portability Assessment

### Generic — ready to extract as-is

- `components/gallery/types.ts`
- `components/gallery/lightbox/constants.ts`
- `components/gallery/lightbox/useScrollLock.ts`
- `components/gallery/lightbox/useLightboxGestures.ts`
- `components/gallery/lightbox/MorphOverlay.tsx`
- `components/gallery/lightbox/CarouselTrack.tsx`
- `components/gallery/lightbox/LightboxControls.tsx`
- `components/gallery/lightbox/Lightbox.tsx`
- `components/gallery/GalleryImageCard.tsx`
- `components/gallery/index.ts` (barrel)

These have no project-specific assumptions beyond:
- Tailwind v4 with arbitrary value syntax (`aspect-4/5`, `h-[84vh]`).
- A dark surface behind the lightbox.
- `next/image` (Next.js dependency).

### Project-specific — should stay in the consuming app

- `app/work/portraits/page.tsx` — page chrome (header, footer, layout).
- `app/work/portraits/PortraitsGrid.tsx` — the editorial 4-row hand-composed grid is a brand-defining layout, not a generic component.
- `lib/getImagesWithBlur.ts` — couples the helper to the `public/portraits/` folder and a hardcoded source list. The shape of the helper is reusable; the data is not.

### Would need extraction or generalisation before sharing

- The 0.92 / 0.84 viewport ratio constants currently appear in two files; should become exported constants.
- The hardcoded 260 ms inside `goTo` should reference `MORPH_DURATION`.
- The `getImagesWithBlur` helper should accept a directory and a sources array as arguments to be reused per-gallery.
- The dialog should accept a `themeBackground` or similar prop if the consuming app is not always dark.
- A focus-trap utility would need to be added (currently absent).
- An optional caption/metadata slot would need to be added to `Lightbox` and `CarouselTrack` for any project that displays per-image metadata.

### Should not be shared

- The Tailwind config implicitly (the current code assumes v4 with arbitrary values).
- Any of the work-page editorial card styling — that's a different design.

---

## 13. Recommended Next Steps

_Recommendations only. No code changes performed._

### Refactor (low risk, high value)

1. **Centralise the viewport-ratio constants**. Export `LIGHTBOX_VIEWPORT_W = 0.92` and `LIGHTBOX_VIEWPORT_H = 0.84` from `constants.ts` and consume them in both `computeCenteredRect` and `CarouselTrack`'s class strings (via inline style or `clsx`-built classes).
2. **Replace the hardcoded `260` in `useLightboxGestures.goTo`** with `MORPH_DURATION` (or a new `NAV_SLIDE_DURATION` if you want them to drift independently).
3. **Generalise `getImagesWithBlur`** to accept `(directory: string, sources: PortraitSource[])` so Couples / Families / Japan can call it with their own arrays.
4. **De-duplicate mobile tap-zone aria-labels**. Add `aria-hidden="true"` to the off-screen tap-zone buttons — they're redundant for screen-reader users since the keyboard arrows already cover this.
5. **Hoist the hardcoded `zIndex: 60`** on `MorphOverlay` into a constant (e.g. `Z_MORPH = 60`) alongside `Z_LIGHTBOX = 50`.
6. **Memoize `origin` upstream** so `MorphOverlay`'s effect dependency is stable — pass primitive sub-fields or a structurally stable object.

### Add (when needed by upcoming galleries)

7. **Focus management** — on open, move focus to the close button; on close, restore focus to the originating card. Add a focus trap inside the dialog.
8. **Optional caption slot** — `Lightbox` accepts a `renderCaption?(image)` render prop to keep current metadata-free callers untouched.
9. **Deep-linking via search-param** — `?image={id}` synced with `openIndex`, with `pushState` on open and `popstate` to close. Opt-in per route.
10. **Pointer-event support** — extend `useLightboxGestures` with `pointerdown/move/up` for desktop drag, behind a feature flag if you want to keep desktop arrow-only.

### Do NOT refactor

- The morph timing constants, the easing curves, the resistance math, the velocity thresholds, the dampen-start, the strict axis lock, the 50 ms close-commit delay, the carousel fade-in (120 ms / 80 ms), the subpixel rounding, the `translateZ(0)` hints, the `placeholder="empty"` in carousel slides. **All of these are tuned and load-bearing for the current "feel". Changing any of them risks regressing the gesture quality.**
- The editorial 4-row grid in `PortraitsGrid.tsx`. It's a hand-composed brand statement, not a candidate for abstraction. Future galleries should be free to compose their own grids using `GalleryImageCard`.

### Should be shared across projects

- Everything in `components/gallery/` _after_ items 1–6 above are addressed.
- The `getImagesWithBlur` helper _after_ generalisation in item 3.

### Should remain project-specific

- Page-level chrome (header / footer / nav).
- Per-gallery data sources (`sources` arrays, `public/<gallery>/` folders).
- Per-gallery editorial grid layouts.
- Site-wide theming variables.

---

_End of document._
