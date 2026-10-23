import { it, expect, vi } from "vitest";
import type { TableClient } from "@azure/data-tables";
import {
  ALLOCATION_ROW,
  publishGalleryAsset,
  readGalleryAllocation,
} from "../src/galleryAssetPublication";
import { createGalleryAssetStore } from "../src/azureGalleryDelivery";
const id = "g_privateGallery123456";
const partitionKey = `gallery-assets-${id}`;
const allocation = {
  partitionKey,
  rowKey: ALLOCATION_ROW,
  galleryId: id,
  schemaVersion: 1,
  assetCount: 249,
  nextDisplayOrder: 249,
  etag: '"v1"',
};
const asset = (suffix: string) => ({
  galleryId: id,
  id: `a_${suffix.repeat(22)}`,
  altText: "Test",
  width: 100,
  height: 100,
  displayOrder: 249,
  webByteSize: 12,
  fullByteSize: 12,
});
it("fences a delayed old writer at 249 photos so only one 250th asset can commit", async () => {
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
  expect(state.assetCount).toBe(250);
  expect(state.nextDisplayOrder).toBe(250);
  expect(published).toHaveLength(1);
  expect(published[0]).toMatchObject({ id: asset("b").id, displayOrder: 249 });
  await expect(
    publishGalleryAsset(client, state, { ...asset("c"), displayOrder: 250 }),
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
  getEntity.mockResolvedValue({ ...allocation, assetCount: 251 });
  await expect(readGalleryAllocation(client, id)).rejects.toThrow(
    "Invalid allocation",
  );
  expect(createEntity).not.toHaveBeenCalled();
});
it("keeps gallery reads working with 250 photos plus the allocation row", async () => {
  const rows = Array.from({ length: 250 }, (_, n) => {
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
        yield { ...allocation, assetCount: 250, nextDisplayOrder: 250 };
        yield* rows;
      },
    }),
  } as unknown as TableClient;
  const listed = await createGalleryAssetStore(client).listAssets(id);
  expect(listed).toHaveLength(250);
  expect(listed[249].displayOrder).toBe(249);
});
