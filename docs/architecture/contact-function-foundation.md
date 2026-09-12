# Contact Function foundation

## Slice 2A boundary

This slice creates an isolated Azure Functions deployment unit for the future
contact endpoint. It does not deploy or link a Function App, change Azure
resources or the Static Web Apps workflow, enable static export, or switch the
website form away from the existing Next.js Server Action.

The current Hybrid Next.js website continues to call
`submitContactForm`. The Server Action and Function both use the pure modules in
`lib/contact` for runtime request shape, sanitization, authoritative validation,
normalization, and email construction. Browser validation remains a usability
layer rather than a security boundary.

## Function runtime

The `functions` directory is an independent Node package and deployment unit:

- Node.js `>=22.12.0 <23`
- Azure Functions runtime v4
- Azure Functions Node.js programming model v4
- code-centric `app.http()` registration
- no generated or hand-written `function.json`

The anonymous `POST /api/contact` route is registered as `contact`; the normal
Functions host `/api` prefix supplies the public path. Anonymous ingress is
intentional for a future public contact form and is not, by itself, abuse
protection.

The TypeScript build emits the Function registration and all required shared
contact modules beneath `functions/dist`. Runtime imports in the generated
JavaScript remain inside that deployment tree. Production dependencies are
owned and installed by `functions/package.json`; the package does not depend on
the website's root `node_modules`. The compiled `dist` directory alone is not a
complete deployment package: deployment must either include a production
`npm ci` in `functions` or use the Azure platform's remote Node build.

## HTTP contract

The endpoint accepts an `application/json` request, including media type
parameters such as `charset=utf-8`. It rejects unsupported media types,
malformed JSON, arrays and primitive JSON values, incorrect field types, and
bodies over 16 KiB. The byte check is an application-level guard after the
Azure host has accepted and exposed the request body; it is not a host-level
pre-buffer limit. Missing fields reach the shared validator so the response
uses the established contact field errors.

The shared request fields are:

- `name`
- `email`
- `phone`
- `services`
- `setup`
- `message`
- `contactMethod`
- `timing`
- `requiredDate`
- `consent`
- `honeypot`

The Function re-runs all validation and normalization regardless of any browser
checks. Honeypot submissions receive only the generic form-validation error.
Attacker-controlled values, request bodies, stack traces, Resend details, and
email addresses are not written to Function logs or reflected by transport and
configuration errors.

Every response is JSON with `Cache-Control: no-store`. The status contract is:

- `200` for a successful send
- `400` for malformed JSON, invalid runtime shape, or validation failure
- `413` for an oversized request
- `415` for an unsupported media type
- `429` when the temporary limiter rejects a request
- `503` for missing email configuration or a transport failure

## Email configuration

`RESEND_API_KEY` is required. `CONTACT_FROM_EMAIL` and `CONTACT_TO_EMAIL` retain
the current Server Action defaults when omitted, but production deployments
should set them explicitly.

`functions/local.settings.example.json` contains empty placeholders only.
Create an ignored `functions/local.settings.json` for local development and
never commit secrets.

## Temporary rate limiting

The Function currently uses a best-effort in-memory limiter with the existing
five-submissions-per-email-per-hour policy. It is deliberately isolated behind
the `ContactRateLimiter` interface.

This limiter is not distributed. Its state is lost on cold start and is not
shared across scaled Function instances. It bounds memory to 100 tracked email
keys by evicting the oldest key when full. Eviction weakens rate-limit fidelity
under heavy unique-key traffic, so this remains development-only rather than
production-grade abuse protection. A durable or managed shared limiter is a
hard prerequisite before the browser is cut over to `/api/contact`.

## Local development and validation

Run Function commands from the isolated package:

```powershell
Set-Location functions
npm ci
npm run typecheck
npm run build
npm run test:run
func start --port 7072
```

The tests inject the mail transport, environment, clock, and limiter. They do
not call Resend or send real email. A local Functions host smoke test must use
an intentionally invalid request or an empty `RESEND_API_KEY` unless a
separately controlled test transport is available.

## Deferred cutover

A later slice must:

1. provision and configure the Node 22 Function App;
2. add durable shared rate limiting and operational abuse controls;
3. deploy and verify the isolated `functions` package;
4. link the bring-your-own Function App to the static-export SWA environment;
5. validate same-origin `/api/contact` behavior in the deployed environment;
6. switch the browser form from the Server Action to the endpoint; and
7. remove the Server Action only after parity and rollback behavior are proven.

No part of that cutover or Azure provisioning is performed in Slice 2A.
