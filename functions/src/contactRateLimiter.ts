import { createHmac } from "node:crypto";
import type { ContactRateLimiter } from "./contact";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS = 5;
const MAX_ATTEMPTS = 8;

export interface RateLimitRecord {
  timestamps: string;
  etag: string;
}

// Writes must be conditional: create-if-absent or replace-if-ETag-matches.
export interface ContactRateLimitStore {
  read(key: string): Promise<RateLimitRecord | null>;
  create(key: string, timestamps: string): Promise<void>;
  replace(key: string, timestamps: string, etag: string): Promise<void>;
}

export function hasStatus(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    error.statusCode === status
  );
}

export function createDurableContactRateLimiter(
  store: ContactRateLimitStore,
  secret: string,
  now: () => number = Date.now,
): ContactRateLimiter {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("Contact rate limiter key must contain at least 32 bytes");
  }

  return {
    async consume(email) {
      const key = createHmac("sha256", secret)
        .update(`contact-email-v1:${email.trim().toLowerCase()}`)
        .digest("hex");

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const record = await store.read(key);
        const currentTime = now();
        if (!Number.isSafeInteger(currentTime) || currentTime < 0) {
          throw new Error("Invalid limiter clock");
        }
        let timestamps: number[] = [];
        if (record) {
          const value: unknown = JSON.parse(record.timestamps);
          if (
            !record.etag ||
            record.etag === "*" ||
            !Array.isArray(value) ||
            value.length > MAX_SUBMISSIONS ||
            !value.every((time) => Number.isSafeInteger(time) && time >= 0)
          ) {
            throw new Error("Invalid contact rate limiter record");
          }
          // Retain future timestamps conservatively if instance clocks differ.
          timestamps = value.filter((time) => currentTime - time < WINDOW_MS);
        }
        if (timestamps.length >= MAX_SUBMISSIONS) return false;
        const updated = JSON.stringify([...timestamps, currentTime]);
        try {
          if (record) await store.replace(key, updated, record.etag);
          else await store.create(key, updated);
          return true;
        } catch (error) {
          // Re-read after a competing create/update. Never blindly upsert.
          if (
            (!record && hasStatus(error, 409)) ||
            (record && hasStatus(error, 412))
          )
            continue;
          throw error;
        }
      }
      // Contention and storage outages must not silently disable protection.
      throw new Error("Contact rate limiter contention limit exceeded");
    },
  };
}
