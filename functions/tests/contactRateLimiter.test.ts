import { describe, expect, it, vi } from "vitest";
import type { TableClient } from "@azure/data-tables";
import {
  createDurableContactRateLimiter,
  type ContactRateLimitStore,
  type RateLimitRecord,
} from "../src/contactRateLimiter";
import {
  createAzureContactRateLimitStore,
  createConfiguredContactRateLimiter,
} from "../src/azureContactRateLimiter";
const SECRET = "test-only-secret-with-at-least-32-bytes";
const HOUR = 3_600_000;
function sharedStore() {
  const records = new Map<string, RateLimitRecord>();
  let revision = 0;
  const store: ContactRateLimitStore = {
    async read(key) {
      return records.has(key) ? { ...records.get(key)! } : null;
    },
    async create(key, timestamps) {
      if (records.has(key)) throw { statusCode: 409 };
      records.set(key, { timestamps, etag: String(++revision) });
    },
    async replace(key, timestamps, etag) {
      if (records.get(key)?.etag !== etag) throw { statusCode: 412 };
      records.set(key, { timestamps, etag: String(++revision) });
    },
  };
  return { records, store };
}
describe("durable limiter", () => {
  it("enforces a rolling hour across instances and restarts", async () => {
    const { store } = sharedStore();
    let time = HOUR;
    const a = createDurableContactRateLimiter(store, SECRET, () => time);
    const b = createDurableContactRateLimiter(store, SECRET, () => time);
    expect(await a.consume(" TEST@example.com ")).toBe(true);
    time += 1000;
    for (let i = 0; i < 4; i++)
      expect(await b.consume("test@example.com")).toBe(true);
    expect(await a.consume("test@example.com")).toBe(false);
    time = 2 * HOUR;
    const restarted = createDurableContactRateLimiter(
      store,
      SECRET,
      () => time,
    );
    expect(await restarted.consume("test@example.com")).toBe(true);
    expect(await restarted.consume("test@example.com")).toBe(false);
    time += 1000;
    expect(await restarted.consume("test@example.com")).toBe(true);
  });
  it("admits exactly five concurrent requests from twenty instances", async () => {
    const { store } = sharedStore();
    const instances = Array.from({ length: 20 }, () =>
      createDurableContactRateLimiter(store, SECRET, () => HOUR),
    );
    const results = await Promise.all(
      instances.map((limiter) => limiter.consume("test@example.com")),
    );
    expect(results.filter(Boolean)).toHaveLength(5);
  });
  it("isolates addresses and stores only opaque HMAC keys", async () => {
    const { store, records } = sharedStore();
    const limiter = createDurableContactRateLimiter(store, SECRET, () => HOUR);
    await limiter.consume("one@example.com");
    await limiter.consume("two@example.com");
    expect(records.size).toBe(2);
    for (const key of records.keys()) expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify([...records])).not.toContain("example.com");
  });
  it("retains timestamps if an instance clock moves backwards", async () => {
    const { store } = sharedStore();
    let time = HOUR;
    const limiter = createDurableContactRateLimiter(store, SECRET, () => time);
    for (let i = 0; i < 5; i++) await limiter.consume("a@example.com");
    time = 1;
    expect(await limiter.consume("a@example.com")).toBe(false);
  });
  it.each(["not-json", "{}", "[null]", "[-1]", "[1.5]", "[1,2,3,4,5,6]"])(
    "fails closed on corrupt record %s",
    async (timestamps) => {
      const { store } = sharedStore();
      store.read = async () => ({ timestamps, etag: "v1" });
      await expect(
        createDurableContactRateLimiter(store, SECRET).consume("a@example.com"),
      ).rejects.toThrow();
    },
  );
  it.each(["", "*"])("rejects unsafe ETag %s", async (etag) => {
    const { store } = sharedStore();
    store.read = async () => ({ timestamps: "[]", etag });
    await expect(
      createDurableContactRateLimiter(store, SECRET).consume("a@example.com"),
    ).rejects.toThrow();
  });
  it("bounds conflict retries and propagates storage outages", async () => {
    const { store } = sharedStore();
    store.create = vi.fn(async () => {
      throw { statusCode: 409 };
    });
    const limiter = createDurableContactRateLimiter(store, SECRET);
    await expect(limiter.consume("a@example.com")).rejects.toThrow(
      "contention",
    );
    expect(store.create).toHaveBeenCalledTimes(8);
    store.read = async () => {
      throw new Error("storage unavailable");
    };
    await expect(limiter.consume("a@example.com")).rejects.toThrow(
      "storage unavailable",
    );
  });
  it("rejects weak HMAC keys", () => {
    expect(() =>
      createDurableContactRateLimiter(sharedStore().store, "short"),
    ).toThrow();
  });
});
describe("Azure adapter", () => {
  it("uses conditional creates and exact ETags for replacements", async () => {
    const client = {
      getEntity: vi.fn(async () => ({
        timestamps: "[1]",
        etag: 'W/"revision"',
      })),
      createEntity: vi.fn(async () => ({})),
      updateEntity: vi.fn(async () => ({})),
    };
    const store = createAzureContactRateLimitStore(
      client as unknown as TableClient,
    );
    expect(await store.read("hash")).toEqual({
      timestamps: "[1]",
      etag: 'W/"revision"',
    });
    await store.create("hash", "[1]");
    await store.replace("hash", "[1,2]", 'W/"revision"');
    expect(client.createEntity).toHaveBeenCalledWith({
      partitionKey: "contact-email-v1",
      rowKey: "hash",
      timestamps: "[1]",
    });
    expect(client.updateEntity).toHaveBeenCalledWith(
      { partitionKey: "contact-email-v1", rowKey: "hash", timestamps: "[1,2]" },
      "Replace",
      { etag: 'W/"revision"' },
    );
  });
  it("distinguishes absent entities from table and permission failures", async () => {
    let failure = { statusCode: 404, code: "ResourceNotFound" };
    const store = createAzureContactRateLimitStore({
      getEntity: async () => {
        throw failure;
      },
    } as unknown as TableClient);
    expect(await store.read("hash")).toBeNull();
    failure = { statusCode: 404, code: "TableNotFound" };
    await expect(store.read("hash")).rejects.toEqual(failure);
    failure = { statusCode: 403, code: "AuthorizationPermissionMismatch" };
    await expect(store.read("hash")).rejects.toEqual(failure);
  });
});
describe("configuration", () => {
  it.each([
    {},
    { CONTACT_RATE_LIMIT_MODE: "memory" },
    {
      CONTACT_RATE_LIMIT_MODE: "memory",
      AZURE_FUNCTIONS_ENVIRONMENT: "Production",
    },
    {
      CONTACT_RATE_LIMIT_MODE: "memory",
      AZURE_FUNCTIONS_ENVIRONMENT: "Development",
      WEBSITE_INSTANCE_ID: "instance",
    },
    {
      CONTACT_RATE_LIMIT_MODE: "memory",
      AZURE_FUNCTIONS_ENVIRONMENT: "Development",
      WEBSITE_HOSTNAME: "app.azurewebsites.net",
    },
    {
      CONTACT_RATE_LIMIT_MODE: "table",
      CONTACT_RATE_LIMIT_TABLE_ENDPOINT:
        "http://account.table.core.windows.net",
    },
    {
      CONTACT_RATE_LIMIT_MODE: "table",
      CONTACT_RATE_LIMIT_TABLE_ENDPOINT:
        "https://account.table.core.windows.net?token=secret",
      CONTACT_RATE_LIMIT_TABLE_NAME: "RateLimits",
    },
    {
      CONTACT_RATE_LIMIT_MODE: "table",
      CONTACT_RATE_LIMIT_TABLE_ENDPOINT:
        "https://account.table.core.windows.net",
      CONTACT_RATE_LIMIT_TABLE_NAME: "RateLimits",
      CONTACT_RATE_LIMIT_HMAC_KEY: "short",
    },
  ])("fails closed with unsafe or missing configuration", async (env) => {
    await expect(
      createConfiguredContactRateLimiter(env).consume("a@example.com"),
    ).rejects.toThrow();
  });
  it("rejects unresolved Key Vault secret references", async () => {
    const limiter = createConfiguredContactRateLimiter({
      CONTACT_RATE_LIMIT_MODE: "table",
      CONTACT_RATE_LIMIT_TABLE_ENDPOINT: "https://account.table.core.windows.net",
      CONTACT_RATE_LIMIT_TABLE_NAME: "RateLimits",
      CONTACT_RATE_LIMIT_HMAC_KEY: "@Microsoft.KeyVault(SecretUri=https://vault.vault.azure.net/secrets/key)",
    });
    await expect(limiter.consume("a@example.com")).rejects.toThrow();
  });
  it("permits explicit local memory mode", async () => {
    const limiter = createConfiguredContactRateLimiter({
      CONTACT_RATE_LIMIT_MODE: "memory",
      AZURE_FUNCTIONS_ENVIRONMENT: "Development",
    });
    for (let i = 0; i < 5; i++)
      expect(await limiter.consume("a@example.com")).toBe(true);
    expect(await limiter.consume("a@example.com")).toBe(false);
  });
});
