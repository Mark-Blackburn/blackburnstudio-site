# Navigation Model

Status: Proposed

Last reviewed: 2026-06-28

## Primary navigation (top-level)

- Photography
- Digital
- About
- Contact

Brand behaviour:

- Blackburn Studio wordmark links to `/`.

## Route mapping

- Photography -> `/work`
- Digital -> `/digital`
- About -> `/about`
- Contact -> `/contact`

## Navigation behaviour principles

- Keep top-level labels short and literal.
- Preserve direct access to photography categories from the Photography route.
- Keep discipline switching simple: homepage and nav should always expose both Photography and Digital.
- Do not add more top-level items at launch.

## Desktop navigation behaviour

- Display wordmark at left linking to `/`.
- Display top-level items at right in this order: Photography, Digital, About, Contact.
- Keep labels literal and non-promotional.
- Use consistent placement across all launch routes.

## Mobile navigation behaviour

- Keep wordmark link to `/` visible in header.
- Use a compact menu pattern with the same item set and order as desktop.
- Ensure Digital and Contact are not visually buried below non-essential links.
- Preserve clear tap targets and spacing for all nav items.

## Active states

- Mark current top-level section as active.
- Treat `/work/*` routes as active under Photography.
- Treat `/digital` and any later `/digital/*` routes as active under Digital.
- About and Contact have direct single-route active states.

## Keyboard and focus expectations

- Primary nav must be fully keyboard reachable.
- Focus order should follow visual order: wordmark, Photography, Digital, About, Contact.
- Visible focus indication must be retained on all nav items.
- Mobile menu must be operable via keyboard and close without focus loss.

## Secondary navigation

Photography section:

- Portraits (`/work/portraits`)
- Families (`/work/families`)
- Couples (`/work/couples`)
- Japan (`/work/japan`)

Digital section:

- Websites (lead section on `/digital`)
- Platforms and portals (supporting section on `/digital`)
- Systems and automation (supporting section on `/digital`)
- Ongoing support (secondary section on `/digital`)

Digital section-anchor navigation behaviour:

- Anchor links may jump to sections within `/digital` for Websites and deeper capabilities.
- Section anchors are supplemental navigation within `/digital`, not replacements for top-level routing.
- Anchor labels should align to published Digital section headings.

## Footer links (minimum)

- Photography
- Digital
- About
- Contact
- Privacy (if required for launch compliance)

Footer behaviour:

- Footer repeats primary navigation destinations for route-level recovery.
- Footer links always target dedicated routes (`/work`, `/digital`, `/about`, `/contact`) rather than homepage anchors.

## Photography contextual navigation

- `/work` acts as the Photography contextual hub.
- Photography category cards or links point to retained routes:
	- `/work/portraits`
	- `/work/families`
	- `/work/couples`
	- `/work/japan`
- Category pages include a clear "Back to work" action targeting `/work`.

## Gallery "Back to work" behaviour

- Category and gallery contexts should provide a stable return path to `/work`.
- "Back to work" must not route through homepage anchors.
- This keeps Photography navigation consistent during and after migration.

## Temporary homepage anchors during migration

- Existing homepage anchors may be retained temporarily for compatibility.
- They are migration support only and not the final primary navigation targets.
- Final primary navigation and footer navigation must target dedicated routes.

## Open implementation checks

- Confirm mobile nav ordering and CTA emphasis between Digital and Contact.
