import { randomBytes } from "node:crypto";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { describe, expect, it, vi } from "vitest";
import {
  createGallerySession, galleryCookieName, hashGalleryToken, readGallerySession,
  type GalleryAccessRecord, type GalleryAccessStore,
} from "../src/galleryAccess";
import { createGalleryHandlers } from "../src/galleryHttp";

const id = "g_testGallery12345678";
const otherId = "g_otherGallery1234567";
const secret = "ab".repeat(32);
const token = randomBytes(32).toString("base64url");
const origin = "https://www.theblackburn.studio";
const time = Date.UTC(2026, 9, 23);

function harness() {
  let clock = time;
  const record: GalleryAccessRecord = {
    id, title: "Test gallery", clientDisplayName: "Test client", message: "Welcome",
    status: "published", expiresAt: time + 24 * 60 * 60 * 1000,
    accessTokenHash: hashGalleryToken(secret, id, token), accessTokenVersion: 1, sessionVersion: 1,
  };
  const store: GalleryAccessStore = {
    readGallery: vi.fn(async key => key === record.id ? record : null),
    consumeExchange: vi.fn(async () => true),
  };
  const logs: unknown[] = [];
  const context = new InvocationContext({ functionName: "gallery", logHandler: (...args) => { logs.push(args); } });
  const handlers = createGalleryHandlers({ store, secret, origin, now: () => clock });
  function request(method = "POST", options: { token?: string; cookie?: string; id?: string; origin?: string; body?: string; contentType?: string } = {}) {
    return new HttpRequest({ method, url: `${origin}/api/galleries/${options.id ?? id}`,
      params: { galleryId: options.id ?? id },
      headers: { origin: options.origin ?? origin, "content-type": options.contentType ?? "application/json",
        ...(options.cookie ? { cookie: options.cookie } : {}) },
      ...(method === "POST" ? { body: { string: options.body ?? JSON.stringify({ token: options.token ?? token }) } } : {}),
    });
  }
  async function exchange() { return handlers.exchange(request(), context); }
  async function metadata(cookie: string, galleryId = id) {
    return handlers.metadata(request("GET", { cookie, id: galleryId }), context);
  }
  return { handlers, request, metadata, exchange, record, store, logs, context,
    setTime: (value: number) => { clock = value; } };
}

describe("private gallery access", () => {
  it("exchanges a link for a host-only secure HttpOnly cookie; whitelists metadata", async () => {
    const h = harness();
    const result = await h.exchange();
    expect(result.status).toBe(200);
    const cookie = result.cookies![0];
    expect(cookie).toMatchObject({ name: galleryCookieName(id), path: "/", httpOnly: true, secure: true, sameSite: "Strict", maxAge: 43200 });
    expect(cookie.domain).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain(token);
    const response = await h.metadata(`${cookie.name}=${cookie.value}`);
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ id, title: "Test gallery", clientDisplayName: "Test client", message: "Welcome",
      expiresAt: new Date(h.record.expiresAt).toISOString(), assets: [] });
    for (const reply of [result, response]) {
      expect(reply.headers).toMatchObject({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
      expect(JSON.stringify(reply)).not.toContain(h.record.accessTokenHash);
    }
    expect(h.logs).toEqual([]);
  });

  it.each(["draft", "unpublished", "revoked"] as const)("hides %s galleries", async status => {
    const h = harness(); h.record.status = status;
    expect(await h.exchange()).toMatchObject({ status: 404, jsonBody: { message: "Gallery unavailable." } });
  });

  it("gives identical responses for absent, expired and wrong-token galleries", async () => {
    const h = harness();
    const wrong = await h.handlers.exchange(h.request("POST", { token: randomBytes(32).toString("base64url") }), h.context);
    const missing = await h.handlers.exchange(h.request("POST", { id: otherId }), h.context);
    h.record.expiresAt = time;
    expect(await h.exchange()).toEqual(wrong);
    expect(missing).toEqual(wrong);
  });

  it.each(["status", "sessionVersion", "accessTokenVersion", "expiresAt"])("rechecks %s after session issuance", async field => {
    const h = harness(); const cookie = (await h.exchange()).cookies![0];
    if (field === "status") h.record.status = "revoked";
    if (field === "expiresAt") h.record.expiresAt = time;
    if (field === "sessionVersion") h.record.sessionVersion++;
    if (field === "accessTokenVersion") h.record.accessTokenVersion++;
    expect((await h.metadata(`${cookie.name}=${cookie.value}`)).status).toBe(404);
  });

  it("rejects missing, modified, duplicate and cross-gallery cookies before storage access", async () => {
    const h = harness(); const cookie = (await h.exchange()).cookies![0];
    vi.mocked(h.store.readGallery).mockClear();
    const valid = `${cookie.name}=${cookie.value}`;
    for (const value of ["", valid + "x", `${valid}; ${valid}`]) expect((await h.metadata(value)).status).toBe(404);
    expect((await h.metadata(`${galleryCookieName(otherId)}=${cookie.value}`, otherId)).status).toBe(404);
    expect(h.store.readGallery).not.toHaveBeenCalled();
  });

  it("enforces absolute session expiry and caps sessions at gallery expiry", async () => {
    const h = harness(); h.record.expiresAt = time + 60_000;
    const cookie = (await h.exchange()).cookies![0]; expect(cookie.maxAge).toBe(60);
    h.setTime(time + 60_000);
    expect((await h.metadata(`${cookie.name}=${cookie.value}`)).status).toBe(404);
  });

  it("does not revive old sessions if a gallery ID is reused with a new link", async () => {
    const h = harness(); const cookie = (await h.exchange()).cookies![0];
    h.record.accessTokenHash = hashGalleryToken(secret, id, randomBytes(32).toString("base64url"));
    expect((await h.metadata(`${cookie.name}=${cookie.value}`)).status).toBe(404);
  });

  it("rejects forged session payloads and key rotation invalidates prior sessions", () => {
    const h = harness(); const session = createGallerySession(h.record, secret, time);
    const [payload, sig] = session.value.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), sessionVersion: 99 })).toString("base64url");
    expect(readGallerySession(`${forged}.${sig}`, id, secret, time)).toBeNull();
    expect(readGallerySession(session.value, id, "cd".repeat(32), time)).toBeNull();
    expect(hashGalleryToken(secret, id, token)).not.toBe(hashGalleryToken(secret, otherId, token));
  });

  it("requires exact same-origin JSON POST; rejects oversized and invalid bodies", async () => {
    const h = harness();
    expect((await h.handlers.exchange(h.request("POST", { origin: "https://evil.example" }), h.context)).status).toBe(403);
    expect((await h.handlers.exchange(h.request("POST", { origin: "null" }), h.context)).status).toBe(403);
    expect((await h.handlers.exchange(h.request("POST", { contentType: "text/plain" }), h.context)).status).toBe(415);
    for (const body of ["{", "null", JSON.stringify({ token: "x".repeat(2048) })])
      expect([400, 404]).toContain((await h.handlers.exchange(h.request("POST", { body }), h.context)).status);
    expect(h.store.readGallery).not.toHaveBeenCalled();
  });

  it("does not read gallery records after global exchange exhaustion", async () => {
    const h = harness(); vi.mocked(h.store.consumeExchange).mockResolvedValue(false);
    expect(await h.exchange()).toMatchObject({ status: 429, headers: { "Retry-After": "300" } });
    expect(h.store.readGallery).not.toHaveBeenCalled();
  });

  it.each(["consumeExchange", "readGallery"] as const)("fails closed on %s outage without exception details", async method => {
    const h = harness(); vi.mocked(h.store[method]).mockRejectedValue(new Error(`private ${token} storage detail`));
    const response = await h.exchange();
    expect(response).toMatchObject({ status: 503, jsonBody: { message: "Gallery temporarily unavailable." } });
    expect(JSON.stringify(h.logs)).toContain("[gallery-api] Request failed");
    expect(JSON.stringify([response, h.logs])).not.toContain(token);
    expect(response.cookies).toBeUndefined();
  });

  it("clears only the selected gallery cookie on same-origin logout", async () => {
    const h = harness();
    expect(await h.handlers.logout(h.request(), h.context)).toMatchObject({ status: 200, cookies: [{ name: galleryCookieName(id), value: "", maxAge: 0 }] });
    expect((await h.handlers.logout(h.request("POST", { origin: "https://evil.example" }), h.context)).status).toBe(403);
    expect(h.store.readGallery).not.toHaveBeenCalled();
  });
});
