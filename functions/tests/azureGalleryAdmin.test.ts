import { beforeEach, it, expect, vi } from "vitest";
const fake = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  props: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  acquire: vi.fn(),
  renew: vi.fn(),
  release: vi.fn(),
}));
vi.mock("@azure/data-tables", () => ({
  TableClient: class {
    getEntity = fake.get;
    updateEntity = fake.update;
    createEntity = fake.create;
    listEntities = fake.list;
  },
}));
vi.mock("@azure/identity", () => ({ DefaultAzureCredential: class {} }));
vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: class {
    getContainerClient() {
      return {
        getProperties: fake.props,
        getBlockBlobClient: () => ({ uploadData: fake.upload }),
        getBlobClient: () => ({
          deleteIfExists: fake.remove,
          getBlobLeaseClient: () => ({
            acquireLease: fake.acquire,
            renewLease: fake.renew,
            releaseLease: fake.release,
          }),
        }),
      };
    }
  },
}));
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
beforeEach(() => {
  vi.resetAllMocks();
  fake.get.mockResolvedValue(row);
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
it("publishes metadata only after both immutable JPEGs and checks lease ownership", async () => {
  await createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test");
  expect(fake.upload).toHaveBeenCalledTimes(3); // Lock plus web/full.
  expect(fake.create).toHaveBeenCalledWith(
    expect.objectContaining({
      partitionKey: `gallery-assets-${id}`,
      width: 150,
      height: 100,
    }),
  );
  expect(fake.renew.mock.invocationCallOrder[0]).toBeLessThan(
    fake.create.mock.invocationCallOrder[0],
  );
  expect(fake.release).toHaveBeenCalledOnce();
});
it("refuses public containers and does not publish", async () => {
  fake.props.mockResolvedValue({ blobPublicAccess: "blob" });
  await expect(
    createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test"),
  ).rejects.toThrow("Private container");
  expect(fake.create).not.toHaveBeenCalled();
  expect(fake.release).toHaveBeenCalledOnce();
});
it("keeps blobs after an ambiguous metadata write", async () => {
  fake.create.mockRejectedValue(new Error("network timeout"));
  await expect(
    createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test"),
  ).rejects.toThrow();
  expect(fake.remove).not.toHaveBeenCalled();
  expect(fake.release).toHaveBeenCalledOnce();
});
it("cleans exact blob versions if gallery is revoked before publication", async () => {
  fake.get
    .mockResolvedValueOnce(row)
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
it("refuses competing writers before loading gallery or assets", async () => {
  fake.acquire.mockRejectedValue(new Error("Lease already held"));
  await expect(
    createConfiguredGalleryAdmin(env).store.upload(id, jpeg, jpeg, "Test"),
  ).rejects.toThrow();
  expect(fake.get).not.toHaveBeenCalled();
  expect(fake.create).not.toHaveBeenCalled();
});
