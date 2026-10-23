import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const config = JSON.parse(
  await readFile(join(root, "staticwebapp.config.json"), "utf8"),
);
assert.deepEqual(
  config.routes.filter(rule => rule.route.startsWith("/clients")).map((rule) => [rule.route, rule.rewrite]),
  [["/clients/*", "/clients.html"]],
);
assert.equal(
  config.navigationFallback,
  undefined,
  "A global fallback would hide API and asset 404s",
);
for (const name of [
  "index.html",
  "contact.html",
  "clients.html",
  "404.html",
  "robots.txt",
  "sitemap.xml",
])
  assert.ok((await stat(join(root, name))).isFile(), `Missing export: ${name}`);
assert.doesNotMatch(
  await readFile(join(root, "clients.html"), "utf8"),
  /Sample Photography Gallery/,
);

async function checkClientBundles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await checkClientBundles(file);
    else if (entry.name.endsWith(".ts"))
      assert.fail(`Uncompiled TypeScript asset in static output: ${file}`);
    else if (entry.name.endsWith(".js"))
      assert.doesNotMatch(
        await readFile(file, "utf8"),
        /RESEND_API_KEY|GALLERY_ACCESS_HMAC_KEY|api\.resend\.com|contact-email-v1:|gallery-session-v1:/,
        `Server-only contact code in ${file}`,
      );
  }
}
await checkClientBundles(join(root, "_next", "static"));

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};
// Small local host models exported files and the narrow SWA rewrite only.
// Actual SWA routing and backend integration are separate live cutover gates.
let galleryAuthorized = false;
const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    // Download navigations may bypass page.route after an attachment response.
    // Serve the same synthetic JPEG directly for that browser follow-up.
    const privateImage = /^\/api\/galleries\/g_privateGallery123456\/assets\/a_privateAsset12345678\/(view|web|full)$/.exec(pathname);
    if (privateImage) {
      if (!galleryAuthorized) { res.writeHead(404).end(); return; }
      res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox", "X-Content-Type-Options": "nosniff",
        "Content-Disposition": privateImage[1] === "view" ? "inline" : `attachment; filename="synthetic-${privateImage[1]}.jpg"` });
      res.end(await readFile(join(root, "portraits", "male.jpg")));
      return;
    }
    if (pathname.startsWith("/clients/")) pathname = "/clients.html";
    const target = resolve(root, `.${pathname}`);
    if (target !== resolve(root) && !target.startsWith(resolve(root) + sep)) {
      res.writeHead(404).end();
      return;
    }
    const candidates =
      pathname === "/"
        ? [join(root, "index.html")]
        : [target, target + ".html"];
    for (const candidate of candidates) {
      try {
        if (!(await stat(candidate)).isFile()) continue;
        res.writeHead(200, {
          "Content-Type":
            mime[extname(candidate)] ?? "application/octet-stream",
        });
        res.end(await readFile(candidate));
        return;
      } catch (error) {
        if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      }
    }
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end(await readFile(join(root, "404.html")));
  } catch {
    res.writeHead(500).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
  for (const [, url] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const route = new URL(url).pathname;
    assert.equal(
      (await fetch(origin + route)).status,
      200,
      `Public route ${route}`,
    );
  }
  for (const path of [
    "/missing-page",
    "/api/contact",
    "/_next/missing.js",
    "/.swa/missing",
    "/images/missing.webp",
  ])
    assert.equal((await fetch(origin + path)).status, 404, path);

  browser = await chromium.launch({
    headless: true,
    ...(process.env.BLACKBURN_SMOKE_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.BLACKBURN_SMOKE_CHROMIUM_EXECUTABLE }
      : {}),
  });
  const page = await browser.newPage();
  if (process.env.BLACKBURN_SMOKE_CLOCK) await page.clock.setFixedTime(new Date(process.env.BLACKBURN_SMOKE_CLOCK));
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
  for (const path of [
    "/clients/g_7Rk3mN9xQ2vL8pT4",
    "/clients/g_7Rk3mN9xQ2vL8pT4/",
  ]) {
    await page.goto(origin + path);
    await page
      .getByRole("heading", { name: "Sample Photography Gallery" })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "Sample Photography Gallery" })
      .waitFor();
  }
  for (const path of [
    "/clients/g_unknown",
    "/clients/g_unknown/deeper",
    "/clients",
  ]) {
    await page.goto(origin + path);
    await page
      .getByRole("heading", { name: "This gallery is unavailable." })
      .waitFor();
  }

  // Synthetic private-gallery API only. No Azure credentials or customer data.
  const galleryId = "g_privateGallery123456";
  const assetId = "a_privateAsset12345678";
  const imagePath = `/api/galleries/${galleryId}/assets/${assetId}`;
  const token = "t".repeat(43);
  let exchanges = 0;
  const oldToken = "s".repeat(43);
  let finishExchange;
  const pendingExchange = new Promise(resolve => { finishExchange = resolve; });
  let finishLogout;
  const pendingLogout = new Promise(resolve => { finishLogout = resolve; });
  let deferNextMetadata = false;
  let finishRefresh;
  const pendingRefresh = new Promise(resolve => { finishRefresh = resolve; });
  const photo = await readFile(join(root, "portraits", "male.jpg"));
  await page.route(`**/api/galleries/${galleryId}/**`, async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/exchange")) {
      assert.equal(new URL(page.url()).hash, "", "Strip bearer fragment before exchange");
      const submitted = route.request().postDataJSON();
      assert.deepEqual(submitted, { token: exchanges === 0 ? oldToken : token });
      exchanges++;
      if (submitted.token === oldToken) await pendingExchange;
      galleryAuthorized = true;
      return route.fulfill({ contentType: "application/json", body: '{"success":true}' });
    }
    if (pathname.endsWith("/logout")) {
      await pendingLogout;
      galleryAuthorized = false;
      return route.fulfill({ contentType: "application/json", body: '{"success":true}' });
    }
    if (!galleryAuthorized) return route.fulfill({ status: 404, contentType: "application/json", body: '{}' });
    const variant = pathname.split("/").at(-1);
    return route.fulfill({ contentType: "image/jpeg", body: photo,
      headers: { "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; sandbox", "X-Content-Type-Options": "nosniff",
        "Content-Disposition": variant === "view" ? "inline" : `attachment; filename="synthetic-${variant}.jpg"` } });
  });
  await page.route(`**/api/galleries/${galleryId}`, async route => {
    if (deferNextMetadata) { deferNextMetadata = false; await pendingRefresh; }
    return route.fulfill({
    status: galleryAuthorized ? 200 : 404, contentType: "application/json",
    body: JSON.stringify(galleryAuthorized ? { id: galleryId, title: "Synthetic Private Gallery", clientDisplayName: "Test client",
      expiresAt: "2099-01-01T00:00:00Z", assets: [{ id: assetId, altText: "Synthetic portrait", width: 1498, height: 1873,
        orientation: "portrait", displayOrder: 0, webImageUrl: `${imagePath}/view`, webDownloadUrl: `${imagePath}/web`, fullDownloadUrl: `${imagePath}/full` }] } : {}),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const firstExchange = page.waitForRequest(request => request.url().endsWith(`/api/galleries/${galleryId}/exchange`));
  await page.goto(`${origin}/clients/${galleryId}#access=${oldToken}`);
  await firstExchange;
  await page.evaluate(token => { window.location.hash = `access=${token}`; }, token);
  await page.waitForFunction(() => window.location.hash === "");
  await page.getByRole("status").filter({ hasText: "Loading private gallery" }).waitFor();
  assert.equal(exchanges, 1, "Replacement exchange waits for the obsolete response");
  finishExchange();
  await page.getByRole("heading", { name: "Synthetic Private Gallery" }).waitFor();
  assert.equal(exchanges, 2);
  assert.equal(new URL(page.url()).hash, "");
  await page.reload();
  await page.getByRole("heading", { name: "Synthetic Private Gallery" }).waitFor();
  assert.equal(exchanges, 2, "Refresh uses the existing session");
  await page.getByRole("button", { name: "Open image 1: Synthetic portrait" }).click();
  if (process.env.BLACKBURN_SMOKE_SCREENSHOT)
    await page.screenshot({ path: process.env.BLACKBURN_SMOKE_SCREENSHOT });
  for (const [label, variant] of [["Download web-size image", "web"], ["Download full-resolution image", "full"]]) {
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: label }).click();
    assert.equal((await download).suggestedFilename(), `synthetic-${variant}.jpg`);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Gallery fits mobile viewport");
  await page.getByRole("button", { name: "Close image viewer" }).click();
  deferNextMetadata = true;
  const refreshRequest = page.waitForRequest(request => request.url().endsWith(`/api/galleries/${galleryId}`));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refreshRequest;
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("status").filter({ hasText: "Signing out…" }).waitFor();
  assert.equal(await page.getByText("Please keep this page open until sign-out is complete.").isVisible(), true);
  assert.equal(await page.getByRole("heading", { name: "Synthetic Private Gallery" }).count(), 0);
  assert.equal(await page.getByRole("heading", { name: "This gallery is unavailable." }).count(), 0);
  finishRefresh();
  await page.evaluate(token => { window.location.hash = `access=${token}`; }, token);
  await page.waitForFunction(() => window.location.hash === "");
  await page.getByRole("status").filter({ hasText: "Loading private gallery" }).waitFor();
  assert.equal(exchanges, 2, "Reopened link waits for the pending logout response");
  finishLogout();
  await page.getByRole("heading", { name: "Synthetic Private Gallery" }).waitFor();
  assert.equal(exchanges, 3, "Hash-only navigation after logout exchanges once without a reload");
  assert.equal(new URL(page.url()).hash, "");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("heading", { name: "This gallery is unavailable." }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "This gallery is unavailable." }).waitFor();
  await page.setViewportSize({ width: 1280, height: 900 });
  let response = { status: 503, body: { success: false } };
  const requests = [];
  await page.route("**/api/contact", async (route) => {
    assert.equal(route.request().method(), "POST");
    assert.equal(new URL(route.request().url()).origin, origin);
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    });
  });
  await page.goto(origin + "/contact");
  await page
    .getByLabel("Name *", { exact: true })
    .fill("Static export smoke test");
  await page
    .getByLabel("Email address *", { exact: true })
    .fill("synthetic@example.com");
  await page.getByLabel("Photography", { exact: true }).check();
  await page
    .getByLabel("Tell me about the photography you need *", { exact: true })
    .fill("Simulated enquiry to verify the exported website form.");
  await page
    .getByLabel(
      "I consent to Blackburn Studio using these details to respond to my enquiry. *",
      { exact: true },
    )
    .check();
  const send = page.getByRole("button", { name: "Send enquiry", exact: true });
  await send.click();
  await page
    .getByText("Unable to confirm your enquiry was sent.", { exact: false })
    .waitFor();
  assert.equal(
    await page.getByLabel("Name *", { exact: true }).inputValue(),
    "Static export smoke test",
  );
  response = { status: 429, body: { success: false } };
  await send.click();
  await page
    .getByText(
      "Too many submissions. Please try again later or contact us directly.",
      { exact: true },
    )
    .waitFor();
  response = {
    status: 400,
    body: {
      success: false,
      errors: [
        { field: "email", message: "Synthetic server validation error" },
      ],
    },
  };
  await send.click();
  await page
    .getByRole("button", { name: "Synthetic server validation error" })
    .waitFor();
  await page
    .getByRole("button", { name: "Synthetic server validation error" })
    .click();
  assert.equal(
    await page
      .getByLabel("Email address *", { exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  response = { status: 200, body: { success: true } };
  await send.click();
  await page
    .getByRole("region", { name: "Enquiry submission success" })
    .waitFor();
  assert.equal(requests.length, 4, "No automatic contact retries");
  assert.equal(requests[0].consent, true);
  assert.deepEqual(requests[0].services, ["photography"]);
  // Administration exercises the exported UI with synthetic platform identity.
  // Live role assignment and linked Function ingress are a release check.
  assert.ok(config.routes.some(rule => rule.route === "/api/admin/*" && rule.allowedRoles.includes("gallery_admin")));
  let adminSignedIn = false;
  let adminGallery;
  let uploadedPair = false;
  const otherAdminGallery = { id: "g_otherGallery12345678", title: "Other client", accessTokenVersion: 1, clientDisplayName: "Client B", message: "", status: "published", expiresAt: Date.parse("2099-01-01") };
  let rejectAccessChange = false;
  const adminLink = `${origin}/clients/${galleryId}#access=${token}`;
  await page.route("**/.auth/me", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({
    clientPrincipal: adminSignedIn ? { identityProvider: "aad", userId: "synthetic-operator", userRoles: ["authenticated", "gallery_admin"] } : null,
  }) }));
  await page.route("**/api/admin/galleries**", async route => {
    const request = route.request();
    if (request.method() === "GET" && new URL(request.url()).pathname.endsWith("/details")) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ gallery: adminGallery }) });
    if (request.method() === "GET") return route.fulfill({ contentType: "application/json", body: JSON.stringify({ galleries: adminGallery ? [adminGallery, otherAdminGallery] : [] }) });
    if (new URL(request.url()).pathname.endsWith("/assets")) {
      const form = await new Response(request.postDataBuffer(), { headers: { "Content-Type": request.headers()["content-type"] } }).formData();
      const web = form.get("web"), full = form.get("full");
      assert.equal(web.type, "image/jpeg"); assert.equal(full.type, "image/jpeg");
      assert.ok(web.size < full.size, "Web conversion makes a smaller download");
      uploadedPair = true;
      return route.fulfill({ status: 201, contentType: "application/json", body: '{"success":true}' });
    }
    if (new URL(request.url()).pathname.endsWith("/replace")) {
      if (rejectAccessChange) return route.abort("failed");
      adminGallery = { ...adminGallery, accessTokenVersion: adminGallery.accessTokenVersion + 1 };
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ link: adminLink, accessTokenVersion: adminGallery.accessTokenVersion }) });
    }
    const input = request.postDataJSON();
    adminGallery = { id: galleryId, accessTokenVersion: 1, title: input.title, clientDisplayName: input.clientDisplayName, message: input.message, status: "published", expiresAt: Date.parse(input.expiresAt) };
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ gallery: adminGallery, link: adminLink, accessTokenVersion: 1 }) });
  });
  await page.goto(origin + "/admin/galleries");
  await page.getByRole("link", { name: "Sign in with Microsoft" }).waitFor().catch(async error => { console.error(await page.locator("body").innerText(), pageErrors); throw error; });
  adminSignedIn = true;
  await page.reload();
  await page.getByLabel("Gallery title", { exact: true }).fill("Synthetic portraits");
  await page.getByLabel("Client name", { exact: true }).fill("Test client");
  await page.getByLabel("Welcome message", { exact: true }).fill("Admin validation only");
  await page.getByLabel("Available until", { exact: true }).fill(await page.evaluate(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)));
  await page.getByRole("button", { name: "Create gallery", exact: true }).click();
  await page.getByLabel("Private client link").waitFor();
  assert.equal(await page.getByLabel("Private client link").inputValue(), adminLink);
  const syntheticPhoto = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 3200; canvas.height = 2400;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#b9955a"; ctx.fillRect(0, 0, 3200, 2400);
    ctx.fillStyle = "#111111"; ctx.font = "160px sans-serif"; ctx.fillText("Synthetic test", 200, 600);
    return canvas.toDataURL("image/jpeg", .95).split(",")[1];
  });
  await page.getByLabel("JPEG photographs").setInputFiles({ name: "synthetic.jpg", mimeType: "image/jpeg", buffer: Buffer.from(syntheticPhoto, "base64") });
  await page.getByRole("button", { name: /Other client/ }).click();
  assert.equal(await page.getByLabel("JPEG photographs").evaluate(input => input.files.length), 0, "Switching galleries discards the previous client's pending files");
  await page.getByRole("button", { name: /Synthetic portraits/ }).click();
  assert.equal(await page.getByLabel("JPEG photographs").evaluate(input => input.files.length), 0);
  await page.getByLabel("JPEG photographs").setInputFiles({ name: "synthetic.jpg", mimeType: "image/jpeg", buffer: Buffer.from(syntheticPhoto, "base64") });
  await page.getByRole("button", { name: "Upload selected photos" }).click();
  await page.getByRole("status").filter({ hasText: "1 photo uploaded" }).waitFor();
  assert.equal(uploadedPair, true);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Admin fits mobile viewport");
  if (process.env.BLACKBURN_ADMIN_SCREENSHOT) await page.screenshot({ path: process.env.BLACKBURN_ADMIN_SCREENSHOT, fullPage: true });
  // Restore a link, then model a request whose completion cannot be confirmed.
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Replace client link" }).click();
  await page.getByLabel("Private client link").waitFor();
  await page.getByRole("button", { name: "Refresh list" }).click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some(button => button.textContent.trim() === "Refresh list" && !button.disabled));
  assert.equal(await page.getByLabel("Private client link").inputValue(), adminLink, "Unchanged link version survives refresh");
  adminGallery = { ...adminGallery, accessTokenVersion: adminGallery.accessTokenVersion + 1 };
  await page.getByRole("button", { name: "Refresh list" }).click();
  await page.waitForFunction(() => !document.querySelector('input[readonly]'));
  assert.equal(await page.getByRole("link", { name: "Open gallery" }).count(), 0, "External link replacement hides the stale bearer");
  await page.getByRole("button", { name: "Replace client link" }).click();
  await page.getByLabel("Private client link").waitFor();
  rejectAccessChange = true;
  await page.getByRole("button", { name: "Replace client link" }).click();
  await page.getByRole("alert").waitFor();
  assert.equal(await page.getByLabel("Private client link").count(), 0, "Lost replacement response hides the old bearer");
  adminGallery = { ...adminGallery, status: "revoked" };
  await page.getByRole("button", { name: "Refresh list" }).click();
  await page.getByText("Test client · revoked", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Upload selected photos" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Replace client link" }).count(), 0);
  assert.deepEqual(pageErrors, [], "No browser runtime errors");
  console.log(
    "Static export smoke passed: public routes, 404 isolation, sample/private galleries, fragment exchange, refresh, downloads, sign-out, admin create/upload and contact 400/429/503/200. Synthetic API only; no email sent.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
