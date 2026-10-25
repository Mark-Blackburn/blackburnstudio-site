import { parseArchiveQueueMessage } from "./galleryArchiveQueue";

export interface QueueReceipt {
  id: string;
  popReceipt: string;
  text: string;
  dequeueCount: number;
}
export interface ArchiveMessageQueue {
  receive(visibilitySeconds: number): Promise<QueueReceipt | null>;
  renew(receipt: QueueReceipt, visibilitySeconds: number): Promise<QueueReceipt>;
  delete(receipt: QueueReceipt): Promise<void>;
}
export interface ArchiveConsumerOptions {
  visibilitySeconds?: number;
  renewalIntervalMs?: number;
  maxDequeueCount?: number;
}

/**
 * Consume one Azure Storage Queue message per Container Apps Job execution.
 * Renewal failures abort the job instead of risking duplicate archive writes.
 * The underlying archive handler is responsible for Table ETag ownership.
 */
export async function consumeOneArchiveMessage(
  queue: ArchiveMessageQueue,
  handler: (message: { galleryId: string; jobId: string }, signal?: AbortSignal) => Promise<void>,
  options: ArchiveConsumerOptions = {},
): Promise<"empty" | "processed"> {
  const visibility = options.visibilitySeconds ?? 120;
  const interval = options.renewalIntervalMs ?? 30000;
  const maxAttempts = options.maxDequeueCount ?? 5;
  if (!Number.isSafeInteger(visibility) || visibility < 60 || visibility > 600 ||
      !Number.isSafeInteger(interval) || interval < 1000 || interval >= visibility * 500 ||
      !Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 32)
    throw new Error("Invalid archive queue consumer settings");
  const initial = await queue.receive(visibility);
  if (!initial) return "empty";
  let receipt = initial;
  let stopped = false;
  let renewalFailure: unknown;
  const leaseController = new AbortController();
  let renewing = Promise.resolve();
  const timer = setInterval(() => {
    renewing = renewing.then(async () => {
      if (stopped || renewalFailure) return;
      try { receipt = await queue.renew(receipt, visibility); }
      catch (error) {
        renewalFailure = error;
        leaseController.abort(new Error("Archive queue visibility renewal failed", { cause: error }));
      }
    });
  }, interval);
  try {
    if (initial.dequeueCount > maxAttempts)
      throw new Error("Archive queue message exceeded delivery limit; poison handling required");
    const message = parseArchiveQueueMessage(initial.text);
    await handler(message, leaseController.signal);
    stopped = true;
    clearInterval(timer);
    await renewing;
    if (renewalFailure) throw new Error("Archive queue visibility renewal failed", { cause: renewalFailure });
    await queue.delete(receipt);
    return "processed";
  } finally {
    stopped = true;
    clearInterval(timer);
    await renewing;
  }
}
