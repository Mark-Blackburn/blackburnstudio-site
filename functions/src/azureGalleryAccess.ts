import { TableClient } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";
import { hasStatus } from "./contactRateLimiter";
import { storageErrorCode } from "./azureContactRateLimiter";
import { validRecord, validateGalleryKey, type GalleryAccessRecord, type GalleryAccessStore } from "./galleryAccess";

export const GALLERY_PARTITION = "gallery-access-v1";
const EXCHANGE_PARTITION = "gallery-exchange-v1";
const WINDOW_MS = 5 * 60 * 1000;
const MAX_EXCHANGES = 30;

function missing(error: unknown) {
  return hasStatus(error, 404) && storageErrorCode(error) === "ResourceNotFound";
}

export function createAzureGalleryAccessStore(client: TableClient): GalleryAccessStore {
  return {
    async readGallery(id) {
      try {
        const entity = await client.getEntity(GALLERY_PARTITION, id);
        if (!validRecord(entity, id)) throw new Error("Invalid gallery record");
        return entity as unknown as GalleryAccessRecord;
      } catch (error) {
        if (missing(error)) return null;
        throw error;
      }
    },
    async consumeExchange(now) {
      if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid gallery clock");
      // A single fixed row bounds storage growth even when callers change IDs.
      // This global ceiling intentionally also counts unsuccessful exchanges.
      for (let attempt = 0; attempt < 8; attempt++) {
        let row;
        try { row = await client.getEntity<{ attempts: string }>(EXCHANGE_PARTITION, "global"); }
        catch (error) { if (!missing(error)) throw error; }
        let times: number[] = [];
        if (row) {
          const parsed: unknown = JSON.parse(row.attempts);
          if (!row.etag || row.etag === "*" || !Array.isArray(parsed) || parsed.length > MAX_EXCHANGES ||
              !parsed.every(t => Number.isSafeInteger(t) && t >= 0)) throw new Error("Invalid gallery exchange record");
          times = parsed.filter(t => now - t < WINDOW_MS);
        }
        if (times.length >= MAX_EXCHANGES) return false;
        const entity = { partitionKey: EXCHANGE_PARTITION, rowKey: "global", attempts: JSON.stringify([...times, now]) };
        try {
          if (row) await client.updateEntity(entity, "Replace", { etag: row.etag });
          else await client.createEntity(entity);
          return true;
        } catch (error) {
          if ((!row && hasStatus(error, 409)) || (row && (hasStatus(error, 412) || missing(error)))) continue;
          throw error;
        }
      }
      throw new Error("Gallery exchange contention");
    },
  };
}

export function createConfiguredGalleryAccess(environment: NodeJS.ProcessEnv = process.env) {
  const secret = environment.GALLERY_ACCESS_HMAC_KEY ?? "";
  validateGalleryKey(secret);
  const endpoint = new URL(environment.GALLERY_TABLE_ENDPOINT ?? "");
  const tableName = environment.GALLERY_TABLE_NAME ?? "";
  const origin = new URL(environment.GALLERY_PUBLIC_ORIGIN ?? "");
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
      endpoint.pathname !== "/" || endpoint.search || endpoint.hash ||
      !/^[A-Za-z][A-Za-z0-9]{2,62}$/.test(tableName) ||
      origin.protocol !== "https:" || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash)
    throw new Error("Invalid gallery configuration");
  return {
    secret, origin: origin.origin,
    store: createAzureGalleryAccessStore(new TableClient(endpoint.origin, tableName,
      new DefaultAzureCredential(), { retryOptions: { maxRetries: 2 } })),
  };
}
