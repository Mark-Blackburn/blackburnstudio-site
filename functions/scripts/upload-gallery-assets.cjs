// Operator-only JPEG uploader. No upload route or browser storage credential.
const fs = require("node:fs");
const { randomBytes } = require("node:crypto");
const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");
const { AzureCliCredential } = require("@azure/identity");
const { GALLERY_ID, galleryIsAvailable } = require("../dist/functions/src/galleryAccess.js");
const { GALLERY_PARTITION } = require("../dist/functions/src/azureGalleryAccess.js");
const { readGalleryAllocation, publishGalleryAsset } = require("../dist/functions/src/galleryAssetPublication.js");
const { MAX_GALLERY_ASSETS, MAX_WEB_BYTES, MAX_FULL_BYTES, validAsset, assetBlobName } = require("../dist/functions/src/galleryAssets.js");

function dimensions(data) {
  if (data[0] !== 0xff || data[1] !== 0xd8) throw new Error("JPEG required");
  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset++] !== 0xff) throw new Error("Invalid JPEG marker");
    while (data[offset] === 0xff) offset++;
    const marker = data[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    const length = data.readUInt16BE(offset);
    if (length < 2 || offset + length > data.length) break;
    if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8)
      return { height: data.readUInt16BE(offset + 3), width: data.readUInt16BE(offset + 5) };
    offset += length;
  }
  throw new Error("Unsupported JPEG dimensions");
}

function image(path, maxBytes) {
  if (typeof path !== "string" || fs.statSync(path).size > maxBytes) throw new Error("Image exceeds size limit");
  const bytes = fs.readFileSync(path);
  if (bytes.length < 3 || bytes.length > maxBytes) throw new Error("Invalid image size");
  return { bytes, ...dimensions(bytes) };
}

function endpoint(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new Error("Invalid storage endpoint");
  return url.origin;
}

async function main() {
  const input = JSON.parse(fs.readFileSync(0, "utf8"));
  if (!input || !GALLERY_ID.test(input.galleryId) || input.galleryId === "g_7Rk3mN9xQ2vL8pT4" ||
      !Array.isArray(input.assets) || input.assets.length < 1 || input.assets.length > MAX_GALLERY_ASSETS)
    throw new Error("Invalid upload manifest");
  const tableName = process.env.GALLERY_TABLE_NAME ?? "";
  const containerName = process.env.GALLERY_BLOB_CONTAINER ?? "";
  if (!/^[A-Za-z][A-Za-z0-9]{2,62}$/.test(tableName) || !/^[a-z0-9](?:[a-z0-9]|-(?!-)){1,61}[a-z0-9]$/.test(containerName))
    throw new Error("Invalid storage configuration");
  const credential = new AzureCliCredential();
  const table = new TableClient(endpoint(process.env.GALLERY_TABLE_ENDPOINT), tableName, credential);
  const container = new BlobServiceClient(endpoint(process.env.GALLERY_BLOB_ENDPOINT), credential).getContainerClient(containerName);
  if ((await container.getProperties()).blobPublicAccess) throw new Error("Private container required");
  const gallery = await table.getEntity(GALLERY_PARTITION, input.galleryId);
  if (!galleryIsAvailable(gallery, Date.now())) throw new Error("Gallery unavailable");
  for (const entry of input.assets) {
    // Prepare web exports without EXIF/location data before uploading.
    const allocation = await readGalleryAllocation(table, input.galleryId);
    if (allocation.assetCount >= MAX_GALLERY_ASSETS) throw new Error("Too many assets");
    const web = image(entry.webFile, MAX_WEB_BYTES);
    const full = image(entry.fullFile, MAX_FULL_BYTES);
    const asset = { galleryId: input.galleryId, id: `a_${randomBytes(16).toString("base64url")}`,
      altText: entry.altText ?? "", width: web.width, height: web.height, displayOrder: allocation.nextDisplayOrder,
      webByteSize: web.bytes.length, fullByteSize: full.bytes.length };
    if (!validAsset(asset, input.galleryId)) throw new Error("Invalid asset metadata");
    const created = [];
    let registrationAttempted = false;
    try {
      for (const [isFull, bytes] of [[false, web.bytes], [true, full.bytes]]) {
        const blob = container.getBlockBlobClient(assetBlobName(asset, isFull));
        const result = await blob.uploadData(bytes, { conditions: { ifNoneMatch: "*" },
          blobHTTPHeaders: { blobContentType: "image/jpeg", blobCacheControl: "no-store" } });
        created.push({ blob, etag: result.etag });
      }
      // Publish the asset only once both immutable variants are available.
      registrationAttempted = true;
      await publishGalleryAsset(table, allocation, asset);
    } finally {
      // A lost Table response may follow a successful create. Keep both blobs
      // after an ambiguous registration result rather than breaking that row.
      if (!registrationAttempted) {
        for (const { blob, etag } of created) {
          if (etag) await blob.deleteIfExists({ conditions: { ifMatch: etag } }).catch(() => undefined);
        }
      }
    }
  }
  console.log(`Uploaded ${input.assets.length} gallery photographs.`);
}
main().catch(() => { console.error("Gallery upload failed. Check configuration and the manifest; inspect unreferenced uploads before retrying. No storage details printed."); process.exitCode = 1; });
