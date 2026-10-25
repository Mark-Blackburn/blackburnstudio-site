import { TableClient } from "@azure/data-tables";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { createConfiguredGalleryAccess } from "./azureGalleryAccess";
import { createGalleryAssetStore } from "./azureGalleryDelivery";
import { createAzureArchiveJobStore } from "./azureGalleryArchiveJobs";
import { uploadGalleryArchive } from "./azureGalleryArchiveWorker";
import { createGalleryArchiveQueueHandler } from "./galleryArchiveQueue";

const CONTAINER = /^[a-z0-9](?:[a-z0-9]|-(?!-)){1,61}[a-z0-9]$/;

export function createConfiguredGalleryArchiveWorker(environment: NodeJS.ProcessEnv = process.env) {
  const access = createConfiguredGalleryAccess(environment);
  const endpoint = new URL(environment.GALLERY_BLOB_ENDPOINT ?? "");
  const sourceName = environment.GALLERY_BLOB_CONTAINER ?? "";
  const archiveName = environment.GALLERY_ARCHIVE_BLOB_CONTAINER ?? "";
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
      endpoint.pathname !== "/" || endpoint.search || endpoint.hash ||
      !CONTAINER.test(sourceName) || !CONTAINER.test(archiveName) ||
      sourceName === archiveName)
    throw new Error("Invalid gallery archive Blob configuration");
  const credential = new DefaultAzureCredential();
  const table = new TableClient(environment.GALLERY_TABLE_ENDPOINT!, environment.GALLERY_TABLE_NAME!, credential,
    { retryOptions: { maxRetries: 2 } });
  const service = new BlobServiceClient(endpoint.origin, credential, { retryOptions: { maxTries: 2 } });
  const source = service.getContainerClient(sourceName);
  const destination = service.getContainerClient(archiveName);
  return createGalleryArchiveQueueHandler({
    access: access.store,
    jobs: createAzureArchiveJobStore(table),
    assets: createGalleryAssetStore(table),
    upload: async (galleryId, jobId, selection, signal, progress) => {
      const [sourceProperties, destinationProperties] = await Promise.all([
        source.getProperties({ abortSignal: signal }),
        destination.getProperties({ abortSignal: signal }),
      ]);
      if (sourceProperties.blobPublicAccess || destinationProperties.blobPublicAccess)
        throw new Error("Gallery archive containers must be private");
      const assets = await createGalleryAssetStore(table).listAssets(galleryId);
      return uploadGalleryArchive(source, destination, galleryId, jobId, selection, assets, signal, progress);
    },
  });
}
