import { GalleryUploadValidationError } from "../src/galleryUploadValidation";
import { Readable } from "node:stream";
import { beforeEach, it, expect, vi } from "vitest";
const fake = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  transaction: vi.fn(),
  props: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  acquire: vi.fn(),
  renew: vi.fn(),
  release: vi.fn(),
  blob: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@azure/data-tables", () => ({
  TableClient: class {
    getEntity = fake.get;
    updateEntity = fake.update;
    createEntity = fake.create;
    listEntities = fake.list;
    submitTransaction = fake.transaction;
  },
}));
vi.mock("@azure/identity", () => ({ DefaultAzureCredential: class {} }));
vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: class {
    getContainerClient() {
      return {
        getProperties: fake.props,
        getBlockBlobClient: () => ({ uploadData: fake.upload }),
        getBlobClient: (name: string) => {
          fake.blob(name);
          return {
            deleteIfExists: fake.remove,
            download: fake.download,
            getBlobLeaseClient: () => ({
              acquireLease: fake.acquire,
              renewLease: fake.renew,
              releaseLease: fake.release,
            }),
          };
        },
      };
    }
  },
}));
import { ALLOCATION_ROW } from "../src/galleryAssetPublication";
import { createConfiguredGalleryAdmin } from "../src/azureGalleryAdmin";
const id = "g_privateGallery123456";
const row = {
  id,
  rowKey: id,
  title: "Gallery",
  clientDisplayName: "Client",
  message: "",
  status: "published",
  expiresAt: Date.now() + 86400000,
  accessTokenHash: "a".repeat(64),
  accessTokenVersion: 1,
  sessionVersion: 1,
  etag: '"version1"',
};
const allocation = {
  partitionKey: `gallery-assets-${id}`,
  rowKey: ALLOCATION_ROW,
  galleryId: id,
  schemaVersion: 1,
  assetCount: 0,
  nextDisplayOrder: 0,
  etag: '"allocation1"',
};
const env = {
  GALLERY_TABLE_ENDPOINT: "https://example.table.core.windows.net",
  GALLERY_TABLE_NAME: "ClientGalleries",
  GALLERY_PUBLIC_ORIGIN: "https://www.theblackburn.studio",
  GALLERY_ACCESS_HMAC_KEY: "a".repeat(64),
  GALLERY_BLOB_ENDPOINT: "https://example.blob.core.windows.net",
  GALLERY_BLOB_CONTAINER: "client-galleries",
};
// Minimal SOF header accepted by the existing dimension boundary. No decoding.
const jpeg = Buffer.from([255, 216, 255, 192, 0, 8, 8, 0, 100, 0, 150, 1]);
const photo = {
  galleryId: id,
  id: "a_privateAsset12345678",
  rowKey: "a_privateAsset12345678",
  partitionKey: `gallery-assets-${id}`,
  altText: "Mistaken upload",
  width: 150,
  height: 100,
  displayOrder: 2,
  webByteSize: jpeg.length,
  fullByteSize: jpeg.length,
};
beforeEach(() => {
  vi.resetAllMocks();
  fake.get.mockImplementation(async (_partition, key) =>
    key === ALLOCATION_ROW ? allocation : row,
  );
  fake.props.mockResolvedValue({});
  fake.upload.mockResolvedValue({ etag: '"blob"' });
  fake.acquire.mockResolvedValue({ leaseId: "lock" });
  fake.release.mockResolvedValue({});
  fake.remove.mockResolvedValue({});
  fake.renew.mockResolvedValue({});
  fake.list.mockReturnValue({
    async *[Symbol.asyncIterator]() {},
    byPage() {
      return {
        async next() {
          return { value: Object.assign([row], { continuationToken: "next" }) };
        },
      };
    },
  });
});
it("removes metadata and decrements allocation before deleting only this photo's canonical JPEGs", async () => {
  fake.get.mockImplementation(async (_partition, key) =>
    key === ALLOCATION_ROW
      ? { ...allocation, assetCount: 1, nextDisplayOrder: 3 }
      : key === photo.id
        ? photo
        : row,
  );
  fake.transaction.mockImplementation(async () => {
    expect(fake.remove).not.toHaveBeenCalled();
  });
  const { store } = createConfiguredGalleryAdmin(env);
  expect(await store.remove(id, photo.id)).toEqual({ cleanupComplete: true });
  expect(fake.transaction).toHaveBeenCalledWith([
    [
      "update",
      expect.objectContaining({ assetCount: 0, nextDisplayOrder: 3 }),
      "Replace",
      { etag: allocation.etag },
    ],
    ["delete", { partitionKey: `gallery-assets-${id}`, rowKey: photo.id }],
  ]);
  expect(fake.blob.mock.calls.map((call) => call[0])).toEqual([
    `${id}/${photo.id}/web.jpg`,
    `${id}/${photo.id}/full.jpg`,
  ]);
  expect(fake.remove).toHaveBeenCalledTimes(2);
});

it("does not delete any JPEGs after a stale or ambiguous Table transaction failure", async () => {
  fake.get.mockImplementation(async (_partition, key) =>
    key === ALLOCATION_ROW
      ? { ...allocation, assetCount: 1, nextDisplayOrder: 3 }
      : key === photo.id
        ? photo
        : row,
  );
  fake.transaction.mockRejectedValue(new Error("Unknown completion"));
  await expect(
    createConfiguredGalleryAdmin(env).store.remove(id, photo.id),
  ).rejects.toThrow("Unknown completion");
  expect(fake.remove).not.toHaveBeenCalled();
});

it("reports incomplete cleanup and safely retries an already removed photograph without decrementing twice", async () => {
  let removed = false;
  fake.get.mockImplementation(async (_partition, key) => {
    if (key === ALLOCATION_ROW)
      return {
        ...allocation,
        assetCount: removed ? 0 : 1,
        nextDisplayOrder: 3,
        etag: removed ? '"allocation2"' : allocation.etag,
      };
    if (key === photo.id) {
      if (removed) throw { statusCode: 404, code: "ResourceNotFound" };
      return photo;
    }
    return row;
  });
  fake.transaction.mockImplementation(async () => {
    removed = true;
  });
  fake.remove.mockRejectedValueOnce(new Error("Temporary Blob failure"));
  const { store } = createConfiguredGalleryAdmin(env);
  expect(await store.remove(id, photo.id)).toEqual({ cleanupComplete: false });
  expect(await store.remove(id, photo.id)).toEqual({ cleanupComplete: true });
  expect(fake.transaction.mock.calls[1][0]).toEqual([
    [
      "update",
      expect.objectContaining({ assetCount: 0, nextDisplayOrder: 3 }),
      "Replace",
      { etag: '"allocation2"' },
    ],
  ]);
});

it("rejects invalid namespaces and public containers before removal", async () => {
  const { store } = createConfiguredGalleryAdmin(env);
  await expect(store.remove(id, "../another/web.jpg")).rejects.toThrow();
  expect(fake.get).not.toHaveBeenCalled();
  fake.props.mockResolvedValue({ blobPublicAccess: "blob" });
  await expect(store.remove(id, photo.id)).rejects.toThrow("Private container");
  expect(fake.transaction).not.toHaveBeenCalled();
  expect(fake.remove).not.toHaveBeenCalled();
});

it("lists whitelisted admin photo metadata including all 300 assets and no storage fields", async () => {
  fake.list.mockReturnValue({
    async *[Symbol.asyncIterator]() {
      yield { ...allocation, assetCount: 300, nextDisplayOrder: 300 };
      for (let i = 0; i < 300; i++)
        yield {
          ...photo,
          id: `a_${String(i).padStart(22, "0")}`,
          rowKey: `a_${String(i).padStart(22, "0")}`,
          displayOrder: i,
          secret: "hidden",
        };
    },
  });
  const result = await createConfiguredGalleryAdmin(env).store.photos(id);
  expect(result).toHaveLength(300);
  expect(Object.keys(result[0]).sort()).toEqual([
    "altText",
    "displayOrder",
    "height",
    "id",
    "width",
  ]);
});

it("previews only the existing photo's web copy and refuses absent or cross-gallery assets", async () => {
  fake.get.mockImplementation(async (_partition, key) =>
    key === photo.id ? photo : row,
  );
  fake.download.mockResolvedValue({
    contentLength: jpeg.length,
    readableStreamBody: Readable.from([jpeg]),
  });
  const { store } = createConfiguredGalleryAdmin(env);
  expect(await store.preview(id, photo.id)).toEqual(jpeg);
  expect(fake.blob).toHaveBeenCalledWith(`${id}/${photo.id}/web.jpg`);
  fake.download.mockClear();
  fake.get.mockImplementation(async (_partition, key) => {
    if (key === photo.id) throw { statusCode: 404, code: "ResourceNotFound" };
    return row;
  });
  expect(await store.preview(id, photo.id)).toBeNull();
  expect(fake.download).not.toHaveBeenCalled();
  fake.get.mockImplementation(async (_partition, key) =>
    key === photo.id ? { ...photo, galleryId: "g_otherGallery12345678" } : row,
  );
  await expect(store.preview(id, photo.id)).rejects.toThrow(
    "Invalid gallery asset",
  );
  expect(fake.download).not.toHaveBeenCalled();
});
it("uses exact ETags and invalidates both versions when replacing or revoking", async () => {
  const { store } = createConfiguredGalleryAdmin(env);
  await store.change(id, "replace", "b".repeat(64));
  expect(fake.update).toHaveBeenCalledWith(
    expect.objectContaining({
      sessionVersion: 2,
      accessTokenVersion: 2,
      accessTokenHash: "b".repeat(64),
    }),
    "Merge",
    { etag: row.etag },
  );
  await store.change(id, "revoke");
  expect(fake.update).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: "revoked" }),
    "Merge",
    { etag: row.etag },
  );
});
it("refuses replacement for revoked and expired records", async () => {
  const { store } = createConfiguredGalleryAdmin(env);
  for (const record of [
    { ...row, status: "revoked" },
    { ...row, expiresAt: 1 },
  ]) {
    fake.get.mockResolvedValue(record);
    await expect(store.change(id, "replace", "b".repeat(64))).rejects.toThrow();
  }
  expect(fake.update).not.toHaveBeenCalled();
});
it("lists whitelisted metadata with a continuation token", async () => {
  const result = await createConfiguredGalleryAdmin(env).store.list();
  expect(result.cursor).toBe("next");
  expect(result.galleries).toHaveLength(1);
  expect(JSON.stringify(result)).not.toContain("accessTokenHash");
  expect(JSON.stringify(result)).not.toContain("etag");
});
it("publishes both immutable JPEGs before the conditional Table transaction", async () => {
  await createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test");
  expect(fake.upload).toHaveBeenCalledTimes(2);
  expect(fake.transaction).toHaveBeenCalledWith([
    [
      "update",
      expect.objectContaining({ assetCount: 1, nextDisplayOrder: 1 }),
      "Replace",
      { etag: allocation.etag },
    ],
    [
      "create",
      expect.objectContaining({
        partitionKey: `gallery-assets-${id}`,
        width: 150,
        height: 100,
        displayOrder: 0,
      }),
    ],
  ]);
  expect(fake.upload.mock.invocationCallOrder[1]).toBeLessThan(
    fake.transaction.mock.invocationCallOrder[0],
  );
});
it("refuses public containers and does not publish", async () => {
  fake.props.mockResolvedValue({ blobPublicAccess: "blob" });
  await expect(
    createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test"),
  ).rejects.toThrow("Private container");
  expect(fake.create).not.toHaveBeenCalled();
});
it("keeps blobs after an ambiguous metadata write", async () => {
  fake.transaction.mockRejectedValue(new Error("network timeout"));
  await expect(
    createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test"),
  ).rejects.toThrow();
  expect(fake.remove).not.toHaveBeenCalled();
});
it("cleans exact blob versions if gallery is revoked before publication", async () => {
  fake.get
    .mockResolvedValueOnce(row)
    .mockResolvedValueOnce(allocation)
    .mockResolvedValueOnce({ ...row, status: "revoked", etag: '"version2"' });
  await expect(
    createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test"),
  ).rejects.toThrow("Gallery changed");
  expect(fake.remove).toHaveBeenCalledTimes(2);
  expect(fake.remove).toHaveBeenCalledWith({
    conditions: { ifMatch: '"blob"' },
  });
  expect(fake.create).not.toHaveBeenCalled();
});
it("rejects a stale allocation at publication without retrying", async () => {
  fake.transaction.mockRejectedValue(
    Object.assign(new Error("ETag mismatch"), { statusCode: 412 }),
  );
  await expect(
    createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test"),
  ).rejects.toThrow("ETag mismatch");
  expect(fake.transaction).toHaveBeenCalledOnce();
  expect(fake.remove).not.toHaveBeenCalled(); // Ambiguous publication preserves supplied bytes.
});

it("reports the 300-photo limit before writing any blobs", async () => {
  fake.get.mockImplementation(async (_partition, key) =>
    key === ALLOCATION_ROW
      ? { ...allocation, assetCount: 300, nextDisplayOrder: 300 }
      : row,
  );
  await expect(
    createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test"),
  ).rejects.toMatchObject({
    message: expect.stringContaining("300-photo maximum"),
  });
  expect(fake.upload).not.toHaveBeenCalled();
  expect(fake.transaction).not.toHaveBeenCalled();
});
it.each([
  "full size",
  "web size",
  "full dimensions",
  "web dimensions",
  "invalid JPEG",
])(
  "rejects %s with actionable validation before storage writes",
  async (kind) => {
    let web = Buffer.from(jpeg),
      full = Buffer.from(jpeg);
    if (kind === "full size") full = Buffer.alloc(20 * 1024 * 1024 + 1);
    if (kind === "web size") web = Buffer.alloc(4 * 1024 * 1024 + 1);
    if (kind === "full dimensions") full.writeUInt16BE(30001, 9);
    if (kind === "web dimensions") web.writeUInt16BE(2049, 9);
    if (kind === "invalid JPEG") full = Buffer.from("not a JPEG");
    await expect(
      createConfiguredGalleryAdmin(env).store.upload(id, web, full, "Test"),
    ).rejects.toBeInstanceOf(GalleryUploadValidationError);
    expect(fake.upload).not.toHaveBeenCalled();
    expect(fake.transaction).not.toHaveBeenCalled();
  },
);

it("returns the exact link version committed rather than a later reader's version", async () => {
  const { store } = createConfiguredGalleryAdmin(env);
  fake.update.mockImplementation(async () => {
    fake.get.mockResolvedValue({ ...row, accessTokenVersion: 3 });
  });
  expect(await store.change(id, "replace", "b".repeat(64))).toBe(2);
  expect(fake.get).toHaveBeenCalledTimes(1);
  expect(await store.get(id)).toMatchObject({ accessTokenVersion: 3 });
});


it("adds photos to an existing 250-photo gallery without resetting its allocation", async () => {
  fake.get.mockImplementation(async (_partition, key) =>
    key === ALLOCATION_ROW
      ? { ...allocation, assetCount: 250, nextDisplayOrder: 270 }
      : row,
  );
  await createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test");
  expect(fake.upload).toHaveBeenCalledTimes(2);
  expect(fake.transaction).toHaveBeenCalledWith([
    ["update", expect.objectContaining({ assetCount: 251, nextDisplayOrder: 271 }), "Replace", { etag: allocation.etag }],
    ["create", expect.objectContaining({ displayOrder: 270 })],
  ]);
});
