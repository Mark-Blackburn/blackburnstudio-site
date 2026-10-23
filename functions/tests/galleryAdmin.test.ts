import { GalleryUploadValidationError } from "../src/galleryUploadValidation";
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
    userRoles: ["authenticated", "gallery_admin"],
  }),
).toString("base64");
const context = new InvocationContext({
  functionName: "test",
  logHandler: () => undefined,
});
const assetId = "a_privateAsset12345678";
function setup() {
  const store: GalleryAdminStore = {
    get: vi.fn(),
    list: vi.fn().mockResolvedValue({ galleries: [] }),
    create: vi.fn(),
    change: vi.fn().mockResolvedValue(2),
    upload: vi.fn(),
    photos: vi.fn().mockResolvedValue([]),
    preview: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue({ cleanupComplete: true }),
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
    url: origin + "/api/gallery-management/galleries",
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
  it.each(["assets", "preview", "remove"])(
    "denies client-only access to photo %s operations",
    async (action) => {
      const { handler, store } = setup();
      const result = await handler(
        req(
          action === "remove" ? "POST" : "GET",
          action === "remove" ? "{}" : undefined,
          { "x-ms-client-principal": "" },
          { galleryId: id, action },
        ),
        context,
      );
      expect(result.status).toBe(403);
      expect(store.photos).not.toHaveBeenCalled();
      expect(store.preview).not.toHaveBeenCalled();
      expect(store.remove).not.toHaveBeenCalled();
    },
  );

  it("lists admin photographs without granting a client session", async () => {
    const { handler, store } = setup();
    const result = await handler(
      req("GET", undefined, {}, { galleryId: id, action: "assets" }),
      context,
    );
    expect(result.status).toBe(200);
    expect(store.photos).toHaveBeenCalledWith(id);
    expect(result.headers).toMatchObject({ "Cache-Control": "no-store" });
  });

  it("returns only role-protected JPEG preview bytes with private response headers", async () => {
    const { handler, store } = setup();
    const bytes = Buffer.from([255, 216, 255, 217]);
    vi.mocked(store.preview).mockResolvedValue(bytes);
    const request = req(
      "GET",
      undefined,
      {},
      { galleryId: id, action: "preview" },
    );
    request.query.set("assetId", assetId);
    const result = await handler(request, context);
    expect(result.status).toBe(200);
    expect(result.body).toBe(bytes);
    expect(result.headers).toMatchObject({
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    expect(store.preview).toHaveBeenCalledWith(id, assetId);
  });

  it("rejects cross-origin removal and malformed asset IDs before calling storage", async () => {
    const { handler, store } = setup();
    const params = { galleryId: id, action: "remove" };
    expect(
      (
        await handler(
          req(
            "POST",
            JSON.stringify({ assetId }),
            { origin: "https://example.com" },
            params,
          ),
          context,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handler(
          req(
            "POST",
            JSON.stringify({ assetId: "../another-gallery/web.jpg" }),
            {},
            params,
          ),
          context,
        )
      ).status,
    ).toBe(400);
    expect(store.remove).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "reports acknowledged removal with cleanupComplete=%s",
    async (cleanupComplete) => {
      const { handler, store } = setup();
      vi.mocked(store.remove).mockResolvedValue({ cleanupComplete });
      const result = await handler(
        req(
          "POST",
          JSON.stringify({ assetId }),
          {},
          { galleryId: id, action: "remove" },
        ),
        context,
      );
      expect(result.status).toBe(200);
      expect(result.jsonBody).toMatchObject({ success: true, cleanupComplete });
      expect(store.remove).toHaveBeenCalledWith(id, assetId);
    },
  );

  it("returns a generic uncertain response when removal storage completion is unknown", async () => {
    const { handler, store } = setup();
    vi.mocked(store.remove).mockRejectedValue(new Error("secret SDK detail"));
    const result = await handler(
      req(
        "POST",
        JSON.stringify({ assetId }),
        {},
        { galleryId: id, action: "remove" },
      ),
      context,
    );
    expect(result.status).toBe(409);
    expect(JSON.stringify(result)).not.toContain("secret SDK detail");
  });
  it.each([
    "",
    "not-json",
    Buffer.from(
      JSON.stringify({
        identityProvider: "aad",
        userId: "operator",
        userRoles: ["authenticated", "gallery-admin"],
      }),
    ).toString("base64"),
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
        userRoles: ["authenticated", "gallery_admin"],
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
    accessTokenVersion: 3,
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

it.each([true, false])(
  "only exposes explicitly classified upload validation messages (safe=%s)",
  async (safe) => {
    const { handler, store } = setup();
    const message = safe
      ? "This gallery already contains the 250-photo maximum."
      : "private SDK endpoint or key";
    vi.mocked(store.upload).mockRejectedValue(
      safe ? new GalleryUploadValidationError(message) : new Error(message),
    );
    const form = new FormData();
    form.append("web", new Blob([new Uint8Array([255, 216, 255])]), "web.jpg");
    form.append(
      "full",
      new Blob([new Uint8Array([255, 216, 255])]),
      "full.jpg",
    );
    form.append("altText", "Test");
    const encoded = new Request(origin, { method: "POST", body: form });
    const request = new HttpRequest({
      method: "POST",
      url: origin,
      params: { galleryId: id, action: "assets" },
      headers: {
        "x-ms-client-principal": admin,
        origin,
        "content-type": encoded.headers.get("content-type")!,
      },
      body: { bytes: new Uint8Array(await encoded.arrayBuffer()) },
    });
    const result = await handler(request, context);
    expect(result.status).toBe(safe ? 400 : 409);
    if (safe) expect(result.jsonBody).toEqual({ message });
    else {
      expect(JSON.stringify(result)).not.toContain(message);
      expect(result.jsonBody).toMatchObject({
        message: expect.stringContaining("could not be confirmed"),
      });
    }
  },
);

it("issues links with a non-secret version for creation and replacement", async () => {
  const { handler } = setup();
  const created = await handler(
    req("POST", JSON.stringify({ title: "Test", expiresAt: "2026-11-01" })),
    context,
  );
  expect(created.jsonBody).toMatchObject({
    accessTokenVersion: 1,
    gallery: { accessTokenVersion: 1 },
  });
  const replaced = await handler(
    req("POST", "{}", {}, { galleryId: id, action: "replace" }),
    context,
  );
  expect(replaced.jsonBody).toMatchObject({
    accessTokenVersion: 2,
    link: expect.stringContaining("#access="),
  });
  expect(JSON.stringify(replaced.jsonBody)).not.toContain("accessTokenHash");
});
