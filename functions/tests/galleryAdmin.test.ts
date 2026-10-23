import { describe, it, expect, vi } from "vitest";
import { HttpRequest, InvocationContext } from "@azure/functions";
import {
  createGalleryAdminHandler,
  type GalleryAdminStore,
  readAdminBody,
} from "../src/galleryAdmin";
import { jpegDimensions } from "../src/azureGalleryAdmin";

const origin = "https://www.theblackburn.studio";
const id = "g_privateGallery123456";
const admin = Buffer.from(
  JSON.stringify({
    identityProvider: "aad",
    userId: "operator",
    userRoles: ["authenticated", "gallery-admin"],
  }),
).toString("base64");
const context = new InvocationContext({
  functionName: "test",
  logHandler: () => undefined,
});
function setup() {
  const store: GalleryAdminStore = {
    get: vi.fn(),
    list: vi.fn().mockResolvedValue({ galleries: [] }),
    create: vi.fn(),
    change: vi.fn(),
    upload: vi.fn(),
  };
  const handler = createGalleryAdminHandler({
    store,
    origin,
    secret: "a".repeat(64),
    now: () => Date.parse("2026-10-23"),
  });
  return { store, handler };
}
function req(
  method = "GET",
  body?: string,
  headers: Record<string, string> = {},
  params = {},
) {
  return new HttpRequest({
    method,
    url: origin + "/api/admin/galleries",
    params,
    headers: {
      "x-ms-client-principal": admin,
      origin,
      "content-type": "application/json",
      ...headers,
    },
    body: body ? { string: body } : undefined,
  });
}
describe("gallery administration boundary", () => {
  it.each([
    "",
    "not-json",
    Buffer.from(
      JSON.stringify({
        identityProvider: "aad",
        userId: "client",
        userRoles: ["authenticated"],
      }),
    ).toString("base64"),
    Buffer.from(
      JSON.stringify({
        identityProvider: "github",
        userId: "operator",
        userRoles: ["authenticated", "gallery-admin"],
      }),
    ).toString("base64"),
  ])("denies missing/malformed/non-admin principal %s", async (header) => {
    const { handler, store } = setup();
    expect(
      (
        await handler(
          req("GET", undefined, { "x-ms-client-principal": header }),
          context,
        )
      ).status,
    ).toBe(403);
    expect(store.list).not.toHaveBeenCalled();
  });
  it("does not grant admin via a client gallery cookie", async () => {
    const { handler, store } = setup();
    expect(
      (
        await handler(
          req("POST", "{}", {
            "x-ms-client-principal": "",
            cookie: "__Host-bbs-gallery-test=anything",
          }),
          context,
        )
      ).status,
    ).toBe(403);
    expect(store.create).not.toHaveBeenCalled();
  });
  it("rejects cross-origin mutations before storage", async () => {
    const { handler, store } = setup();
    expect(
      (
        await handler(
          req("POST", "{}", { origin: "https://evil.example" }),
          context,
        )
      ).status,
    ).toBe(403);
    expect(store.create).not.toHaveBeenCalled();
  });
  it("lists with no-store headers", async () => {
    const { handler } = setup();
    const r = await handler(req(), context);
    expect(r.status).toBe(200);
    expect(r.headers).toMatchObject({ "Cache-Control": "no-store" });
  });
  it("creates gallery and returns bearer once without exposing stored hash", async () => {
    const { handler, store } = setup();
    const r = await handler(
      req(
        "POST",
        JSON.stringify({ title: "Client portraits", expiresAt: "2026-11-01" }),
      ),
      context,
    );
    expect(r.status).toBe(201);
    expect(r.jsonBody).toMatchObject({
      gallery: { title: "Client portraits", status: "published" },
    });
    expect(JSON.stringify(r.jsonBody)).not.toContain("accessTokenHash");
    expect((r.jsonBody as { link: string }).link).toMatch(
      /^https:\/\/www.theblackburn.studio\/clients\/g_[\w-]+#access=[\w-]{43}$/,
    );
    expect(store.create).toHaveBeenCalledOnce();
  });
  it.each(["2026-10-22", "2028-01-01", "invalid"])(
    "rejects invalid expiry %s",
    async (expiresAt) => {
      const { handler, store } = setup();
      expect(
        (
          await handler(
            req("POST", JSON.stringify({ title: "Test", expiresAt })),
            context,
          )
        ).status,
      ).toBe(400);
      expect(store.create).not.toHaveBeenCalled();
    },
  );
  it("replaces or revokes only the requested valid gallery", async () => {
    const { handler, store } = setup();
    expect(
      (
        await handler(
          req("POST", "{}", {}, { galleryId: id, action: "replace" }),
          context,
        )
      ).status,
    ).toBe(200);
    expect(store.change).toHaveBeenCalledWith(
      id,
      "replace",
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(
      (
        await handler(
          req("POST", "{}", {}, { galleryId: id, action: "revoke" }),
          context,
        )
      ).status,
    ).toBe(200);
    expect(store.change).toHaveBeenCalledWith(id, "revoke");
  });
  it("rejects sample and path traversal IDs", async () => {
    const { handler, store } = setup();
    for (const galleryId of ["../other", "g_7Rk3mN9xQ2vL8pT4"])
      expect(
        (
          await handler(
            req("POST", "{}", {}, { galleryId, action: "revoke" }),
            context,
          )
        ).status,
      ).toBe(400);
    expect(store.change).not.toHaveBeenCalled();
  });
  it("bounds streaming bodies even without Content-Length", async () => {
    await expect(readAdminBody(req("POST", "12345678"), 4)).rejects.toThrow(
      "Body too large",
    );
  });
  it("does not leak storage errors", async () => {
    const { handler, store } = setup();
    vi.mocked(store.list).mockRejectedValue(
      new Error("secret-endpoint-and-key"),
    );
    const r = await handler(req(), context);
    expect(r.status).toBe(409);
    expect(JSON.stringify(r)).not.toContain("secret-endpoint");
  });
  it("accepts one multipart JPEG pair", async () => {
    const { handler, store } = setup();
    const form = new FormData();
    form.append("web", new Blob([new Uint8Array([255, 216, 255])]), "web.jpg");
    form.append(
      "full",
      new Blob([new Uint8Array([255, 216, 255])]),
      "full.jpg",
    );
    form.append("altText", "Test");
    const built = new Request(origin, { method: "POST", body: form });
    const request = new HttpRequest({
      method: "POST",
      url: origin,
      params: { galleryId: id, action: "assets" },
      headers: {
        "x-ms-client-principal": admin,
        origin,
        "content-type": built.headers.get("content-type")!,
      },
      body: { bytes: new Uint8Array(await built.arrayBuffer()) },
    });
    expect((await handler(request, context)).status).toBe(201);
    expect(store.upload).toHaveBeenCalledWith(
      id,
      expect.any(Buffer),
      expect.any(Buffer),
      "Test",
    );
  });
  it("rejects non-JPEG and oversized input at the storage boundary", () => {
    expect(() => jpegDimensions(Buffer.from("not a jpeg"), 100)).toThrow();
    expect(() => jpegDimensions(Buffer.alloc(101), 100)).toThrow();
  });
});

it("refreshes an authorized selected gallery independently of listing pages", async () => {
  const { handler, store } = setup();
  vi.mocked(store.get).mockResolvedValue({
    id,
    title: "Later gallery",
    clientDisplayName: "Client",
    message: "",
    status: "revoked",
    expiresAt: 1,
  });
  const result = await handler(
    req("GET", undefined, {}, { galleryId: id, action: "details" }),
    context,
  );
  expect(result.status).toBe(200);
  expect(result.jsonBody).toMatchObject({ gallery: { id, status: "revoked" } });
  expect(store.get).toHaveBeenCalledWith(id);
  expect(store.list).not.toHaveBeenCalled();
});
