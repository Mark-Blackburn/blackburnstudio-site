import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const GALLERY_ID = /^g_[A-Za-z0-9_-]{16,64}$/;
export const GALLERY_TOKEN = /^[A-Za-z0-9_-]{43}$/;
export const SESSION_SECONDS = 12 * 60 * 60;

// Backend-only record. Never serialize this object into an HTTP response.
export interface GalleryAccessRecord {
  id: string;
  title: string;
  clientDisplayName: string;
  message: string;
  status: "published" | "draft" | "unpublished" | "revoked";
  expiresAt: number;
  accessTokenHash: string;
  accessTokenVersion: number;
  sessionVersion: number;
}

export interface GalleryAccessStore {
  readGallery(id: string): Promise<GalleryAccessRecord | null>;
  consumeExchange(now: number): Promise<boolean>;
}

function mac(secret: string, purpose: string, value: string): string {
  return createHmac("sha256", Buffer.from(secret, "hex"))
    .update(`${purpose}:${value}`).digest("hex");
}

function equalHash(left: string, right: string): boolean {
  return /^[a-f0-9]{64}$/.test(left) && /^[a-f0-9]{64}$/.test(right) &&
    timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function validateGalleryKey(secret: string): void {
  if (!/^[a-fA-F0-9]{64}$/.test(secret)) throw new Error("Invalid gallery key");
}

export function hashGalleryToken(secret: string, id: string, token: string): string {
  validateGalleryKey(secret);
  if (!GALLERY_ID.test(id) || !GALLERY_TOKEN.test(token))
    throw new Error("Invalid gallery credential");
  return mac(secret, "gallery-access-v1", `${id}:${token}`);
}

export function validRecord(value: unknown, id: string): value is GalleryAccessRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as GalleryAccessRecord;
  return v.id === id && GALLERY_ID.test(v.id) &&
    typeof v.title === "string" && v.title.length > 0 && v.title.length <= 200 &&
    typeof v.clientDisplayName === "string" && v.clientDisplayName.length <= 200 &&
    typeof v.message === "string" && v.message.length <= 2000 &&
    ["draft", "published", "unpublished", "revoked"].includes(v.status) &&
    Number.isSafeInteger(v.expiresAt) && v.expiresAt > 0 &&
    typeof v.accessTokenHash === "string" && /^[a-f0-9]{64}$/.test(v.accessTokenHash) &&
    Number.isSafeInteger(v.accessTokenVersion) && v.accessTokenVersion > 0 &&
    Number.isSafeInteger(v.sessionVersion) && v.sessionVersion > 0;
}

export function galleryIsAvailable(record: GalleryAccessRecord, now: number): boolean {
  return validRecord(record, record.id) && record.status === "published" && record.expiresAt > now;
}

export function tokenMatches(record: GalleryAccessRecord, token: string, secret: string): boolean {
  return equalHash(record.accessTokenHash, hashGalleryToken(secret, record.id, token));
}

type Session = { id: string; tokenVersion: number; sessionVersion: number; expiresAt: number; nonce: string; binding: string };

export function createGallerySession(record: GalleryAccessRecord, secret: string, now: number) {
  validateGalleryKey(secret);
  const expiresAt = Math.min(record.expiresAt, now + SESSION_SECONDS * 1000);
  const session: Session = {
    id: record.id, tokenVersion: record.accessTokenVersion,
    sessionVersion: record.sessionVersion, expiresAt,
    nonce: randomBytes(16).toString("base64url"),
    binding: mac(secret, "gallery-session-binding-v1", record.accessTokenHash),
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { value: `${payload}.${mac(secret, "gallery-session-v1", payload)}`, expiresAt };
}

export function readGallerySession(value: string, id: string, secret: string, now: number): Session | null {
  if (value.length > 1024) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) ||
      !equalHash(parts[1], mac(secret, "gallery-session-v1", parts[0]))) return null;
  try {
    const s: Session = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return s.id === id && GALLERY_ID.test(s.id) &&
      Number.isSafeInteger(s.tokenVersion) && s.tokenVersion > 0 &&
      Number.isSafeInteger(s.sessionVersion) && s.sessionVersion > 0 &&
      Number.isSafeInteger(s.expiresAt) && s.expiresAt > now &&
      s.expiresAt <= now + SESSION_SECONDS * 1000 &&
      typeof s.binding === "string" && /^[a-f0-9]{64}$/.test(s.binding) &&
      typeof s.nonce === "string" && /^[A-Za-z0-9_-]{22}$/.test(s.nonce) ? s : null;
  } catch { return null; }
}

export function sessionMatches(record: GalleryAccessRecord, session: Session, now: number, secret: string): boolean {
  return session.expiresAt > now && galleryIsAvailable(record, now) && record.id === session.id &&
    record.accessTokenVersion === session.tokenVersion &&
    record.sessionVersion === session.sessionVersion &&
    equalHash(session.binding, mac(secret, "gallery-session-binding-v1", record.accessTokenHash));
}

export function galleryCookieName(id: string): string {
  return `__Host-bbs-gallery-${id}`;
}
