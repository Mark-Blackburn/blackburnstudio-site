import { TableClient } from "@azure/data-tables";
import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { hasStatus } from "./contactRateLimiter";
import { storageErrorCode } from "./azureContactRateLimiter";
import { createConfiguredGalleryAccess } from "./azureGalleryAccess";
import { GALLERY_ID } from "./galleryAccess";
import { ASSET_ID, MAX_FULL_BYTES, MAX_GALLERY_ASSETS, validAsset, type PrivateGalleryAsset } from "./galleryAssets";

export interface GalleryAssetStore {
  listAssets(galleryId: string): Promise<PrivateGalleryAsset[]>;
  readAsset(galleryId: string, assetId: string): Promise<PrivateGalleryAsset | null>;
}
export interface GalleryBlobStore {
  read(name: string, expectedBytes: number): Promise<Buffer>;
}

const missing = (e: unknown) => hasStatus(e, 404) && storageErrorCode(e) === "ResourceNotFound";

export function createGalleryAssetStore(client: TableClient): GalleryAssetStore {
  return {
    async listAssets(galleryId) {
      if (!GALLERY_ID.test(galleryId)) throw new Error("Invalid gallery ID");
      const assets: PrivateGalleryAsset[] = [];
      for await (const row of client.listEntities({ queryOptions: { filter: `PartitionKey eq 'gallery-assets-${galleryId}'` } })) {
        if (!validAsset(row, galleryId) || row.rowKey !== row.id || assets.length >= MAX_GALLERY_ASSETS)
          throw new Error("Invalid gallery asset collection");
        assets.push(row);
      }
      return assets.sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
    },
    async readAsset(galleryId, assetId) {
      if (!GALLERY_ID.test(galleryId) || !ASSET_ID.test(assetId)) return null;
      try {
        const row = await client.getEntity(`gallery-assets-${galleryId}`, assetId);
        if (!validAsset(row, galleryId) || row.id !== assetId) throw new Error("Invalid gallery asset");
        return row;
      } catch (e) { if (missing(e)) return null; throw e; }
    },
  };
}

export function createGalleryBlobStore(container: ContainerClient): GalleryBlobStore {
  return {
    async read(name, expectedBytes) {
      if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 3 || expectedBytes > MAX_FULL_BYTES)
        throw new Error("Invalid gallery image size");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      let stream: NodeJS.ReadableStream | undefined;
      let completed = false;
      try {
        // Refuse accidental public-container deployment rather than masking it.
        const properties = await container.getProperties({ abortSignal: controller.signal });
        if (properties.blobPublicAccess) throw new Error("Gallery container must be private");
        const result = await container.getBlobClient(name).download(0, undefined,
          { abortSignal: controller.signal, maxRetryRequests: 0 });
        stream = result.readableStreamBody;
        if (result.contentLength !== expectedBytes || !stream) throw new Error("Invalid gallery image size");
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of stream) {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += bytes.length;
          if (size > expectedBytes) throw new Error("Gallery image exceeds declared size");
          chunks.push(bytes);
        }
        const body = Buffer.concat(chunks);
        if (size !== expectedBytes || body[0] !== 0xff || body[1] !== 0xd8 || body[2] !== 0xff)
          throw new Error("Invalid gallery JPEG");
        completed = true;
        return body;
      } finally {
        if (!completed) controller.abort();
        clearTimeout(timeout);
      }
    },
  };
}

export function createConfiguredGalleryDelivery(environment: NodeJS.ProcessEnv = process.env) {
  const access = createConfiguredGalleryAccess(environment);
  const endpoint = new URL(environment.GALLERY_BLOB_ENDPOINT ?? "");
  const container = environment.GALLERY_BLOB_CONTAINER ?? "";
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.pathname !== "/" ||
      endpoint.search || endpoint.hash || !/^[a-z0-9](?:[a-z0-9]|-(?!-)){1,61}[a-z0-9]$/.test(container))
    throw new Error("Invalid gallery Blob configuration");
  const credential = new DefaultAzureCredential();
  const table = new TableClient(environment.GALLERY_TABLE_ENDPOINT!, environment.GALLERY_TABLE_NAME!, credential,
    { retryOptions: { maxRetries: 2 } });
  const blobs = new BlobServiceClient(endpoint.origin, credential, { retryOptions: { maxTries: 2 } });
  return { ...access, assets: createGalleryAssetStore(table), blobs: createGalleryBlobStore(blobs.getContainerClient(container)) };
}
