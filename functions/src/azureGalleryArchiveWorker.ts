/**
 * Private Azure Blob adapter for ZIP archive processing.
 * The worker reads source JPEGs as streams and uploads archive blocks
 * without buffering the completed archive in the Function process.
 */
import type { ContainerClient } from "@azure/storage-blob";
import { assetBlobName, type PrivateGalleryAsset } from "./galleryAssets";
import { streamGalleryZip64, type ZipSource } from "./galleryZip64";
import type { ArchiveSelection } from "./galleryArchiveSelection";

const BLOCK_BYTES = 4 * 1024 * 1024;
const BLOCK_LIMIT = 50000;

export interface ArchiveProgress {
  (photosCompleted: number, bytesCompleted: number): Promise<void> | void;
}

export async function uploadGalleryArchive(
  sourceContainer: ContainerClient,
  archiveContainer: ContainerClient,
  galleryId: string,
  jobId: string,
  selection: ArchiveSelection,
  assets: PrivateGalleryAsset[],
  signal: AbortSignal,
  progress?: ArchiveProgress,
): Promise<{ blobName: string; archiveBytes: number }> {
  if (!/^g_[A-Za-z0-9_-]{16,64}$/.test(galleryId) ||
      !/^z_[A-Za-z0-9_-]{32}$/.test(jobId))
    throw new Error("Invalid archive identifiers");
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const blobName = `${galleryId}/${jobId}.zip`;
  const target = archiveContainer.getBlockBlobClient(blobName);
  const blockIds: string[] = [];
  let blockNumber = 0;
  let pending = Buffer.allocUnsafe(BLOCK_BYTES);
  let pendingLength = 0;
  let archiveBytes = 0;
  let photosCompleted = 0;
  let sourceBytes = 0;

  async function* sources(): AsyncGenerator<ZipSource> {
    for (const selected of selection.assets) {
      signal.throwIfAborted();
      const asset = byId.get(selected.id);
      if (!asset || asset.galleryId !== galleryId) throw new Error("Archive source unavailable");
      const expected = selection.variant === "full" ? asset.fullByteSize : asset.webByteSize;
      if (expected !== selected.byteSize) throw new Error("Archive source changed");
      const blob = sourceContainer.getBlobClient(assetBlobName(asset, selection.variant === "full"));
      const response = await blob.download(0, undefined, { abortSignal: signal, maxRetryRequests: 0 });
      if (!response.readableStreamBody || response.contentLength !== expected)
        throw new Error("Archive source length mismatch");
      const stream = response.readableStreamBody;
      yield {
        photoNumber: selected.photoNumber,
        variant: selection.variant,
        bytes: expected,
        chunks: (async function* () {
          let read = 0;
          let first: number[] = [];
          for await (const chunk of stream) {
            signal.throwIfAborted();
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            if (first.length < 3) first.push(...bytes.subarray(0, 3 - first.length));
            read += bytes.length;
            if (read > expected) throw new Error("Archive source exceeds declared length");
            sourceBytes += bytes.length;
            yield bytes;
          }
          if (read !== expected || first[0] !== 0xff || first[1] !== 0xd8 || first[2] !== 0xff)
            throw new Error("Invalid archive JPEG");
          photosCompleted++;
          await progress?.(photosCompleted, sourceBytes);
        })(),
      };
    }
  }

  async function stage(bytes: Buffer) {
    signal.throwIfAborted();
    const id = Buffer.from(String(blockNumber++).padStart(8, "0")).toString("base64");
    if (blockIds.length >= BLOCK_LIMIT) throw new Error("Archive block limit exceeded");
    await target.stageBlock(id, bytes, bytes.length, { abortSignal: signal });
    blockIds.push(id);
    archiveBytes += bytes.length;
  }

  try {
    // Streaming writer has no local file, no archive-wide Buffer and no SAS.
    // Keep only one upload block plus the current ZIP chunk in memory.
    for await (const chunk of streamGalleryZip64(sources(), signal)) {
      signal.throwIfAborted();
      let cursor = 0;
      while (cursor < chunk.length) {
        const take = Math.min(BLOCK_BYTES - pendingLength, chunk.length - cursor);
        chunk.copy(pending, pendingLength, cursor, cursor + take);
        pendingLength += take;
        cursor += take;
        if (pendingLength === BLOCK_BYTES) {
          await stage(pending);
          pending = Buffer.allocUnsafe(BLOCK_BYTES);
          pendingLength = 0;
        }
      }
    }
    if (pendingLength) await stage(pending.subarray(0, pendingLength));
    if (!blockIds.length) throw new Error("Archive empty");
    signal.throwIfAborted();
    await target.commitBlockList(blockIds, {
      abortSignal: signal,
      blobHTTPHeaders: { blobContentType: "application/zip", blobCacheControl: "private, no-store" },
      conditions: { ifNoneMatch: "*" },
    });
    return { blobName, archiveBytes };
  } finally {
    // Uncommitted blocks are not visible as an archive and expire in Azure.
    // Never delete a pre-existing committed archive on a failed retry.
  }
}
