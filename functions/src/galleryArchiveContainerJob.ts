/**
 * Standalone container entrypoint for an explicitly dispatched archive job.
 * This is not yet a queue consumer: the orchestrator must provide a validated
 * message and manage durable dequeue, visibility, retries and acknowledgements.
 */
import { createConfiguredGalleryArchiveWorker } from "./azureGalleryArchiveQueue";
import { parseArchiveQueueMessage } from "./galleryArchiveQueue";
import { consumeOneArchiveMessage } from "./galleryArchiveQueueConsumer";
import { createAzureArchiveMessageQueue } from "./azureGalleryArchiveMessageQueue";

export async function runGalleryArchiveContainerJob(
  environment: NodeJS.ProcessEnv = process.env,
  run?: (message: { galleryId: string; jobId: string }) => Promise<void>,
): Promise<void> {
  if (environment.GALLERY_ARCHIVE_CONTAINER_JOB_ENABLED !== "true")
    throw new Error("Archive container job is disabled");
  const raw = environment.GALLERY_ARCHIVE_JOB_MESSAGE;
  if (!raw && environment.GALLERY_ARCHIVE_QUEUE_CONSUMER_ENABLED === "true") {
    await consumeOneArchiveMessage(
      createAzureArchiveMessageQueue(environment),
      run ?? createConfiguredGalleryArchiveWorker(environment),
    );
    return;
  }
  if (!raw || raw.length > 2048) throw new Error("Missing or oversized archive job message");
  const message = parseArchiveQueueMessage(raw);
  await (run ?? createConfiguredGalleryArchiveWorker(environment))(message);
}

if (require.main === module) {
  runGalleryArchiveContainerJob().catch(error => {
    console.error("[gallery-archive-job] Execution failed", error);
    process.exitCode = 1;
  });
}
