import { it, expect, vi } from "vitest";
import type { TableClient } from "@azure/data-tables";
import {
  ALLOCATION_ROW,
  publishGalleryAsset,
  readGalleryAllocation,
  removeGalleryAsset,
} from "../src/galleryAssetPublication";
import { createGalleryAssetStore } from "../src/azureGalleryDelivery";
const id = "g_privateGallery123456";
const partitionKey = `gallery-assets-${id}`;
const allocation = {
  partitionKey,
  rowKey: ALLOCATION_ROW,
  galleryId: id,
  schemaVersion: 1,
  assetCount: 299,
  nextDisplayOrder: 299,
  etag: '"v1"',
};
const asset = (suffix: string) => ({
  galleryId: id,
  id: `a_${suffix.repeat(22)}`,
  altText: "Test",
  width: 100,
  height: 100,
  displayOrder: 299,
  webByteSize: 12,
  fullByteSize: 12,
});
it("fences a stale uploader after removal while preserving next order and reusable capacity", async () => {
  let state = { ...allocation, assetCount: 1, nextDisplayOrder: 299 };
  const rows = new Map([[asset("a").id, asset("a")]]);
  let version = 1;
  const client = {
    submitTransaction: vi.fn(async (actions) => {
      const update = actions[0];
      if (update[3].etag !== state.etag) throw new Error("Stale ETag");
      state = { ...update[1], etag: `"v${++version}"` };
      for (const action of actions.slice(1)) {
        if (action[0] === "delete") rows.delete(action[1].rowKey);
        else rows.set(action[1].id, action[1]);
      }
    }),
  } as unknown as TableClient;
  const stale = { ...state };
  await removeGalleryAsset(client, stale, asset("a").id, true);
  expect(state).toMatchObject({ assetCount: 0, nextDisplayOrder: 299 });
  expect(rows.size).toBe(0);
  await expect(publishGalleryAsset(client, stale, asset("b"))).rejects.toThrow(
    "Stale ETag",
  );
  await expect(
    removeGalleryAsset(client, stale, asset("a").id, true),
  ).rejects.toThrow("Stale ETag");
  await publishGalleryAsset(client, state, asset("c"));
  expect(state).toMatchObject({ assetCount: 1, nextDisplayOrder: 300 });
  expect(rows.size).toBe(1);
});

it("advances the allocation fence for an absent photo without decrementing twice", async () => {
  const submitTransaction = vi.fn();
  const client = { submitTransaction } as unknown as TableClient;
  await removeGalleryAsset(
    client,
    { ...allocation, assetCount: 0 },
    asset("a").id,
    false,
  );
  expect(submitTransaction).toHaveBeenCalledWith([
    [
      "update",
      expect.objectContaining({
        assetCount: 0,
        nextDisplayOrder: allocation.nextDisplayOrder,
      }),
      "Replace",
      { etag: allocation.etag },
    ],
  ]);
  await expect(
    removeGalleryAsset(
      client,
      { ...allocation, assetCount: 0 },
      asset("a").id,
      true,
    ),
  ).rejects.toThrow("Invalid asset allocation");
  expect(submitTransaction).toHaveBeenCalledTimes(1);
});
it("fences a delayed old writer at 299 photos so only one 300th asset can commit", async () => {
  let state = { ...allocation };
  const published: unknown[] = [];
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let calls = 0;
  const submitTransaction = vi.fn(async (actions) => {
    if (++calls === 1) {
      entered();
      await delayed;
    }
    const [update, create] = actions;
    expect(update[0]).toBe("update");
    expect(update[2]).toBe("Replace");
    expect(update[1].partitionKey).toBe(create[1].partitionKey);
    expect(create[0]).toBe("create");
    if (update[3].etag !== state.etag)
      throw Object.assign(new Error("Stale ETag"), { statusCode: 412 });
    // Model Azure's atomic ETag check + update + create, including a late request.
    state = { ...update[1], etag: '"v2"' };
    published.push(create[1]);
  });
  const client = { submitTransaction } as unknown as TableClient;
  const old = publishGalleryAsset(client, allocation, asset("a"));
  const rejection = expect(old).rejects.toThrow("Stale ETag");
  await started;
  await publishGalleryAsset(client, allocation, asset("b"));
  release();
  await rejection;
  expect(state.assetCount).toBe(300);
  expect(state.nextDisplayOrder).toBe(300);
  expect(published).toHaveLength(1);
  expect(published[0]).toMatchObject({ id: asset("b").id, displayOrder: 299 });
  await expect(
    publishGalleryAsset(client, state, { ...asset("c"), displayOrder: 300 }),
  ).rejects.toThrow("Invalid asset allocation");
  expect(submitTransaction).toHaveBeenCalledTimes(2);
});
it("bootstraps legacy photos without resetting their count or display order", async () => {
  let created: unknown;
  const legacy = {
    ...asset("a"),
    rowKey: asset("a").id,
    partitionKey,
    displayOrder: 5,
  };
  const client = {
    getEntity: vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 404 })
      .mockImplementation(async () => ({
        ...(created as object),
        etag: '"v1"',
      })),
    listEntities: () => ({
      async *[Symbol.asyncIterator]() {
        yield legacy;
      },
    }),
    createEntity: vi.fn(async (row) => {
      created = row;
    }),
  } as unknown as TableClient;
  expect(await readGalleryAllocation(client, id)).toMatchObject({
    assetCount: 1,
    nextDisplayOrder: 6,
    etag: '"v1"',
  });
});
it("converges on the winning allocation if another writer bootstraps first", async () => {
  const client = {
    getEntity: vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 404 })
      .mockResolvedValue(allocation),
    listEntities: () => ({ async *[Symbol.asyncIterator]() {} }),
    createEntity: vi.fn().mockRejectedValue({ statusCode: 409 }),
  } as unknown as TableClient;
  expect(await readGalleryAllocation(client, id)).toBe(allocation);
});
it("does not reset allocation on storage failure or malformed state", async () => {
  const createEntity = vi.fn();
  const getEntity = vi.fn().mockRejectedValue({ statusCode: 503 });
  const client = { getEntity, createEntity } as unknown as TableClient;
  await expect(readGalleryAllocation(client, id)).rejects.toMatchObject({
    statusCode: 503,
  });
  getEntity.mockResolvedValue({ ...allocation, assetCount: 301 });
  await expect(readGalleryAllocation(client, id)).rejects.toThrow(
    "Invalid allocation",
  );
  expect(createEntity).not.toHaveBeenCalled();
});
it("keeps gallery reads working with 300 photos plus the allocation row", async () => {
  const rows = Array.from({ length: 300 }, (_, n) => {
    const item = {
      ...asset("a"),
      id: `a_${String(n).padStart(22, "0")}`,
      displayOrder: n,
    };
    return { ...item, partitionKey, rowKey: item.id };
  });
  const client = {
    listEntities: () => ({
      async *[Symbol.asyncIterator]() {
        yield { ...allocation, assetCount: 300, nextDisplayOrder: 300 };
        yield* rows;
      },
    }),
  } as unknown as TableClient;
  const listed = await createGalleryAssetStore(client).listAssets(id);
  expect(listed).toHaveLength(300);
  expect(listed[299].displayOrder).toBe(299);
});

it.each([2, 300])(
  "bootstraps %s legacy photos with duplicate orders without storing an invalid allocation",
  async (count) => {
    let stored: unknown;
    const rows = Array.from({ length: count }, (_, n) => {
      const item = {
        ...asset("a"),
        id: `a_${String(n).padStart(22, "0")}`,
        displayOrder: 0,
      };
      return { ...item, rowKey: item.id, partitionKey };
    });
    const client = {
      getEntity: vi
        .fn()
        .mockRejectedValueOnce({ statusCode: 404 })
        .mockImplementation(async () => ({
          ...(stored as object),
          etag: '"v1"',
        })),
      createEntity: vi.fn(async (value) => {
        stored = value;
      }),
      listEntities: () => ({
        async *[Symbol.asyncIterator]() {
          if (stored) yield stored;
          yield* rows;
        },
      }),
    } as unknown as TableClient;
    expect(await readGalleryAllocation(client, id)).toMatchObject({
      assetCount: count,
      nextDisplayOrder: count,
    });
    const listed = await createGalleryAssetStore(client).listAssets(id);
    expect(listed).toHaveLength(count);
    expect(listed.every((row) => row.displayOrder === 0)).toBe(true);
  },
);
