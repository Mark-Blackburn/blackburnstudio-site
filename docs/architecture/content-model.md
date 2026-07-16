# Content Model

Status: Proposed

Last reviewed: 2026-06-28

## Content entities

### 1) Studio content

Fields:

- brand name
- positioning statement
- short introduction
- about summary
- full biography
- operating approach
- contact email
- service area wording
- shared calls to action
- metadata defaults

Launch requirement:

- Required for `/`, `/about`, and shared global content framing.

Later requirement:

- Extend with validated claims and approved case-study references.

Current storage method:

- Code-defined page and layout content.

Likely initial implementation method:

- Continue code-defined content modules/constants with shared metadata helper patterns.

### 2) Photography collection

Fields:

- title
- slug
- description
- short description
- cover image
- ordered images
- image alt text
- image dimensions
- orientation
- collection type
- display order
- metadata title
- metadata description
- publication status

Launch requirement:

- Required for retained routes:
	- `/work/portraits`
	- `/work/families`
	- `/work/couples`
	- `/work/japan`

Later requirement:

- Optional additions for new collections or revised ordering rules.

Current storage method:

- File-system assets and code-defined collection data.

Likely initial implementation method:

- Maintain existing code-defined collection structures and image metadata conventions.

### 3) Digital service group

Fields:

- title
- slug or section anchor
- short description
- client problem
- discovery activities
- current-state workflow
- client pain points
- identified friction
- improvement opportunities
- recommended future process
- technology options
- prioritised next steps
- implementation stages
- capabilities
- example deliverables
- example outcomes
- boundaries
- exclusions
- target clients
- evidence requirements
- primary CTA
- display priority
- publication status

Launch requirement:

- Required for `/digital`.
- Must reflect approved working direction: Websites primary, deeper capabilities secondary.

Later requirement:

- Expand only when evidence quality supports additional public claims.

Current storage method:

- Strategy documentation plus code-defined route content.

Likely initial implementation method:

- Structured in code as ordered section data feeding `/digital` content blocks.

### 4) Digital project or case study

Fields:

- title
- slug
- client name or anonymised label
- client type
- project category
- process before
- discovered problem
- originally requested solution
- underlying need identified
- problem
- constraints
- approach
- process changes
- digital implementation
- solution
- technology where relevant
- outcome
- operational outcome
- lessons or later opportunities
- measurable evidence where approved
- imagery
- testimonial
- testimonial approval
- client publication permission
- anonymisation requirement
- related services
- metadata title
- metadata description
- publication status

Launch requirement:

- Not required for launch route completion.
- May support selected proof snippets on `/digital` only where permissions allow.

Later requirement:

- Required if `/digital/projects/[slug]` is activated.

Current storage method:

- Not yet formalised in repository content structures.

Likely initial implementation method:

- Keep case-study records code-defined and permission-gated until a clear editing burden appears.

Publishing constraint:

- Only publish measurable improvement claims where evidence and client permission exist.

### 5) Contact pathway

Fields:

- enquiry discipline
- project type
- name
- email
- organisation
- message
- optional budget range
- optional timeframe
- referral source
- privacy or consent acknowledgement

Launch requirement:

- Required for dedicated `/contact` route and consistent CTA flow.

Later requirement:

- Optional refinements based on enquiry-quality evidence.

Current storage method:

- Minimal contact mechanism and messaging.

Likely initial implementation method:

- Introduce code-defined contact-page structure and field framing without expanding into CMS workflows.

### 6) Navigation item

Fields:

- label
- href
- display order
- navigation location
- active-match behaviour
- external flag
- publication status

Launch requirement:

- Required for primary navigation, footer navigation, and section-context links.

Later requirement:

- Extend if additional Digital routes are approved.

Current storage method:

- Code-defined header/footer navigation configuration.

Likely initial implementation method:

- Keep a single code-defined navigation model used across desktop and mobile variants.

## Content governance assumptions

- Launch content remains code-defined unless a clear editing bottleneck emerges.
- A CMS is not introduced by default.
- Case studies are published only where permission and evidence quality are sufficient.
