#!/usr/bin/env node
/**
 * Reusable full-page screenshot crawler for any same-origin website.
 *
 * Usage:
 *   npm run screenshot:site -- --baseUrl=http://localhost:3000
 *   npm run screenshot:site:local
 *
 * Optional flags:
 *   --outputDir=screenshots/site
 *   --manifest=screenshots/site/manifest.json
 *   --maxPages=200
 *   --timeoutMs=30000
 *   --headless=true
 *   --ignoreQuery=true
 *   --waitUntil=networkidle
 *   --scroll=true
 *   --scrollStep=700
 *   --scrollDelayMs=120
 *   --postScrollWaitMs=800
 *   --imageWaitTimeoutMs=5000
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getArgValue(flag, argv) {
  const direct = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) {
    return direct.slice(flag.length + 1);
  }

  const index = argv.indexOf(flag);
  if (index >= 0 && index + 1 < argv.length) {
    return argv[index + 1];
  }

  return undefined;
}

function toBoolean(value, fallback) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return fallback;
}

function safeSegment(segment) {
  return segment.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "index";
}

function routeToFileName(routePath) {
  const parts = routePath.split("/").filter(Boolean).map(safeSegment);
  if (parts.length === 0) return "root.png";
  return `${parts.join("__")}.png`;
}

function normalizeBaseUrl(input) {
  if (!input) throw new Error("A base URL is required. Use --baseUrl=<url>.");
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
  return `${url.origin}`;
}

function normalizePathname(pathname) {
  if (!pathname) return "/";
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function shouldVisitUrl(url, baseOrigin, ignoreQuery) {
  if (url.origin !== baseOrigin) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (!ignoreQuery && url.search) return true;
  return true;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, data) {
  const json = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(filePath, json, "utf8");
}

function parsePositiveNumber(value, flag) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive number.`);
  }
  return parsed;
}

function parseNonNegativeNumber(value, flag) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative number.`);
  }
  return parsed;
}

async function getPageMetrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollHeight = Math.max(doc?.scrollHeight || 0, body?.scrollHeight || 0);
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const viewportHeight = window.innerHeight || doc?.clientHeight || 0;
    const viewportWidth = window.innerWidth || doc?.clientWidth || 0;

    return {
      scrollHeight,
      scrollY,
      viewportHeight,
      viewportWidth,
    };
  });
}

async function autoScrollPage(page, options) {
  const {
    scrollStep,
    scrollDelayMs,
    maxIterations = 500,
    maxStableBottomChecks = 3,
  } = options;

  await page.evaluate(() => window.scrollTo(0, 0));

  let steps = 0;
  let stableBottomChecks = 0;

  while (steps < maxIterations) {
    const metrics = await getPageMetrics(page);
    const maxScrollTop = Math.max(0, metrics.scrollHeight - metrics.viewportHeight);
    const atBottom = metrics.scrollY >= maxScrollTop - 2;

    if (atBottom) {
      await sleep(scrollDelayMs);
      const afterPauseMetrics = await getPageMetrics(page);
      const afterPauseMaxScrollTop = Math.max(0, afterPauseMetrics.scrollHeight - afterPauseMetrics.viewportHeight);
      const stillAtBottom = afterPauseMetrics.scrollY >= afterPauseMaxScrollTop - 2;

      if (afterPauseMetrics.scrollHeight <= metrics.scrollHeight + 1 && stillAtBottom) {
        stableBottomChecks += 1;
      } else {
        stableBottomChecks = 0;
      }

      if (stableBottomChecks >= maxStableBottomChecks) {
        break;
      }

      if (afterPauseMetrics.scrollHeight > metrics.scrollHeight + 1) {
        const nextY = Math.min(
          afterPauseMetrics.scrollY + scrollStep,
          Math.max(0, afterPauseMetrics.scrollHeight - afterPauseMetrics.viewportHeight)
        );
        await page.evaluate((y) => window.scrollTo(0, y), nextY);
        await sleep(scrollDelayMs);
      }
    } else {
      const nextY = Math.min(metrics.scrollY + scrollStep, maxScrollTop);
      await page.evaluate((y) => window.scrollTo(0, y), nextY);
      await sleep(scrollDelayMs);
      stableBottomChecks = 0;
    }

    steps += 1;
  }

  await page.evaluate(() => window.scrollTo(0, 0));

  const finalMetrics = await getPageMetrics(page);

  return {
    steps,
    reachedIterationLimit: steps >= maxIterations,
    scrollHeight: finalMetrics.scrollHeight,
  };
}

async function waitForImages(page, timeoutMs) {
  return page.evaluate(async (timeout) => {
    const images = Array.from(document.images || []);

    const snapshot = () => {
      let loadedImageCount = 0;
      let errorImageCount = 0;
      let incompleteImageCount = 0;

      for (const img of images) {
        if (!img.complete) {
          incompleteImageCount += 1;
        } else if (img.naturalWidth > 0) {
          loadedImageCount += 1;
        } else {
          errorImageCount += 1;
        }
      }

      return {
        loadedImageCount,
        errorImageCount,
        incompleteImageCount,
      };
    };

    const settleImage = async (img) => {
      if (!img.complete) {
        await new Promise((resolve) => {
          let settled = false;

          const finish = () => {
            if (settled) return;
            settled = true;
            img.removeEventListener("load", finish);
            img.removeEventListener("error", finish);
            resolve();
          };

          img.addEventListener("load", finish, { once: true });
          img.addEventListener("error", finish, { once: true });
        });
      }

      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {
          // Broken images should not fail the full page capture flow.
        }
      }
    };

    const allImagesPromise = Promise.allSettled(images.map((img) => settleImage(img))).then(() => ({
      timedOut: false,
      ...snapshot(),
    }));

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          timedOut: true,
          ...snapshot(),
        });
      }, timeout);
    });

    const result = await Promise.race([allImagesPromise, timeoutPromise]);

    return {
      imageCount: images.length,
      ...result,
    };
  }, timeoutMs);
}

async function run() {
  const argv = process.argv.slice(2);

  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`
Usage:
  node scripts/screenshot-site.mjs --baseUrl=http://localhost:3000 [options]

Options:
  --baseUrl <url>         Required. Site base URL to crawl.
  --outputDir <path>      Output directory. Default: screenshots/site
  --manifest <path>       Manifest JSON path. Default: <outputDir>/manifest.json
  --maxPages <number>     Maximum pages to visit. Default: 200
  --timeoutMs <number>    Navigation timeout in ms. Default: 30000
  --headless <bool>       Run browser headless. Default: true
  --ignoreQuery <bool>    Treat query variants as same page. Default: true
  --waitUntil <event>     Playwright waitUntil. Default: networkidle
  --scroll <bool>         Scroll page before screenshot. Default: true
  --scrollStep <number>   Scroll step in px. Default: 700
  --scrollDelayMs <num>   Delay between scroll steps. Default: 120
  --postScrollWaitMs <n>  Delay after image wait before screenshot. Default: 800
  --imageWaitTimeoutMs <n> Max wait for image load/decode. Default: 5000

Examples:
  npm run screenshot:site -- --baseUrl=http://localhost:3000
  node scripts/screenshot-site.mjs --baseUrl=http://localhost:3000 --outputDir=screenshots/site --scroll=true
  node scripts/screenshot-site.mjs --baseUrl=http://localhost:3000 --outputDir=screenshots/site --scrollStep=500 --scrollDelayMs=200 --postScrollWaitMs=1200
  node scripts/screenshot-site.mjs --baseUrl=https://example.com --outputDir=artifacts/screenshots
`);
    return;
  }

  const baseUrl = normalizeBaseUrl(getArgValue("--baseUrl", argv));
  const outputDir = path.resolve(process.cwd(), getArgValue("--outputDir", argv) || "screenshots/site");
  const manifestPath = path.resolve(
    process.cwd(),
    getArgValue("--manifest", argv) || path.join(outputDir, "manifest.json")
  );
  const maxPages = parsePositiveNumber(getArgValue("--maxPages", argv) || 200, "--maxPages");
  const timeoutMs = parsePositiveNumber(getArgValue("--timeoutMs", argv) || 30000, "--timeoutMs");
  const headless = toBoolean(getArgValue("--headless", argv), true);
  const ignoreQuery = toBoolean(getArgValue("--ignoreQuery", argv), true);
  const waitUntil = getArgValue("--waitUntil", argv) || "networkidle";
  const scroll = toBoolean(getArgValue("--scroll", argv), true);
  const scrollStep = parsePositiveNumber(getArgValue("--scrollStep", argv) || 700, "--scrollStep");
  const scrollDelayMs = parseNonNegativeNumber(
    getArgValue("--scrollDelayMs", argv) || 120,
    "--scrollDelayMs"
  );
  const postScrollWaitMs = parseNonNegativeNumber(
    getArgValue("--postScrollWaitMs", argv) || 800,
    "--postScrollWaitMs"
  );
  const imageWaitTimeoutMs = parsePositiveNumber(
    getArgValue("--imageWaitTimeoutMs", argv) || 5000,
    "--imageWaitTimeoutMs"
  );

  await ensureDir(outputDir);

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const queue = [new URL(baseUrl)];
  const queued = new Set([new URL(baseUrl).href]);
  const visited = new Set();
  const records = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift();
    if (!currentUrl) break;

    const pageKey = ignoreQuery ? `${currentUrl.origin}${normalizePathname(currentUrl.pathname)}` : currentUrl.href;
    if (visited.has(pageKey)) continue;

    visited.add(pageKey);

    const record = {
      url: currentUrl.href,
      path: normalizePathname(currentUrl.pathname),
      screenshot: null,
      status: null,
      ok: false,
      error: null,
      warnings: [],
      discoveredLinks: 0,
      imageCount: 0,
      loadedImageCount: 0,
      incompleteImageCount: 0,
      errorImageCount: 0,
      imageWaitTimedOut: false,
      scrollHeight: 0,
      viewport: null,
      scrollSteps: 0,
    };

    try {
      const response = await page.goto(currentUrl.href, { waitUntil, timeout: timeoutMs });
      record.status = response ? response.status() : null;
      record.ok = response ? response.ok() : true;

      if (scroll) {
        const scrollResult = await autoScrollPage(page, {
          scrollStep,
          scrollDelayMs,
        });
        record.scrollSteps = scrollResult.steps;
        record.scrollHeight = scrollResult.scrollHeight;

        if (scrollResult.reachedIterationLimit) {
          record.warnings.push("Reached auto-scroll iteration limit before stabilizing at page bottom.");
        }
      }

      const imageResult = await waitForImages(page, imageWaitTimeoutMs);
      record.imageCount = imageResult.imageCount;
      record.loadedImageCount = imageResult.loadedImageCount;
      record.incompleteImageCount = imageResult.incompleteImageCount;
      record.errorImageCount = imageResult.errorImageCount;
      record.imageWaitTimedOut = imageResult.timedOut;

      if (imageResult.timedOut) {
        record.warnings.push(
          `Image wait timed out after ${imageWaitTimeoutMs}ms; screenshot captured with current image state.`
        );
      }

      if (postScrollWaitMs > 0) {
        await page.waitForTimeout(postScrollWaitMs);
      }

      const metricsBeforeShot = await getPageMetrics(page);
      record.scrollHeight = metricsBeforeShot.scrollHeight;
      record.viewport = {
        width: metricsBeforeShot.viewportWidth,
        height: metricsBeforeShot.viewportHeight,
      };

      const fileName = routeToFileName(record.path);
      const screenshotAbsPath = path.join(outputDir, fileName);
      await page.screenshot({
        path: screenshotAbsPath,
        fullPage: true,
        animations: "disabled",
      });
      record.screenshot = path.relative(process.cwd(), screenshotAbsPath).replace(/\\/g, "/");

      const hrefs = await page.$$eval("a[href]", (links) =>
        links.map((link) => link.getAttribute("href")).filter(Boolean)
      );

      let discovered = 0;
      for (const href of hrefs) {
        let resolved;
        try {
          resolved = new URL(href, currentUrl.href);
        } catch {
          continue;
        }

        if (!shouldVisitUrl(resolved, currentUrl.origin, ignoreQuery)) continue;

        if (ignoreQuery) {
          resolved.search = "";
          resolved.hash = "";
          resolved.pathname = normalizePathname(resolved.pathname);
        } else {
          resolved.hash = "";
          resolved.pathname = normalizePathname(resolved.pathname);
        }

        const key = ignoreQuery ? `${resolved.origin}${resolved.pathname}` : resolved.href;
        if (!queued.has(key) && !visited.has(key)) {
          queued.add(key);
          queue.push(resolved);
          discovered += 1;
        }
      }

      record.discoveredLinks = discovered;
      console.log(`Captured ${record.url} -> ${record.screenshot}`);
    } catch (error) {
      record.error = error instanceof Error ? error.message : String(error);
      console.warn(`Failed ${record.url}: ${record.error}`);
    }

    records.push(record);
  }

  await context.close();
  await browser.close();

  const manifest = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    options: {
      outputDir: path.relative(process.cwd(), outputDir).replace(/\\/g, "/"),
      manifestPath: path.relative(process.cwd(), manifestPath).replace(/\\/g, "/"),
      maxPages,
      timeoutMs,
      headless,
      ignoreQuery,
      waitUntil,
      scroll,
      scrollStep,
      scrollDelayMs,
      postScrollWaitMs,
      imageWaitTimeoutMs,
    },
    totals: {
      visited: records.length,
      success: records.filter((item) => item.screenshot).length,
      failed: records.filter((item) => item.error).length,
    },
    pages: records,
  };

  await ensureDir(path.dirname(manifestPath));
  await writeJson(manifestPath, manifest);

  console.log(`\nDone. Visited ${manifest.totals.visited} pages.`);
  console.log(`Screenshots: ${manifest.options.outputDir}`);
  console.log(`Manifest: ${manifest.options.manifestPath}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
