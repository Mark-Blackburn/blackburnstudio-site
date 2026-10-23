import { TableClient } from "@azure/data-tables";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { randomBytes } from "node:crypto";
import {
  createConfiguredGalleryAccess,
  GALLERY_PARTITION,
} from "./azureGalleryAccess";
import { createGalleryAssetStore } from "./azureGalleryDelivery";
import { adminGallery, type GalleryAdminStore } from "./galleryAdmin";
import { galleryIsAvailable, validRecord } from "./galleryAccess";
import {
  MAX_FULL_BYTES,
  MAX_WEB_BYTES,
  MAX_GALLERY_ASSETS,
  assetBlobName,
  validAsset,
} from "./galleryAssets";

export function jpegDimensions(bytes: Buffer, max: number) {
  if (
    bytes.length < 4 ||
    bytes.length > max ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes[2] !== 255
  )
    throw new Error("Invalid JPEG");
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 255) break;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217 || offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if ([192, 193, 194].includes(marker) && length >= 8) {
      const height = bytes.readUInt16BE(offset + 3),
        width = bytes.readUInt16BE(offset + 5);
      if (!width || !height || width > 30000 || height > 30000) break;
      return { width, height };
    }
    offset += length;
  }
  throw new Error("Unsupported JPEG dimensions");
}

export function createConfiguredGalleryAdmin(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const access = createConfiguredGalleryAccess(environment);
  const credential = new DefaultAzureCredential();
  const endpoint = new URL(environment.GALLERY_BLOB_ENDPOINT ?? "");
  const name = environment.GALLERY_BLOB_CONTAINER ?? "";
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash ||
    !/^[a-z0-9](?:[a-z0-9]|-(?!-)){1,61}[a-z0-9]$/.test(name)
  )
    throw new Error("Invalid Blob configuration");
  const table = new TableClient(
    environment.GALLERY_TABLE_ENDPOINT!,
    environment.GALLERY_TABLE_NAME!,
    credential,
  );
  const container = new BlobServiceClient(
    endpoint.origin,
    credential,
  ).getContainerClient(name);
  const assets = createGalleryAssetStore(table);
  const read = async (id: string) => {
    const row = await table.getEntity(GALLERY_PARTITION, id);
    if (!validRecord(row, id) || !row.etag || row.etag === "*")
      throw new Error("Invalid gallery");
    return row;
  };
  const store: GalleryAdminStore = {
    async list(cursor) {
      const iterator = table
        .listEntities({
          queryOptions: { filter: `PartitionKey eq '${GALLERY_PARTITION}'` },
        })
        .byPage({ maxPageSize: 50, continuationToken: cursor });
      const { value } = await iterator.next();
      const galleries = [];
      for (const row of value ?? []) {
        if (!validRecord(row, row.rowKey!)) throw new Error("Invalid gallery");
        galleries.push(adminGallery(row));
      }
      return { galleries, cursor: value?.continuationToken };
    },
    async create(record) {
      await table.createEntity({
        partitionKey: GALLERY_PARTITION,
        rowKey: record.id,
        ...record,
      });
    },
    async change(id, action, tokenHash) {
      const row = await read(id);
      if (action === "replace" && !galleryIsAvailable(row, Date.now()))
        throw new Error("Gallery unavailable");
      if (
        !Number.isSafeInteger(row.sessionVersion + 1) ||
        !Number.isSafeInteger(row.accessTokenVersion + 1)
      )
        throw new Error("Invalid version");
      await table.updateEntity(
        {
          partitionKey: GALLERY_PARTITION,
          rowKey: id,
          status: action === "revoke" ? "revoked" : row.status,
          sessionVersion: row.sessionVersion + 1,
          accessTokenVersion: row.accessTokenVersion + 1,
          ...(action === "replace" ? { accessTokenHash: tokenHash } : {}),
        },
        "Merge",
        { etag: row.etag },
      );
    },
    async upload(id, web, full, altText) {
      const dimensions = jpegDimensions(web, MAX_WEB_BYTES);
      jpegDimensions(full, MAX_FULL_BYTES);
      if (dimensions.width > 2048 || dimensions.height > 2048)
        throw new Error("Web export too large");
      // A container lease serializes admin uploads across tabs/instances, keeping
      // the 250-photo bound and display order correct. It grants no browser access.
      const lease = container
        .getBlobClient("admin-upload-lock")
        .getBlobLeaseClient();
      // Lock creation is idempotent. Never overwrite a lock held by another request.
      await container
        .getBlockBlobClient("admin-upload-lock")
        .uploadData(Buffer.alloc(0), { conditions: { ifNoneMatch: "*" } })
        .catch((e: { statusCode?: number }) => {
          if (e.statusCode !== 409 && e.statusCode !== 412) throw e;
        });
      const acquired = await lease.acquireLease(60);
      const renew = setInterval(() => {
        void lease.renewLease().catch(() => undefined);
      }, 20000);
      const created: { name: string; etag: string }[] = [];
      let registrationAttempted = false;
      try {
        if ((await container.getProperties()).blobPublicAccess)
          throw new Error("Private container required");
        const row = await read(id);
        if (!galleryIsAvailable(row, Date.now()))
          throw new Error("Gallery unavailable");
        const existing = await assets.listAssets(id);
        if (existing.length >= MAX_GALLERY_ASSETS)
          throw new Error("Gallery full");
        const asset = {
          galleryId: id,
          id: `a_${randomBytes(16).toString("base64url")}`,
          altText,
          ...dimensions,
          displayOrder:
            Math.max(-1, ...existing.map((a) => a.displayOrder)) + 1,
          webByteSize: web.length,
          fullByteSize: full.length,
        };
        if (!validAsset(asset, id)) throw new Error("Invalid asset");
        for (const [isFull, bytes] of [
          [false, web],
          [true, full],
        ] as const) {
          const blobName = assetBlobName(asset, isFull);
          const result = await container
            .getBlockBlobClient(blobName)
            .uploadData(bytes, {
              conditions: { ifNoneMatch: "*" },
              blobHTTPHeaders: {
                blobContentType: "image/jpeg",
                blobCacheControl: "no-store",
              },
            });
          if (result.etag) created.push({ name: blobName, etag: result.etag });
        }
        const fresh = await read(id);
        if (!galleryIsAvailable(fresh, Date.now()) || fresh.etag !== row.etag)
          throw new Error("Gallery changed");
        // Require our lease still to be valid before metadata publication.
        await lease.renewLease();
        registrationAttempted = true;
        await table.createEntity({
          partitionKey: `gallery-assets-${id}`,
          rowKey: asset.id,
          ...asset,
        });
      } finally {
        if (!registrationAttempted)
          for (const b of created)
            await container
              .getBlobClient(b.name)
              .deleteIfExists({ conditions: { ifMatch: b.etag } })
              .catch(() => undefined);
        clearInterval(renew);
        if (acquired.leaseId) await lease.releaseLease().catch(() => undefined);
      }
    },
  };
  return { store, origin: access.origin, secret: access.secret };
}
