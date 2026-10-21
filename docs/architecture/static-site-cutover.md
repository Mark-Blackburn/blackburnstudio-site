# Static website and contact cutover

## Prepared, not enabled

The default `npm run build` remains Hybrid Next.js and uses the existing contact
Server Action. `npm run build:static` opts into `output: export`, replaces the
contact transport at build time with same-origin `POST /api/contact`, and copies
`deploy/staticwebapp.config.json` into `out`. No email or storage SDK belongs in
the static browser bundle. Never place a Resend key in a `NEXT_PUBLIC_*` setting.

The `@contact-transport` alias is selected explicitly for both Turbopack and
webpack. TypeScript resolves the HTTP module's shared contract, while ordinary
component tests use the legacy action. HTTP transport tests import the new module
directly, and the browser
smoke test exercises the actual exported bundle with a simulated HTTP API.
The old action is retained for rollback until deployed parity is proven.
Static builds explicitly use webpack to bundle the existing TypeScript image
resizer Web Worker; the installed Turbopack build copies that worker as raw
TypeScript. The generated `out` tree is excluded from TypeScript source checking.
The static build clears generated `.next` and `out` directories first, so cached
Hybrid Server Action manifests cannot leak into the export.

The static route configuration rewrites only `/clients/*` to `/clients.html`
without changing the browser URL. It has no global SPA fallback. Unknown public
pages, API routes and asset paths retain 404 behavior. The gallery remains the
public, labelled fixture; no private metadata, sessions or image access is added.
Next.js rewrites remain enabled only in Hybrid mode.

## Deployment switch

GitHub repository Actions variable `BLACKBURN_WEBSITE_RUNTIME` selects the
website workflow:

| Value | Production behavior |
| --- | --- |
| Unset or `hybrid` | Existing Hybrid workflow handles main pushes and PR previews. Static workflow builds and tests PR artifacts only. |
| `static` | Hybrid build/deploy is disabled. Static workflow deploys tested artifacts on main pushes, or a confirmed manual main run. |

Merging this preparation does not change production contact traffic while the
variable is unset. Static PR builds never deploy: SWA linked backends do not work
in PR environments. Existing Hybrid PR previews continue until cutover.
Both production deployment jobs share a concurrency group.
The static job also checks the current `main` commit immediately before upload,
while holding that lock. A superseded push, manual run or rerun fails before
uploading, and a branch lookup failure also stops deployment. This prevents an
older build that finishes late from overwriting a newer production artifact;
the lock alone does not guarantee chronological deployment order. Wait for existing
website workflows to finish before changing the variable; an already scheduled
job may have evaluated the previous value. Avoid main pushes during cutover.

The static workflow builds on the repository Node 22 version, runs contact/form
tests, exports the site, smoke tests it in Chromium, uploads `out`, then deploys
that exact artifact with `skip_app_build: true` and no managed API build. It
does not deploy the Function App. The Function workflow remains separate.

## Evidence from 21 October 2026

Function deployment run `39584745012` deployed PR #38 merge
`d8b9d902d3514eba4e539fd984e072f5144d3613` successfully. Before email was
configured, sequential requests admitted five limiter attempts and rejected the
sixth with 429; ten simultaneous requests admitted exactly five and rejected
five. These were concurrent requests, not proof of Azure allocating multiple
instances. After a user-triggered Function restart, the original identity still
returned 429. Admitted requests deliberately stopped at missing email
configuration, so those tests sent no mail.

The HMAC and Resend Key Vault references resolved successfully. A controlled
valid submission then returned 200 and its email was confirmed in Outlook.
This verifies the direct Function endpoint, not linked same-origin SWA routing.
It does not prove live rolling expiry, denied-storage recovery, retention or
production ingress controls. Keep those distinctions in the release record.

## Gates before enabling the switch

1. Complete the outstanding limiter gates in `contact-rate-limiter.md`: scheduled
   ETag-safe retention, a controlled storage/configuration failure and recovery,
   storage contents inspection, and appropriate ingress/abuse and cost monitoring.
   Do not weaken table permissions or enable anonymous blobs to fix failures.
   The opt-in timer and its dry-run/live checks are documented in
   `contact-rate-limit-retention.md`; deploying it alone does not satisfy these gates.
2. Verify the static PR checks and review the generated artifact. Preserve public
   build configuration, including analytics, image base and domain-management
   URL, in the corresponding GitHub Actions variables used by the static build.
3. Record the currently deployed Hybrid commit and retain its Azure email
   settings for rollback. Confirm the Function's separate settings and identity
   remain healthy. Readiness checks must not send uncontrolled test emails.
4. Prepare a short coordinated cutover window. Hybrid SWA cannot link this BYO
   backend; the first static deployment must happen before linking. Contact
   submission will fail safely in the interval. Plan to restore Hybrid promptly
   if linking fails; do not leave the form unavailable while troubleshooting.

## Coordinated cutover

1. After the gates above, set `BLACKBURN_WEBSITE_RUNTIME=static`. Run **Blackburn
   Studio static website** manually from **main**, with `confirm_cutover` checked.
   Do not change the Function deployment or website resource at the same time.
2. Confirm the static output is deployed, then use SWA **APIs** to link
   `func-blackburnstudio-api` to the production environment. Linking may configure
   Function authentication for SWA; use the website's `/api` path for subsequent
   checks and verify direct-origin behavior separately.
3. POST an invalid JSON contact submission `{}` through
   `https://www.theblackburn.studio/api/contact`. Require 400 JSON with validation
   errors and `Cache-Control: no-store`, rather than HTML or a redirect.
4. Submit one clearly labelled enquiry through the actual browser form. Confirm
   the request uses same-origin `/api/contact`, success clears the form, the email
   arrives, and analytics records a lead only after confirmed success. Preserve
   form values and an accessible error summary for failures. Do not perform a
   multi-send rate test against live email transport.
5. Check the homepage, Digital pages, portfolio, contact preselection, browser
   tools, sitemap and robots; direct-load and refresh the known sample gallery
   URL; confirm unknown gallery IDs show the generic unavailable state. Check
   unknown public pages, API paths and asset paths do not return the gallery shell.
6. Keep the legacy action through this observation period. Record live results
   before removing it or starting private gallery sessions and asset delivery.

## Rollback

Pause main pushes and wait for website deployment jobs to finish. Unlink the
Function backend from SWA before restoring Hybrid rendering. Set the Actions
variable to `hybrid`, then rerun the latest successful Hybrid **push** workflow
run for the recorded Hybrid commit (not a PR preview run). Reruns use the original
commit. If rerunning an old workflow, confirm its run still has the correct SWA
deployment token and public build settings. Verify browser contact delivery and
gallery deep links after recovery. The Function and durable data can remain
deployed for diagnosis; the website returns to its existing Server Action.

## Local checks

```sh
npm ci
npm run test:run -- lib/contact components/site/ContactEnquiryForm.test.tsx components/site/ContactEnquiryFormFromSearchParams.test.tsx app/clients/client-gallery-route.test.tsx
npm run build:static
npx playwright install chromium
npm run smoke:static
```

The smoke host models static file serving and the configured narrow rewrite;
it is not an Azure emulator. Contact replies are simulated and no email is sent.
Transport tests cover timeouts, network failures, invalid payloads, HTML fallback,
field validation, rate limits and provider outages. No automatic POST retry is
performed because a lost response can follow successful email acceptance.

References:

- https://learn.microsoft.com/azure/static-web-apps/functions-bring-your-own
- https://learn.microsoft.com/azure/static-web-apps/deploy-nextjs-hybrid
- https://learn.microsoft.com/azure/static-web-apps/configuration
- https://learn.microsoft.com/azure/static-web-apps/build-configuration
