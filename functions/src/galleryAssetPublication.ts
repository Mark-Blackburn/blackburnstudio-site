import type { TableClient } from "@azure/data-tables";
import { GALLERY_ID } from "./galleryAccess";
import {
  MAX_GALLERY_ASSETS,
  ASSET_ID,
  validAsset,
  type PrivateGalleryAsset,
} from "./galleryAssets";

export const ALLOCATION_ROW = "__allocation_v1";
export type GalleryAllocation = {
  partitionKey: string;
  rowKey: string;
  galleryId: string;
  schemaVersion: number;
  assetCount: number;
  nextDisplayOrder: number;
  etag: string;
};
export function validAllocation(
  row: unknown,
  id: string,
): row is GalleryAllocation {
  const r = row as GalleryAllocation | null;
  return (
    !!r &&
    r.partitionKey === `gallery-assets-${id}` &&
    r.rowKey === ALLOCATION_ROW &&
    r.galleryId === id &&
    r.schemaVersion === 1 &&
    Number.isSafeInteger(r.assetCount) &&
    r.assetCount >= 0 &&
    r.assetCount <= MAX_GALLERY_ASSETS &&
    Number.isSafeInteger(r.nextDisplayOrder) &&
    r.nextDisplayOrder >= r.assetCount
  );
}

// Bootstrap existing CLI-created galleries once; create-if-absent makes concurrent
// bootstrap attempts converge on the winner's state. Every writer must use this
// protocol after rollout; the old CLI must be stopped before deployment.
export async function readGalleryAllocation(
  client: TableClient,
  id: string,
): Promise<GalleryAllocation> {
  if (!GALLERY_ID.test(id)) throw new Error("Invalid gallery ID");
  const partitionKey = `gallery-assets-${id}`;
  const read = async () => {
    const row = await client.getEntity(partitionKey, ALLOCATION_ROW);
    if (!validAllocation(row, id) || !row.etag || row.etag === "*")
      throw new Error("Invalid allocation");
    return row;
  };
  try {
    return await read();
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode !== 404) throw e;
  }
  let assetCount = 0,
    nextDisplayOrder = 0;
  for await (const row of client.listEntities({
    queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
  })) {
    if (row.rowKey === ALLOCATION_ROW) {
      if (!validAllocation(row, id)) throw new Error("Invalid allocation");
      continue;
    }
    if (
      !validAsset(row, id) ||
      row.rowKey !== row.id ||
      ++assetCount > MAX_GALLERY_ASSETS
    )
      throw new Error("Invalid gallery assets");
    nextDisplayOrder = Math.max(
      nextDisplayOrder,
      row.displayOrder + 1,
      assetCount,
    );
  }
  if (!Number.isSafeInteger(nextDisplayOrder))
    throw new Error("Invalid display order");
  try {
    await client.createEntity({
      partitionKey,
      rowKey: ALLOCATION_ROW,
      galleryId: id,
      schemaVersion: 1,
      assetCount,
      nextDisplayOrder,
    });
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode !== 409) throw e;
  }
  return read();
}

export async function publishGalleryAsset(
  client: TableClient,
  allocation: GalleryAllocation,
  asset: PrivateGalleryAsset,
) {
  if (
    !validAllocation(allocation, asset.galleryId) ||
    !allocation.etag ||
    allocation.etag === "*" ||
    allocation.assetCount >= MAX_GALLERY_ASSETS ||
    asset.displayOrder !== allocation.nextDisplayOrder ||
    !validAsset(asset, asset.galleryId) ||
    !Number.isSafeInteger(allocation.nextDisplayOrder + 1)
  )
    throw new Error("Invalid asset allocation");
  // Both actions commit or neither does. A delayed writer carries the old exact
  // ETag, so storage rejects it even if it resumes after another writer finishes.
  await client.submitTransaction([
    [
      "update",
      {
        partitionKey: allocation.partitionKey,
        rowKey: ALLOCATION_ROW,
        galleryId: asset.galleryId,
        schemaVersion: 1,
        assetCount: allocation.assetCount + 1,
        nextDisplayOrder: allocation.nextDisplayOrder + 1,
      },
      "Replace",
      { etag: allocation.etag },
    ],
    [
      "create",
      { partitionKey: allocation.partitionKey, rowKey: asset.id, ...asset },
    ],
  ]);
}

// All asset writers advance this row. Deletion therefore conflicts atomically
// with concurrent publication/deletion, and does not reuse display orders.
export async function removeGalleryAsset(
  client: TableClient,
  allocation: GalleryAllocation,
  assetId: string,
  exists: boolean,
) {
  if (
    !validAllocation(allocation, allocation.galleryId) ||
    !ASSET_ID.test(assetId) ||
    !allocation.etag ||
    allocation.etag === "*" ||
    (exists && allocation.assetCount < 1)
  )
    throw new Error("Invalid asset allocation");
  const actions: Parameters<TableClient["submitTransaction"]>[0] = [
    [
      "update",
      {
        partitionKey: allocation.partitionKey,
        rowKey: ALLOCATION_ROW,
        galleryId: allocation.galleryId,
        schemaVersion: 1,
        assetCount: allocation.assetCount - (exists ? 1 : 0),
        nextDisplayOrder: allocation.nextDisplayOrder,
      },
      "Replace",
      { etag: allocation.etag },
    ],
  ];
  if (exists)
    actions.push([
      "delete",
      { partitionKey: allocation.partitionKey, rowKey: assetId },
    ]);
  // Even an already absent asset advances the ETag before Blob cleanup. This
  // fences a delayed publisher carrying the previous allocation snapshot.
  await client.submitTransaction(actions);
}
