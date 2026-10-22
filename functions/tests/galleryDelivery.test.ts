import { Readable } from "node:stream";
import type { ContainerClient } from "@azure/storage-blob";
import type { TableClient } from "@azure/data-tables";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { describe, expect, it, vi } from "vitest";
import { createGallerySession, galleryCookieName, type GalleryAccessRecord } from "../src/galleryAccess";
import { createGalleryDeliveryHandlers } from "../src/galleryDelivery";
import { assetBlobName, MAX_FULL_BYTES, toClientAsset, type PrivateGalleryAsset } from "../src/galleryAssets";
import { createGalleryAssetStore, createGalleryBlobStore } from "../src/azureGalleryDelivery";

const id = "g_privateGallery123456";
const assetId = "a_privateAsset12345678";
const secret = "ab".repeat(32);
const time = Date.UTC(2026, 9, 23);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

function harness() {
  const record: GalleryAccessRecord = { id, title: "Private test", clientDisplayName: "Synthetic client", message: "Welcome",
    expiresAt: time + 86400_000, status: "published", accessTokenHash: "cd".repeat(32), accessTokenVersion: 1, sessionVersion: 1 };
  const asset: PrivateGalleryAsset = { galleryId: id, id: assetId, altText: "Synthetic photograph", width: 100, height: 150,
    displayOrder: 0, webByteSize: 4, fullByteSize: 4 };
  const store = { readGallery: vi.fn(async () => record), consumeExchange: vi.fn(async () => true) };
  const assets = { listAssets: vi.fn(async () => [asset]), readAsset: vi.fn(async (gallery: string, key: string) => key === assetId && gallery === id ? asset : null) };
  const blobs = { read: vi.fn(async () => jpeg) };
  const logs: unknown[] = [];
  const context = new InvocationContext({ functionName: "gallery", logHandler: (...args) => { logs.push(args); } });
  const handlers = createGalleryDeliveryHandlers({ store, assets, blobs, secret, now: () => time });
  const session = createGallerySession(record, secret, time).value;
  function request(variant = "view", authorized = true, galleryId = id, key = assetId) {
    return new HttpRequest({ method: "GET", url: `https://www.theblackburn.studio/api/galleries/${galleryId}/assets/${key}/${variant}`,
      params: { galleryId, assetId: key, variant },
      headers: authorized ? { cookie: `${galleryCookieName(galleryId)}=${session}` } : {} });
  }
  return { record, asset, assets, blobs, store, handlers, request, context, logs };
}

describe("private image and download authorization", () => {
  it.each(["view", "web", "full"])("serves %s through the same-origin API with private headers", async variant => {
    const h = harness(); const response = await h.handlers.image(h.request(variant), h.context);
    expect(response.status).toBe(200); expect(response.body).toEqual(jpeg);
    expect(response.headers).toMatchObject({ "Cache-Control": "no-store", "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; sandbox" });
    expect(h.blobs.read).toHaveBeenCalledWith(`${id}/${assetId}/${variant === "full" ? "full" : "web"}.jpg`, 4);
    expect(h.store.readGallery).toHaveBeenCalledTimes(2);
    expect((response.headers as Record<string, string>)["Content-Disposition"]).toContain(variant === "view" ? "inline" : "attachment;");
    expect(JSON.stringify(response.headers)).not.toContain("blob.core.windows.net");
  });

  it("returns only whitelisted asset metadata and generated URLs", async () => {
    const h = harness();
    Object.assign(h.asset, { clientEmail: "private@example.test", fullBlobPath: "secret/path", sas: "secret" });
    const response = await h.handlers.metadata(h.request(), h.context);
    expect(response.jsonBody).toMatchObject({ assets: [toClientAsset(h.asset)] });
    expect(JSON.stringify(response.jsonBody)).not.toMatch(/clientEmail|fullBlobPath|sas|secret\/path/);
  });

  it("does not look up assets or blobs without a valid gallery-bound session", async () => {
    const h = harness();
    for (const request of [h.request("view", false), h.request("view", true, "g_anotherGallery12345")])
      expect((await h.handlers.image(request, h.context)).status).toBe(404);
    expect(h.assets.readAsset).not.toHaveBeenCalled(); expect(h.blobs.read).not.toHaveBeenCalled();
  });

  it("cannot read another gallery's asset or use path traversal/unsupported variants", async () => {
    const h = harness();
    for (const request of [h.request("view", true, id, "a_otherAsset123456789"), h.request("../full"), h.request("view", true, id, "../../other")])
      expect((await h.handlers.image(request, h.context)).status).toBe(404);
    expect(h.blobs.read).not.toHaveBeenCalled();
  });

  it("rejects revoked sessions before Blob access and after revocation during a download", async () => {
    const h = harness(); h.record.status = "revoked";
    expect((await h.handlers.image(h.request(), h.context)).status).toBe(404);
    expect(h.blobs.read).not.toHaveBeenCalled();
    h.record.status = "published";
    h.blobs.read.mockImplementationOnce(async () => { h.record.sessionVersion++; return jpeg; });
    const response = await h.handlers.image(h.request(), h.context);
    expect(response.status).toBe(404); expect(response.body).toBeUndefined();
  });

  it("fails closed on storage errors and never logs SDK details", async () => {
    const h = harness(); h.blobs.read.mockRejectedValue(new Error("private Blob URL?sig=secret"));
    const response = await h.handlers.image(h.request("full"), h.context);
    expect(response.status).toBe(503); expect(response.body).toBeUndefined();
    expect(JSON.stringify(h.logs)).toContain("[gallery-api] Request failed");
    expect(JSON.stringify([response, h.logs])).not.toMatch(/sig=|private Blob/);
  });
});

describe("gallery storage constraints", () => {
  function blobHarness(options: { public?: boolean; length?: number; data?: Buffer; missing?: boolean } = {}) {
    const download = vi.fn(async () => ({ contentLength: options.length ?? jpeg.length,
      readableStreamBody: options.missing ? undefined : Readable.from([options.data ?? jpeg]) }));
    const container = { getProperties: vi.fn(async () => ({ blobPublicAccess: options.public ? "blob" : undefined })),
      getBlobClient: vi.fn(() => ({ download })) };
    return { container, download, store: createGalleryBlobStore(container as unknown as ContainerClient) };
  }
  it("reads a private JPEG without returning a SAS or redirect", async () => {
    const h = blobHarness(); expect(await h.store.read("approved.jpg", 4)).toEqual(jpeg);
    expect(h.download).toHaveBeenCalledOnce();
  });
  it("refuses public containers before starting a download", async () => {
    const h = blobHarness({ public: true }); await expect(h.store.read("image.jpg", 4)).rejects.toThrow();
    expect(h.download).not.toHaveBeenCalled();
  });
  it.each([{ length: 999 }, { data: Buffer.from("<html>") }, { data: jpeg.subarray(0, 3) }, { missing: true }])("rejects missing, oversized, truncated or non-JPEG data %j", async options => {
    await expect(blobHarness(options).store.read("image.jpg", 4)).rejects.toThrow();
  });
  it("applies the byte ceiling before storage calls", async () => {
    const h = blobHarness(); await expect(h.store.read("image.jpg", MAX_FULL_BYTES + 1)).rejects.toThrow();
    expect(h.container.getProperties).not.toHaveBeenCalled();
  });
  it("isolates asset partitions and rejects corrupt cross-gallery records", async () => {
    const h = harness();
    const client = { getEntity: vi.fn(async () => ({ ...h.asset, galleryId: "g_otherGallery12345678" })),
      listEntities: vi.fn(async function* () { yield { ...h.asset, rowKey: assetId }; }) };
    const store = createGalleryAssetStore(client as unknown as TableClient);
    await expect(store.readAsset(id, assetId)).rejects.toThrow();
    expect(client.getEntity).toHaveBeenCalledWith(`gallery-assets-${id}`, assetId);
    expect(await store.listAssets(id)).toEqual([expect.objectContaining({ id: assetId })]);
    expect(client.listEntities).toHaveBeenCalledWith({ queryOptions: { filter: `PartitionKey eq 'gallery-assets-${id}'` } });
    await expect(store.listAssets("x' or true")).rejects.toThrow();
    expect(assetBlobName(h.asset, true)).toBe(`${id}/${assetId}/full.jpg`);
  });
});
