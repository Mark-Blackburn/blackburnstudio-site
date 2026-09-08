This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Screenshot Utility

This repository includes a reusable full-page screenshot crawler powered by Playwright Chromium.

Prerequisites:

- Install dependencies with `npm install`
- Ensure Chromium is installed for Playwright with `npx playwright install chromium`
- Start the site locally (for local captures) with `npm run dev`

Run against localhost:

```bash
npm run screenshot:site:local
```

Run against any site:

```bash
npm run screenshot:site -- --baseUrl=http://localhost:3000
npm run screenshot:site -- --baseUrl=https://example.com --outputDir=artifacts/screenshots
```

What it does:

- Starts from the provided base URL
- Discovers internal same-origin links
- Visits each discovered page
- Captures a full-page screenshot per route
- Writes a manifest JSON with crawl and capture results

Default output:

- Screenshots and manifest are written under `screenshots/site`
- The `screenshots` folder is ignored in git by default

Script location:

- `scripts/screenshot-site.mjs`
- Run `npm run screenshot:site -- --help` for all options

## Environment Variables

Create a local `.env.local` file when needed. The site reads these public values:

- `NEXT_PUBLIC_IMAGE_BASE_URL` - optional image base path for local or alternate hosting.
- `NEXT_PUBLIC_DOMAIN_MANAGEMENT_URL` - Blackburn Studio domain-management URL. Leave blank if the link should not be shown.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - optional GA4 Measurement ID. Analytics is omitted when this is blank.

Deployments that require GA4 should set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to the GA4 Measurement ID for that deployment or property, in the form `G-XXXXXXXXXX`. Because this is a `NEXT_PUBLIC_` variable, it must be available to the production build. When it is blank or unset, analytics is omitted. The application disables the Google tag's automatic page view and emits one manual `page_view` for each public App Router location. Client and admin routes neither initialize analytics on a cold load nor emit page views or custom events; an already-loaded Google tag is disabled for the configured property while those routes are active.

The GA4 web data stream must also be configured manually in **Admin → Data streams → Web → Enhanced measurement → Page views → Show advanced settings** with **Page changes based on browser history events** set to **OFF**. Repository code cannot change this property setting. Leaving it enabled would allow Enhanced Measurement to duplicate application-owned public page views and observe browser-history transitions independently of the private-route guard.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
