import type { InvocationContext, Timer } from "@azure/functions";
import type { TableClient, TableEntityResult } from "@azure/data-tables";
import {
  createContactRateLimitTableClient,
  storageErrorCode,
} from "./azureContactRateLimiter";
import { hasStatus } from "./contactRateLimiter";

const PARTITION_KEY = "contact-email-v1";
export const CONTACT_RETENTION_AGE_MS = 24 * 60 * 60 * 1000;
export const CONTACT_RETENTION_ROW_LIMIT = 500;
export const CONTACT_RETENTION_SCHEDULE = "0 15 * * * *";
type RetentionClient = Pick<TableClient, "listEntities" | "deleteEntity">;
type Mode = "dry-run" | "delete";

function safeToDelete(
  entity: TableEntityResult<Record<string, unknown>>,
  now: number,
): boolean {
  if (
    entity.partitionKey !== PARTITION_KEY ||
    typeof entity.rowKey !== "string" ||
    !/^[a-f0-9]{64}$/.test(entity.rowKey) ||
    typeof entity.etag !== "string" ||
    !entity.etag ||
    entity.etag.trim() !== entity.etag ||
    entity.etag === "*" ||
    typeof entity.timestamp !== "string" ||
    !Number.isFinite(Date.parse(entity.timestamp)) ||
    Date.parse(entity.timestamp) >= now - CONTACT_RETENTION_AGE_MS ||
    typeof entity.timestamps !== "string"
  )
    return false;
  try {
    const timestamps: unknown = JSON.parse(entity.timestamps);
    return (
      Array.isArray(timestamps) &&
      timestamps.length <= 5 &&
      timestamps.every(
        (time) =>
          Number.isSafeInteger(time) && time >= 0 && time <= now - 3_600_000,
      )
    );
  } catch {
    return false;
  }
}

export async function retainContactRateLimits(
  client: RetentionClient,
  mode: Mode,
  now = Date.now(),
  signal?: AbortSignal,
) {
  if (
    (mode !== "dry-run" && mode !== "delete") ||
    !Number.isSafeInteger(now) ||
    now < CONTACT_RETENTION_AGE_MS
  )
    throw new Error("Invalid contact retention configuration");
  const cutoff = new Date(now - CONTACT_RETENTION_AGE_MS).toISOString();
  const result = {
    scanned: 0,
    eligible: 0,
    deleted: 0,
    conflicts: 0,
    skipped: 0,
    limitReached: false,
  };
  const entities = client.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${PARTITION_KEY}' and Timestamp lt datetime'${cutoff}'`,
      select: ["PartitionKey", "RowKey", "Timestamp", "timestamps"],
    },
    abortSignal: signal,
  });
  for await (const entity of entities) {
    result.scanned++;
    if (!safeToDelete(entity, now)) result.skipped++;
    else {
      result.eligible++;
      if (mode === "delete") {
        try {
          await client.deleteEntity(PARTITION_KEY, entity.rowKey!, {
            etag: entity.etag,
            abortSignal: signal,
          });
          result.deleted++;
        } catch (error) {
          if (
            hasStatus(error, 412) ||
            (hasStatus(error, 404) &&
              storageErrorCode(error) === "ResourceNotFound")
          )
            result.conflicts++;
          else throw error;
        }
      }
    }
    if (result.scanned >= CONTACT_RETENTION_ROW_LIMIT) {
      result.limitReached = true;
      break;
    }
  }
  return result;
}

export function createContactRateLimitRetentionHandler(
  environment: NodeJS.ProcessEnv = process.env,
  createClient: (
    environment: NodeJS.ProcessEnv,
  ) => RetentionClient = createContactRateLimitTableClient,
) {
  return async function contactRateLimitRetention(
    _timer: Timer,
    context: InvocationContext,
  ): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const mode = environment.CONTACT_RATE_LIMIT_RETENTION_MODE;
      if (mode !== "dry-run" && mode !== "delete")
        throw new Error("Invalid retention mode");
      const result = await retainContactRateLimits(
        createClient(environment),
        mode,
        Date.now(),
        controller.signal,
      );
      context.log("[contact-retention] Completed", { mode, ...result });
      if (result.skipped || result.limitReached)
        context.warn("[contact-retention] Maintenance review required");
    } catch {
      // Do not let SDK exceptions expose identifiers, response bodies or tokens.
      context.error("[contact-retention] Maintenance failed");
      throw new Error("Contact rate-limit retention failed");
    } finally {
      clearTimeout(timeout);
    }
  };
}
