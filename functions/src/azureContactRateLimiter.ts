import { TableClient } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";
import type { ContactRateLimiter } from "./contact";
import { createInMemoryContactRateLimiter } from "./contact";
import {
  createDurableContactRateLimiter,
  hasStatus,
  type ContactRateLimitStore,
} from "./contactRateLimiter";

const PARTITION_KEY = "contact-email-v1";

function storageErrorCode(error: unknown): unknown {
  if (typeof error !== "object" || error === null) return undefined;
  if (
    "details" in error &&
    typeof error.details === "object" &&
    error.details !== null
  ) {
    const details = error.details;
    // Table SDK errors expose the service code through deserialized details.
    if ("errorCode" in details && typeof details.errorCode === "string")
      return details.errorCode;
    if (
      "odataError" in details &&
      typeof details.odataError === "object" &&
      details.odataError !== null &&
      "code" in details.odataError
    )
      return details.odataError.code;
  }
  return "code" in error ? error.code : undefined;
}

export function createAzureContactRateLimitStore(
  client: TableClient,
): ContactRateLimitStore {
  return {
    async read(key) {
      try {
        const entity = await client.getEntity<{ timestamps: string }>(
          PARTITION_KEY,
          key,
        );
        return { timestamps: entity.timestamps, etag: entity.etag ?? "" };
      } catch (error) {
        // A missing table/configuration is an outage, not an empty record.
        if (
          hasStatus(error, 404) &&
          storageErrorCode(error) === "ResourceNotFound"
        )
          return null;
        throw error;
      }
    },
    async create(key, timestamps) {
      await client.createEntity({
        partitionKey: PARTITION_KEY,
        rowKey: key,
        timestamps,
      });
    },
    async replace(key, timestamps, etag) {
      await client.updateEntity(
        { partitionKey: PARTITION_KEY, rowKey: key, timestamps },
        "Replace",
        { etag },
      );
    },
  };
}

export function createConfiguredContactRateLimiter(
  environment: NodeJS.ProcessEnv = process.env,
): ContactRateLimiter {
  let limiter: ContactRateLimiter | undefined;
  return {
    async consume(key) {
      if (!limiter) {
        const mode = environment.CONTACT_RATE_LIMIT_MODE;
        if (
          mode === "memory" &&
          environment.AZURE_FUNCTIONS_ENVIRONMENT === "Development" &&
          !environment.WEBSITE_INSTANCE_ID &&
          !environment.WEBSITE_HOSTNAME
        ) {
          limiter = createInMemoryContactRateLimiter();
        } else {
          if (mode !== "table")
            throw new Error("Durable contact rate limiter is not configured");
          const endpoint = new URL(
            environment.CONTACT_RATE_LIMIT_TABLE_ENDPOINT ?? "",
          );
          const tableName = environment.CONTACT_RATE_LIMIT_TABLE_NAME ?? "";
          const secret = environment.CONTACT_RATE_LIMIT_HMAC_KEY ?? "";
          if (
            endpoint.protocol !== "https:" ||
            endpoint.username ||
            endpoint.password ||
            endpoint.search ||
            endpoint.hash ||
            endpoint.pathname !== "/" ||
            !/^[A-Za-z][A-Za-z0-9]{2,62}$/.test(tableName) ||
            !/^[a-fA-F0-9]{64}$/.test(secret)
          ) {
            throw new Error(
              "Invalid contact rate limiter storage configuration",
            );
          }
          const client = new TableClient(
            endpoint.origin,
            tableName,
            new DefaultAzureCredential(),
            {
              retryOptions: { maxRetries: 2 },
            },
          );
          limiter = createDurableContactRateLimiter(
            createAzureContactRateLimitStore(client),
            secret,
          );
        }
      }
      return limiter.consume(key);
    },
  };
}
