import type { TableClient } from "@azure/data-tables";
import { describe, expect, it, vi } from "vitest";
import { createAzureGalleryAccessStore, createConfiguredGalleryAccess } from "../src/azureGalleryAccess";

const notFound = () => Object.assign(new Error("missing row"), { statusCode: 404, details: { errorCode: "ResourceNotFound" } });
const time = Date.UTC(2026, 9, 23);

function table() {
  let row: { attempts: string; etag: string } | undefined;
  let sequence = 0;
  const client = {
    getEntity: vi.fn(async () => { if (!row) throw notFound(); return { ...row }; }),
    createEntity: vi.fn(async (entity: { attempts: string }) => {
      if (row) throw Object.assign(new Error("conflict"), { statusCode: 409 });
      row = { attempts: entity.attempts, etag: `etag-${++sequence}` };
    }),
    updateEntity: vi.fn(async (entity: { attempts: string }, mode: string, options: { etag: string }) => {
      expect(mode).toBe("Replace");
      if (!row || options.etag !== row.etag) throw Object.assign(new Error("conflict"), { statusCode: 412 });
      row = { attempts: entity.attempts, etag: `etag-${++sequence}` };
    }),
  };
  return { client, store: () => createAzureGalleryAccessStore(client as unknown as TableClient),
    set: (value: typeof row) => { row = value; }, row: () => row };
}

describe("gallery Azure adapter", () => {
  it("shares a bounded global allowance across store recreation and rolls over after five minutes", async () => {
    const t = table();
    for (let i = 0; i < 30; i++) expect(await t.store().consumeExchange(time)).toBe(true);
    expect(await t.store().consumeExchange(time)).toBe(false);
    expect(await t.store().consumeExchange(time - 1000)).toBe(false);
    expect(await t.store().consumeExchange(time + 300_000)).toBe(true);
    expect(JSON.parse(t.row()!.attempts)).toEqual([time + 300_000]);
    expect(t.client.createEntity).toHaveBeenCalledOnce();
  });

  it("retries concurrent creates and updates instead of losing allowances", async () => {
    const t = table();
    const replies = await Promise.all(Array.from({ length: 6 }, () => t.store().consumeExchange(time)));
    expect(replies).toEqual(Array(6).fill(true));
    expect(JSON.parse(t.row()!.attempts)).toHaveLength(6);
    for (const call of t.client.updateEntity.mock.calls) expect(call[2].etag).not.toBe("*");
  });

  it.each(["not-json", "{}", "[null]", "[-1]", JSON.stringify(Array(31).fill(time))])("fails closed on invalid limiter data %s", async attempts => {
    const t = table(); t.set({ attempts, etag: "etag" });
    await expect(t.store().consumeExchange(time)).rejects.toThrow();
    expect(t.client.updateEntity).not.toHaveBeenCalled();
  });

  it("rejects wildcard ETags and bounds retries", async () => {
    const t = table(); t.set({ attempts: "[]", etag: "*" });
    await expect(t.store().consumeExchange(time)).rejects.toThrow();
    t.set({ attempts: "[]", etag: "etag" });
    t.client.updateEntity.mockRejectedValue(Object.assign(new Error("conflict"), { statusCode: 412 }));
    await expect(t.store().consumeExchange(time)).rejects.toThrow("contention");
    expect(t.client.updateEntity).toHaveBeenCalledTimes(8);
  });

  it.each([403, 500, 503])("propagates HTTP %s rather than granting access", async statusCode => {
    const t = table(); t.client.getEntity.mockRejectedValue(Object.assign(new Error("private details"), { statusCode }));
    await expect(t.store().consumeExchange(time)).rejects.toThrow();
    await expect(t.store().readGallery("g_testGallery12345678")).rejects.toThrow();
    expect(t.client.createEntity).not.toHaveBeenCalled();
  });

  it("distinguishes missing entities from missing tables and invalid gallery rows", async () => {
    const t = table();
    expect(await t.store().readGallery("g_testGallery12345678")).toBeNull();
    t.client.getEntity.mockRejectedValue(Object.assign(new Error("missing table"), { statusCode: 404, details: { errorCode: "TableNotFound" } }));
    await expect(t.store().readGallery("g_testGallery12345678")).rejects.toThrow();
    t.client.getEntity.mockResolvedValue({ attempts: "[]", etag: "etag" });
    await expect(t.store().readGallery("g_testGallery12345678")).rejects.toThrow("Invalid gallery record");
  });

  const config = { GALLERY_ACCESS_HMAC_KEY: "ab".repeat(32), GALLERY_TABLE_ENDPOINT: "https://example.table.core.windows.net",
    GALLERY_TABLE_NAME: "ClientGalleries", GALLERY_PUBLIC_ORIGIN: "https://www.theblackburn.studio" };
  it("accepts dedicated identity-based storage configuration without making requests", () => {
    expect(createConfiguredGalleryAccess(config)).toMatchObject({ origin: config.GALLERY_PUBLIC_ORIGIN });
  });
  it.each([
    { GALLERY_ACCESS_HMAC_KEY: "@Microsoft.KeyVault(unresolved)" },
    { GALLERY_TABLE_ENDPOINT: "http://example.test" },
    { GALLERY_TABLE_ENDPOINT: "https://example.test/?sig=secret" },
    { GALLERY_TABLE_ENDPOINT: "https://user:pass@example.test" },
    { GALLERY_TABLE_NAME: "bad-name" },
    { GALLERY_PUBLIC_ORIGIN: "https://www.theblackburn.studio/clients" },
    { GALLERY_PUBLIC_ORIGIN: "http://www.theblackburn.studio" },
  ])("rejects malformed configuration %j", override => {
    expect(() => createConfiguredGalleryAccess({ ...config, ...override })).toThrow();
  });
});
