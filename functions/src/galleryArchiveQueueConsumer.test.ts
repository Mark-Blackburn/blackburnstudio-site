import { expect, it, vi } from "vitest";
import { consumeOneArchiveMessage, type ArchiveMessageQueue, type QueueReceipt } from "./galleryArchiveQueueConsumer";

const message = JSON.stringify({
  galleryId: "g_testGallery12345678",
  jobId: "z_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef",
});
function setup(text = message) {
  const receipt: QueueReceipt = { id: "queue-id", popReceipt: "receipt-1", text, dequeueCount: 1 };
  const queue: ArchiveMessageQueue = {
    receive: vi.fn(async () => receipt),
    renew: vi.fn(async value => ({ ...value, popReceipt: "receipt-2" })),
    delete: vi.fn(async () => {}),
  };
  const handler = vi.fn(async () => {});
  return { queue, handler };
}
it("returns empty without calling the worker", async () => {
  const { queue, handler } = setup();
  queue.receive = vi.fn(async () => null);
  expect(await consumeOneArchiveMessage(queue, handler)).toBe("empty");
  expect(handler).not.toHaveBeenCalled();
});
it("deletes a valid message only after successful processing", async () => {
  const { queue, handler } = setup();
  expect(await consumeOneArchiveMessage(queue, handler)).toBe("processed");
  expect(handler).toHaveBeenCalledOnce();
  expect(queue.delete).toHaveBeenCalledOnce();
});
it("preserves the message for retry if processing fails", async () => {
  const { queue, handler } = setup();
  handler.mockRejectedValueOnce(new Error("upload failed"));
  await expect(consumeOneArchiveMessage(queue, handler)).rejects.toThrow("upload failed");
  expect(queue.delete).not.toHaveBeenCalled();
});
it("rejects malformed and over-retried messages without acknowledgement", async () => {
  const { queue, handler } = setup("{}");
  await expect(consumeOneArchiveMessage(queue, handler)).rejects.toThrow("Invalid");
  expect(queue.delete).not.toHaveBeenCalled();
  const retry = setup();
  retry.queue.receive = vi.fn(async () => ({ id: "id", popReceipt: "r", text: message, dequeueCount: 6 }));
  await expect(consumeOneArchiveMessage(retry.queue, retry.handler)).rejects.toThrow("delivery limit");
  expect(retry.handler).not.toHaveBeenCalled();
});

it("aborts active processing when visibility renewal fails and does not acknowledge", async () => {
  vi.useFakeTimers();
  try {
    const { queue } = setup();
    queue.renew = vi.fn(async () => { throw new Error("lease lost"); });
    const handler = vi.fn(async (_message: unknown, signal?: AbortSignal) => {
      await new Promise<void>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    });
    const pending = consumeOneArchiveMessage(queue, handler, { renewalIntervalMs: 1000 });
    await Promise.resolve();
    await Promise.resolve();
    const assertion = expect(pending).rejects.toThrow("visibility renewal failed");
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(queue.delete).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
