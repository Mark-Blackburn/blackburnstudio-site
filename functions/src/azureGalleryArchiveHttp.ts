import { TableClient } from "@azure/data-tables";
import { BlobServiceClient } from "@azure/storage-blob";
import { createGalleryArchiveDownloadHandler } from "./galleryArchiveDownload";
import { DefaultAzureCredential } from "@azure/identity";
import { createConfiguredGalleryAccess } from "./azureGalleryAccess";
import { createGalleryAssetStore } from "./azureGalleryDelivery";
import { createAzureArchiveJobStore } from "./azureGalleryArchiveJobs";
import { createGalleryArchiveHttpHandlers } from "./galleryArchiveHttp";

export function createConfiguredGalleryArchiveHttp(environment: NodeJS.ProcessEnv = process.env) {
  const access = createConfiguredGalleryAccess(environment);
  const queueEndpoint = new URL(environment.GALLERY_ARCHIVE_QUEUE_ENDPOINT ?? "");
  if (queueEndpoint.protocol !== "https:" || queueEndpoint.username || queueEndpoint.password ||
      queueEndpoint.pathname !== "/" || queueEndpoint.search || queueEndpoint.hash)
    throw new Error("Invalid gallery archive queue endpoint");
  const credential = new DefaultAzureCredential();
  const table = new TableClient(environment.GALLERY_TABLE_ENDPOINT!, environment.GALLERY_TABLE_NAME!, credential,
    { retryOptions: { maxRetries: 2 } });

  const api = createGalleryArchiveHttpHandlers({
    ...access,
    assets: createGalleryAssetStore(table),
    jobs: createAzureArchiveJobStore(table),
    queue: {
      enqueue: async message => {
        const token = await credential.getToken("https://storage.azure.com/.default");
        if (!token) throw new Error("Azure queue credential unavailable");
        const encoded = Buffer.from(JSON.stringify(message)).toString("base64");
        const response = await fetch(`${queueEndpoint.origin}/gallery-archive-jobs/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.token}`,
            "x-ms-version": "2023-11-03",
            "x-ms-date": new Date().toUTCString(),
            "Content-Type": "application/xml",
          },
          body: `<QueueMessage><MessageText>${encoded}</MessageText></QueueMessage>`,
          signal: AbortSignal.timeout(10000),
        });
        if (response.status !== 201) throw new Error(`Archive queue rejected request: ${response.status}`);
      },
    },
  });
  const blobEndpoint = new URL(environment.GALLERY_BLOB_ENDPOINT ?? "");
  const archiveContainer = environment.GALLERY_ARCHIVE_BLOB_CONTAINER ?? "";
  if (blobEndpoint.protocol !== "https:" || blobEndpoint.username || blobEndpoint.password ||
      blobEndpoint.pathname !== "/" || blobEndpoint.search || blobEndpoint.hash ||
      !/^[a-z0-9](?:[a-z0-9]|-(?!-)){1,61}[a-z0-9]$/.test(archiveContainer) ||
      archiveContainer === environment.GALLERY_BLOB_CONTAINER)
    throw new Error("Invalid archive download storage configuration");
  const blobs = new BlobServiceClient(blobEndpoint.origin, credential);
  const download = createGalleryArchiveDownloadHandler({
    ...access,
    jobs: createAzureArchiveJobStore(table),
    assets: createGalleryAssetStore(table),
    container: blobs.getContainerClient(archiveContainer),
  });
  return { ...api, download };
}
