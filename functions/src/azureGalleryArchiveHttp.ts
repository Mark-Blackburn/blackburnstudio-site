import { TableClient } from "@azure/data-tables";
import { QueueClient } from "@azure/storage-queue";
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
  const queue = new QueueClient(`${queueEndpoint.origin}/gallery-archive-jobs`, credential);
  return createGalleryArchiveHttpHandlers({
    ...access,
    assets: createGalleryAssetStore(table),
    jobs: createAzureArchiveJobStore(table),
    queue: {
      enqueue: async message => {
        await queue.sendMessage(Buffer.from(JSON.stringify(message)).toString("base64"));
      },
    },
  });
}
