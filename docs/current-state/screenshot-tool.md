# Screenshot Tool

## Purpose

The screenshot utility captures full-page screenshots for internal same-origin pages discovered from a base URL.

Script location:

- scripts/screenshot-site.mjs

## Lazy-Loaded Image Handling

The tool now scrolls each page before taking a screenshot so lazy-loaded images below the initial viewport are triggered.

Per-page flow:

1. Navigate to the page and wait for the configured waitUntil event.
2. Scroll from top to bottom in steps.
3. Pause at each scroll step.
4. Handle pages that grow while scrolling.
5. Return to the top.
6. Wait for image load/decode where possible (with timeout protection).
7. Wait briefly before capture.
8. Take full-page screenshot with animations disabled.

## CLI Options

Required:

- --baseUrl=<url>

Optional:

- --outputDir=<path> (default: screenshots/site)
- --manifest=<path> (default: <outputDir>/manifest.json)
- --maxPages=<number> (default: 200)
- --timeoutMs=<number> (default: 30000)
- --headless=<bool> (default: true)
- --ignoreQuery=<bool> (default: true)
- --waitUntil=<event> (default: networkidle)
- --scroll=<bool> (default: true)
- --scrollStep=<number> (default: 700)
- --scrollDelayMs=<number> (default: 120)
- --postScrollWaitMs=<number> (default: 800)
- --imageWaitTimeoutMs=<number> (default: 5000)

## Manifest Diagnostics

Each page entry now records image and viewport diagnostics:

- imageCount
- loadedImageCount
- incompleteImageCount
- errorImageCount
- imageWaitTimedOut
- scrollHeight
- viewport
- warnings

Image wait timeouts are recorded as warnings in the manifest and do not fail the whole page capture.

## Examples

```powershell
npm run screenshot:site:local
node scripts/screenshot-site.mjs --baseUrl=http://localhost:3000 --outputDir=screenshots/site --scroll=true
node scripts/screenshot-site.mjs --baseUrl=http://localhost:3000 --outputDir=screenshots/site --scrollStep=500 --scrollDelayMs=200 --postScrollWaitMs=1200
```
