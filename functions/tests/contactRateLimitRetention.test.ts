import { TableClient } from "@azure/data-tables";
import type { InvocationContext, Timer } from "@azure/functions";
import { describe, expect, it, vi } from "vitest";
import {
  CONTACT_RETENTION_AGE_MS,
  CONTACT_RETENTION_ROW_LIMIT,
  createContactRateLimitRetentionHandler,
  retainContactRateLimits,
} from "../src/contactRateLimitRetention";
import { createAzureContactRateLimitStore } from "../src/azureContactRateLimiter";
import { createDurableContactRateLimiter } from "../src/contactRateLimiter";

const NOW = Date.parse("2026-10-21T12:00:00Z");
const row = {
  partitionKey: "contact-email-v1",
  rowKey: "a".repeat(64),
  etag: 'W/"original"',
  timestamp: new Date(NOW - CONTACT_RETENTION_AGE_MS - 1).toISOString(),
  timestamps: JSON.stringify([NOW - CONTACT_RETENTION_AGE_MS]),
};
function clientFor(rows: object[]) {
  const listEntities = vi.fn(async function* () {
    yield* rows;
  });
  const deleteEntity = vi.fn(
    async (
      _partition: string,
      _row: string,
      _options: { etag?: string; abortSignal?: AbortSignal },
    ) => ({}),
  );
  return {
    listEntities,
    deleteEntity,
    client: { listEntities, deleteEntity } as unknown as TableClient,
  };
}

describe("contact limiter retention", () => {
  it("lets a contact submission recover if cleanup deletes the expired row after its read", async () => {
    const getEntity = vi
      .fn()
      .mockResolvedValueOnce({ timestamps: row.timestamps, etag: row.etag })
      .mockRejectedValue({
        statusCode: 404,
        details: { errorCode: "ResourceNotFound" },
      });
    const updateEntity = vi
      .fn()
      .mockRejectedValue({
        statusCode: 404,
        details: { errorCode: "ResourceNotFound" },
      });
    const createEntity = vi.fn().mockResolvedValue({});
    const store = createAzureContactRateLimitStore({
      getEntity,
      updateEntity,
      createEntity,
    } as unknown as TableClient);
    const limiter = createDurableContactRateLimiter(
      store,
      "test-only-secret-with-at-least-32-bytes",
      () => NOW,
    );
    await expect(limiter.consume("synthetic@example.com")).resolves.toBe(true);
    expect(getEntity).toHaveBeenCalledTimes(2);
    expect(updateEntity).toHaveBeenCalledOnce();
    expect(createEntity).toHaveBeenCalledWith(
      expect.objectContaining({ timestamps: JSON.stringify([NOW]) }),
    );
  });
  it("does not treat a missing table during contact replacement as a cleanup conflict", async () => {
    const failure = {
      statusCode: 404,
      details: { errorCode: "TableNotFound" },
    };
    const store = createAzureContactRateLimitStore({
      updateEntity: vi.fn().mockRejectedValue(failure),
    } as unknown as TableClient);
    await expect(store.replace("a".repeat(64), "[]", row.etag)).rejects.toEqual(
      failure,
    );
  });
  it("defaults to no implicit deletion and dry-run only counts eligible rows", async () => {
    const { client, listEntities, deleteEntity } = clientFor([row]);
    const result = await retainContactRateLimits(client, "dry-run", NOW);
    expect(result).toMatchObject({ eligible: 1, deleted: 0 });
    expect(deleteEntity).not.toHaveBeenCalled();
    expect(listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOptions: {
          filter:
            "PartitionKey eq 'contact-email-v1' and Timestamp lt datetime'2026-10-20T12:00:00.000Z'",
          select: ["PartitionKey", "RowKey", "Timestamp", "timestamps"],
        },
      }),
    );
  });
  it("deletes only with the enumerated exact ETag and propagates the abort signal", async () => {
    const { client, deleteEntity } = clientFor([row]);
    const signal = new AbortController().signal;
    expect(
      await retainContactRateLimits(client, "delete", NOW, signal),
    ).toMatchObject({ deleted: 1 });
    expect(deleteEntity).toHaveBeenCalledWith("contact-email-v1", row.rowKey, {
      etag: row.etag,
      abortSignal: signal,
    });
  });
  it.each([
    { etag: "" },
    { etag: "*" },
    { etag: " * " },
    { etag: undefined },
    { partitionKey: "other" },
    { rowKey: "raw@example.com" },
    { timestamp: "invalid" },
    { timestamp: undefined },
    { timestamp: new Date(NOW - CONTACT_RETENTION_AGE_MS).toISOString() },
    { timestamp: new Date(NOW).toISOString() },
    { timestamps: "[null]" },
    { timestamps: "[-1]" },
    { timestamps: "[1.5]" },
    { timestamps: "[1,2,3,4,5,6]" },
    { timestamps: "broken" },
    { timestamps: "{}" },
    { timestamps: JSON.stringify([NOW - 3_600_000 + 1]) },
    { timestamps: JSON.stringify([NOW + 1]) },
  ])("preserves unsafe, recent or active records: %j", async (override) => {
    const { client, deleteEntity } = clientFor([{ ...row, ...override }]);
    expect(await retainContactRateLimits(client, "delete", NOW)).toMatchObject({
      skipped: 1,
      deleted: 0,
    });
    expect(deleteEntity).not.toHaveBeenCalled();
  });
  it("preserves a record changed after enumeration", async () => {
    const { client, deleteEntity } = clientFor([row]);
    const current = {
      ...row,
      etag: 'W/"updated"',
      timestamps: JSON.stringify([NOW]),
    };
    deleteEntity.mockImplementation(async () => {
      // Table Storage rejects the old If-Match after a concurrent submission.
      if (deleteEntity.mock.calls.at(-1)?.[2]?.etag !== current.etag)
        throw { statusCode: 412 };
      throw new Error("Concurrent record must not be deleted");
    });
    expect(await retainContactRateLimits(client, "delete", NOW)).toMatchObject({
      deleted: 0,
      conflicts: 1,
    });
    expect(current.timestamps).toBe(JSON.stringify([NOW]));
    expect(deleteEntity).toHaveBeenCalledOnce();
  });
  it.each([
    { statusCode: 404, code: "ResourceNotFound" },
    { statusCode: 404, details: { errorCode: "ResourceNotFound" } },
    { statusCode: 404, details: { odataError: { code: "ResourceNotFound" } } },
  ])("tolerates an entity already removed by another run", async (failure) => {
    const { client, deleteEntity } = clientFor([row]);
    deleteEntity.mockRejectedValue(failure);
    expect(await retainContactRateLimits(client, "delete", NOW)).toMatchObject({
      conflicts: 1,
    });
  });
  it.each([
    { statusCode: 404, details: { errorCode: "TableNotFound" } },
    { statusCode: 403, code: "AuthorizationPermissionMismatch" },
    { statusCode: 500 },
    { statusCode: 404 },
  ])(
    "propagates table failures without retrying unconditionally",
    async (failure) => {
      const { client, deleteEntity } = clientFor([row]);
      deleteEntity.mockRejectedValue(failure);
      await expect(
        retainContactRateLimits(client, "delete", NOW),
      ).rejects.toEqual(failure);
      expect(deleteEntity).toHaveBeenCalledOnce();
    },
  );
  it("bounds the number of scanned and deleted rows", async () => {
    const { client, deleteEntity } = clientFor(
      Array.from({ length: CONTACT_RETENTION_ROW_LIMIT + 1 }, () => row),
    );
    expect(await retainContactRateLimits(client, "delete", NOW)).toMatchObject({
      scanned: 500,
      deleted: 500,
      limitReached: true,
    });
    expect(deleteEntity).toHaveBeenCalledTimes(500);
  });
  it.each([NaN, -1, 1.5, 0])(
    "rejects invalid clocks before accessing storage: %s",
    async (now) => {
      const { client, listEntities } = clientFor([row]);
      await expect(
        retainContactRateLimits(client, "delete", now),
      ).rejects.toThrow();
      expect(listEntities).not.toHaveBeenCalled();
    },
  );
  it("does not expose SDK details in timer errors or logs", async () => {
    const { client, listEntities } = clientFor([]);
    listEntities.mockImplementation(async function* () {
      throw new Error("sensitive-token-and-row-id");
      yield row;
    });
    const context = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    await expect(
      createContactRateLimitRetentionHandler(
        { CONTACT_RATE_LIMIT_RETENTION_MODE: "delete" },
        () => client,
      )({} as Timer, context as unknown as InvocationContext),
    ).rejects.toThrow("Contact rate-limit retention failed");
    expect(JSON.stringify(context.error.mock.calls)).not.toContain("sensitive");
  });
  it("rejects invalid retention mode before creating a storage client", async () => {
    const createClient = vi.fn();
    await expect(
      createContactRateLimitRetentionHandler({}, createClient)(
        {} as Timer,
        { error: vi.fn() } as unknown as InvocationContext,
      ),
    ).rejects.toThrow("retention failed");
    expect(createClient).not.toHaveBeenCalled();
  });
  it("uses real SDK Timestamp/ETag deserialization and sends an exact If-Match", async () => {
    const requests: { method: string; url: string; etag?: string }[] = [];
    const client = new TableClient(
      "https://synthetic.table.core.windows.net",
      "ContactRateLimits",
      {
        getToken: async () => ({
          token: "test-token",
          expiresOnTimestamp: Date.now() + 60_000,
        }),
      },
      {
        retryOptions: { maxRetries: 0 },
        httpClient: {
          async sendRequest(request) {
            requests.push({
              method: request.method,
              url: request.url,
              etag: request.headers.get("if-match"),
            });
            const values = new Map([
              ["content-type", "application/json;odata=minimalmetadata"],
            ]);
            return {
              request,
              status: request.method === "DELETE" ? 204 : 200,
              headers: {
                get: (name: string) => values.get(name.toLowerCase()),
                has: (name: string) => values.has(name.toLowerCase()),
                set: (name: string, value: string) => {
                  values.set(name.toLowerCase(), value);
                },
                delete: (name: string) => {
                  values.delete(name.toLowerCase());
                },
                toJSON: () => Object.fromEntries(values),
                [Symbol.iterator]: () => values.entries(),
              },
              bodyAsText:
                request.method === "DELETE"
                  ? ""
                  : JSON.stringify({
                      value: [
                        {
                          "odata.etag": row.etag,
                          PartitionKey: row.partitionKey,
                          RowKey: row.rowKey,
                          Timestamp: row.timestamp,
                          timestamps: row.timestamps,
                        },
                      ],
                    }),
            };
          },
        },
      },
    );
    expect(await retainContactRateLimits(client, "delete", NOW)).toMatchObject({
      deleted: 1,
      skipped: 0,
    });
    expect(requests.map((r) => r.method)).toEqual(["GET", "DELETE"]);
    expect(requests[1].etag).toBe(row.etag);
    expect(new URL(requests[0].url).searchParams.get("$filter")).toContain(
      "Timestamp lt datetime'",
    );
  });
});
