import { expect, it, vi } from "vitest";
import { uploadGalleryArchive } from "./azureGalleryArchiveWorker";
import type { ArchiveSelection } from "./galleryArchiveSelection";
import type { PrivateGalleryAsset } from "./galleryAssets";
import type { ContainerClient } from "@azure/storage-blob";

const galleryId = "g_testGallery12345678";
const jobId = "z_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef";
const asset: PrivateGalleryAsset = {
  galleryId, id: "a_testAsset12345678", altText: "Test", width: 100, height: 100,
  displayOrder: 0, webByteSize: 6, fullByteSize: 6,
};
const selection: ArchiveSelection = {
  variant: "full", totalBytes: 6,
  assets: [{ id: asset.id, photoNumber: 1, byteSize: 6 }],
};
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0, 0xff, 0xd9]);

function setup(data: Buffer = jpeg) {
  const download = vi.fn(async () => ({
    contentLength: data.length,
    readableStreamBody: (async function* () { yield data.subarray(0, 3); yield data.subarray(3); })(),
  }));
  const stageBlock = vi.fn(async () => undefined);
  const commitBlockList = vi.fn(async () => undefined);
  const deleteIfExists = vi.fn(async () => undefined);
  const source = { getBlobClient: vi.fn(() => ({ download })) } as unknown as ContainerClient;
  const destination = { getBlockBlobClient: vi.fn(() => ({ stageBlock, commitBlockList, deleteIfExists })) } as unknown as ContainerClient;
  return { source, destination, download, stageBlock, commitBlockList, deleteIfExists };
}

it("streams private JPEG into staged ZIP64 blocks and commits once", async () => {
  const mock = setup();
  const progress = vi.fn();
  const result = await uploadGalleryArchive(mock.source, mock.destination,
    galleryId, jobId, selection, [asset], new AbortController().signal, progress);
  expect(result.blobName).toBe(`${galleryId}/${jobId}.zip`);
  expect(result.archiveBytes).toBeGreaterThan(jpeg.length);
  expect(mock.stageBlock).toHaveBeenCalled();
  expect(mock.commitBlockList).toHaveBeenCalledTimes(1);
  expect(progress).toHaveBeenCalledWith(1, jpeg.length);
  expect(mock.deleteIfExists).not.toHaveBeenCalled();
});

it("does not commit truncated sources or delete existing archives", async () => {
  const mock = setup(jpeg.subarray(0, 4));
  await expect(uploadGalleryArchive(mock.source, mock.destination,
    galleryId, jobId, selection, [asset], new AbortController().signal))
    .rejects.toThrow("length mismatch");
  expect(mock.commitBlockList).not.toHaveBeenCalled();
  expect(mock.deleteIfExists).not.toHaveBeenCalled();
});

it("rejects changed server-owned asset sizes before fetching", async () => {
  const mock = setup();
  await expect(uploadGalleryArchive(mock.source, mock.destination,
    galleryId, jobId, selection, [{ ...asset, fullByteSize: 5 }], new AbortController().signal))
    .rejects.toThrow("source changed");
  expect(mock.download).not.toHaveBeenCalled();
});
