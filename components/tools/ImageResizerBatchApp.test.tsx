import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ImageResizerBatchApp from "@/components/tools/ImageResizerBatchApp";
import type {
  ImageResizerWorkerRequest,
  ImageResizerWorkerResponse,
} from "@/components/tools/imageResizerWorkerProtocol";

class MockWorker {
  messages: ImageResizerWorkerRequest[] = [];
  transfers: Transferable[][] = [];
  terminated = false;
  terminateCount = 0;
  private messageListeners = new Set<(event: MessageEvent<unknown>) => void>();
  private errorListeners = new Set<(event: Event) => void>();

  postMessage(message: ImageResizerWorkerRequest, transfer: Transferable[] = []) {
    this.messages.push(message);
    this.transfers.push(transfer);
  }

  addEventListener(type: string, listener: EventListener) {
    if (type === "message") {
      this.messageListeners.add(
        listener as (event: MessageEvent<unknown>) => void,
      );
    } else if (type === "error") {
      this.errorListeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type === "message") {
      this.messageListeners.delete(
        listener as (event: MessageEvent<unknown>) => void,
      );
    } else if (type === "error") {
      this.errorListeners.delete(listener);
    }
  }

  terminate() {
    this.terminated = true;
    this.terminateCount += 1;
  }

  emit(message: ImageResizerWorkerResponse | unknown) {
    const event = { data: message } as MessageEvent<unknown>;
    this.messageListeners.forEach((listener) => listener(event));
  }

  crash() {
    const event = new Event("error");
    this.errorListeners.forEach((listener) => listener(event));
  }
}

function renderApp() {
  const worker = new MockWorker();
  const view = render(
    <ImageResizerBatchApp workerFactory={() => worker as unknown as Worker} />,
  );
  return { worker, ...view };
}

function requestsOfType<T extends ImageResizerWorkerRequest["type"]>(
  worker: MockWorker,
  type: T,
) {
  return worker.messages.filter(
    (message): message is Extract<ImageResizerWorkerRequest, { type: T }> =>
      message.type === type,
  );
}

function emitReady(worker: MockWorker, webp = true) {
  const request = requestsOfType(worker, "initialize").at(-1)!;
  act(() => {
    worker.emit({
      type: "ready",
      requestId: request.requestId,
      capabilities: { JPEG: true, PNG: true, WebP: webp },
      pyodideVersion: "0.28.3",
      pillowVersion: "11.3.0",
      coreVersion: "0.1.2",
      initializationMs: 1350,
    });
  });
}

function imageFile(name: string, type: string) {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const file = new File([bytes], name, { type });
  Object.defineProperty(file, "arrayBuffer", {
    configurable: true,
    value: vi.fn().mockImplementation(async () => bytes.slice().buffer),
  });
  return file;
}

async function emitAndFlush(
  worker: MockWorker,
  message: ImageResizerWorkerResponse | unknown,
) {
  await act(async () => {
    worker.emit(message);
    await Promise.resolve();
  });
}

async function crashAndFlush(worker: MockWorker) {
  await act(async () => {
    worker.crash();
    await Promise.resolve();
  });
}

async function advanceCropPredictionDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(180);
    await Promise.resolve();
  });
}

async function uploadAndInspect(
  worker: MockWorker,
  files: File[],
  formats: Array<"JPEG" | "PNG" | "WebP">,
) {
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText(/^(?:Add images|Add more images)$/),
    files,
  );

  const initialSelections = requestsOfType(worker, "select-image").length - 1;
  for (const [index, format] of formats.entries()) {
    await waitFor(() => {
      expect(requestsOfType(worker, "select-image").length).toBe(
        initialSelections + index + 1,
      );
    });
    const request = requestsOfType(worker, "select-image").at(-1)!;
    await emitAndFlush(worker, {
      type: "image-selected",
      requestId: request.requestId,
      imageId: request.imageId,
      width: 2400 - index * 400,
      height: 1600 - index * 300,
      sourceFormat: format,
    });
  }
  return user;
}

async function respondToProcessSelection(worker: MockWorker, selectionIndex: number) {
  await waitFor(() => {
    expect(requestsOfType(worker, "select-image").length).toBeGreaterThan(
      selectionIndex,
    );
  });
  const request = requestsOfType(worker, "select-image")[selectionIndex];
  await emitAndFlush(worker, {
    type: "image-selected",
    requestId: request.requestId,
    imageId: request.imageId,
    width: 2400,
    height: 1600,
    sourceFormat: "JPEG",
  });
  await waitFor(() => {
    expect(requestsOfType(worker, "process-image").length).toBeGreaterThan(0);
  });
  return requestsOfType(worker, "process-image").at(-1)!;
}

async function emitProcessed(
  worker: MockWorker,
  request: Extract<ImageResizerWorkerRequest, { type: "process-image" }>,
  suggestedFilename = request.outputFilename,
) {
  await emitAndFlush(worker, {
    type: "processed",
    requestId: request.requestId,
    imageId: request.imageId,
    bytes: new Uint8Array([8, 9, 10]).buffer,
    suggestedFilename,
    originalWidth: 2400,
    originalHeight: 1600,
    width: 1600,
    height: 1067,
    outputFormat:
      request.outputFormat === "original" ? "JPEG" : request.outputFormat,
    processingMs: 410,
  });
}

describe("ImageResizerBatchApp", () => {
  beforeEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    let objectUrl = 0;
    Object.defineProperties(URL, {
      createObjectURL: {
        configurable: true,
        value: vi.fn(() => `blob:result-${++objectUrl}`),
      },
      revokeObjectURL: {
        configurable: true,
        value: vi.fn(),
      },
    });
    Object.defineProperty(Blob.prototype, "arrayBuffer", {
      configurable: true,
      value: vi.fn(async () => new Uint8Array([8, 9, 10]).buffer),
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a clear empty upload state without a stale batch action", () => {
    renderApp();

    expect(screen.getByLabelText("Add images")).toBeInTheDocument();
    expect(
      screen.getByText("or drop JPEG, PNG and WebP files here"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Batch action")).not.toBeInTheDocument();
  });

  it("preserves preparing, ready and initialization error states", async () => {
    const { worker } = renderApp();
    expect(screen.getByText("Preparing browser processor…")).toBeInTheDocument();
    expect(screen.queryByLabelText("Batch action")).not.toBeInTheDocument();

    const request = requestsOfType(worker, "initialize")[0];
    act(() => {
      worker.emit({
        type: "error",
        requestId: request.requestId,
        stage: "initialization",
        code: "MANIFEST_FETCH_FAILED",
        message: "The image tools manifest could not be downloaded.",
      });
    });
    await waitFor(() =>
      expect(screen.getByText("Unable to initialise image tools")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    emitReady(worker);
    await waitFor(() =>
      expect(screen.getByText("Browser processor ready")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        "Local processing · your images and metadata stay in this browser",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Started in/)).not.toBeInTheDocument();
  });

  it("enters a terminal runtime error when the worker crashes while idle", async () => {
    const { worker, unmount } = renderApp();
    emitReady(worker);

    await crashAndFlush(worker);

    expect(screen.getByText("Unable to initialise image tools")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The browser image worker stopped unexpectedly. Reload the page to try again.",
      ),
    ).toBeInTheDocument();
    expect(worker.terminated).toBe(true);
    expect(worker.terminateCount).toBe(1);

    await expect(crashAndFlush(worker)).resolves.toBeUndefined();
    expect(worker.terminateCount).toBe(1);
    expect(() => unmount()).not.toThrow();
    expect(worker.terminateCount).toBe(1);
  });

  it("selects and inspects multiple files in selection order", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    await uploadAndInspect(
      worker,
      [
        imageFile("one.jpg", "image/jpeg"),
        imageFile("two.png", "image/png"),
        imageFile("three.webp", "image/webp"),
      ],
      ["JPEG", "PNG", "WebP"],
    );

    const uploadSummary = screen.getByLabelText("Add images by dropping files");
    expect(screen.getByText("3 images added")).toBeInTheDocument();
    expect(within(uploadSummary).getByText("one.jpg")).toBeInTheDocument();
    expect(within(uploadSummary).getByText("two.png")).toBeInTheDocument();
    expect(within(uploadSummary).getByText("three.webp")).toBeInTheDocument();
    expect(
      within(uploadSummary).queryByRole("button", { name: /more|Show less/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Add more images")).toBeInTheDocument();
    expect(requestsOfType(worker, "select-image")).toHaveLength(3);
    expect(worker.transfers.filter((transfer) => transfer.length === 1)).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Clear batch" })).toBeEnabled();
    expect(screen.getByLabelText("Batch action")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Process batch" })).toBeEnabled();
  });

  it("discloses and collapses filenames accessibly, then removes the control at three files", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const files = Array.from({ length: 7 }, (_, index) =>
      imageFile(`image-${index + 1}.jpg`, "image/jpeg"),
    );
    const user = await uploadAndInspect(
      worker,
      files,
      Array.from({ length: 7 }, () => "JPEG" as const),
    );
    const uploadSummary = screen.getByLabelText("Add images by dropping files");

    expect(within(uploadSummary).getByText("image-1.jpg")).toBeInTheDocument();
    expect(within(uploadSummary).getByText("image-2.jpg")).toBeInTheDocument();
    expect(within(uploadSummary).getByText("image-3.jpg")).toBeInTheDocument();
    expect(within(uploadSummary).queryByText("image-4.jpg")).not.toBeInTheDocument();
    const moreButton = within(uploadSummary).getByRole("button", {
      name: "+4 more",
    });
    expect(moreButton).toHaveAttribute("aria-expanded", "false");
    expect(moreButton).toHaveAttribute(
      "aria-controls",
      "image-resizer-file-summary",
    );

    await user.click(moreButton);
    for (const file of files) {
      expect(within(uploadSummary).getByText(file.name)).toBeInTheDocument();
    }
    const showLessButton = within(uploadSummary).getByRole("button", {
      name: "Show less",
    });
    expect(showLessButton).toHaveAttribute("aria-expanded", "true");

    await user.click(showLessButton);
    expect(within(uploadSummary).queryByText("image-4.jpg")).not.toBeInTheDocument();
    expect(
      within(uploadSummary).getByRole("button", { name: "+4 more" }),
    ).toHaveAttribute("aria-expanded", "false");

    for (const imageNumber of [7, 6, 5, 4]) {
      await user.click(
        screen.getByRole("button", { name: `Remove image-${imageNumber}.jpg` }),
      );
    }
    expect(screen.getByText("3 images added")).toBeInTheDocument();
    expect(
      within(uploadSummary).queryByRole("button", { name: /more|Show less/ }),
    ).not.toBeInTheDocument();
  });

  it("resets filename disclosure after clearing and starts a new batch collapsed", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const firstBatch = Array.from({ length: 4 }, (_, index) =>
      imageFile(`first-${index + 1}.jpg`, "image/jpeg"),
    );
    const user = await uploadAndInspect(
      worker,
      firstBatch,
      Array.from({ length: 4 }, () => "JPEG" as const),
    );
    const firstSummary = screen.getByLabelText("Add images by dropping files");
    await user.click(within(firstSummary).getByRole("button", { name: "+1 more" }));
    expect(
      within(firstSummary).getByRole("button", { name: "Show less" }),
    ).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Clear batch" }));
    expect(screen.getByText("0 files")).toBeInTheDocument();

    const secondBatch = Array.from({ length: 4 }, (_, index) =>
      imageFile(`second-${index + 1}.jpg`, "image/jpeg"),
    );
    await uploadAndInspect(
      worker,
      secondBatch,
      Array.from({ length: 4 }, () => "JPEG" as const),
    );
    const secondSummary = screen.getByLabelText("Add images by dropping files");
    expect(within(secondSummary).queryByText("second-4.jpg")).not.toBeInTheDocument();
    expect(
      within(secondSummary).getByRole("button", { name: "+1 more" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps a pending image expanded by default with an accessible disclosure", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );

    expect(screen.getByRole("heading", { name: "Metadata defaults" })).toBeInTheDocument();
    const article = screen.getByRole("article", { name: "one.jpg" });
    const disclosure = within(article).getByRole("button", {
      name: "Hide details for one.jpg",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(within(article).getByLabelText("Output filename")).toBeVisible();
    expect(within(article).getByLabelText("Alt text for website")).toBeVisible();
  });

  it("accepts multiple dropped files and allows adding more later", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const first = imageFile("dropped.jpg", "image/jpeg");
    const second = imageFile("dropped.png", "image/png");
    fireEvent.drop(screen.getByLabelText("Add images by dropping files"), {
      dataTransfer: { files: [first, second] },
    });

    for (const [index, format] of ["JPEG", "PNG"].entries()) {
      await waitFor(() =>
        expect(requestsOfType(worker, "select-image")).toHaveLength(index + 1),
      );
      const request = requestsOfType(worker, "select-image").at(-1)!;
      await emitAndFlush(worker, {
        type: "image-selected",
        requestId: request.requestId,
        imageId: request.imageId,
        width: 1200,
        height: 800,
        sourceFormat: format as "JPEG" | "PNG",
      });
    }

    await uploadAndInspect(
      worker,
      [imageFile("later.webp", "image/webp")],
      ["WebP"],
    );
    expect(screen.getByText("3 images added")).toBeInTheDocument();
    expect(screen.getAllByText("later.webp")).toHaveLength(2);
  });

  it("removes a queued file and clears the batch", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg"), imageFile("two.png", "image/png")],
      ["JPEG", "PNG"],
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove one.jpg" }));
    expect(screen.queryByText("one.jpg")).not.toBeInTheDocument();
    expect(screen.getByText("1 file")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear batch" }));
    expect(screen.getByText("0 files")).toBeInTheDocument();
    expect(screen.getByText("Select images to build a batch.")).toBeInTheDocument();
  });

  it("processes the batch sequentially and does not start the next file early", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg"), imageFile("two.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );
    const inspectionCount = requestsOfType(worker, "select-image").length;

    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const firstProcess = await respondToProcessSelection(worker, inspectionCount);
    expect(requestsOfType(worker, "select-image")).toHaveLength(inspectionCount + 1);
    expect(screen.getByText("Processing 1 of 2")).toBeInTheDocument();

    await emitProcessed(worker, firstProcess);
    await waitFor(() =>
      expect(requestsOfType(worker, "select-image")).toHaveLength(inspectionCount + 2),
    );
    const secondSelection = requestsOfType(worker, "select-image").at(-1)!;
    await emitAndFlush(worker, {
      type: "image-selected",
      requestId: secondSelection.requestId,
      imageId: secondSelection.imageId,
      width: 1200,
      height: 800,
      sourceFormat: "JPEG",
    });
    await waitFor(() => expect(requestsOfType(worker, "process-image")).toHaveLength(2));
    await emitProcessed(worker, requestsOfType(worker, "process-image")[1]);

    await waitFor(() => expect(screen.getByText("2 images complete.")).toBeInTheDocument());
    expect(screen.getAllByRole("link", { name: "Download" })).toHaveLength(2);
  });

  it("recovers batch state when the worker crashes during processing", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("complete.jpg", "image/jpeg"), imageFile("active.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );
    const inspectionCount = requestsOfType(worker, "select-image").length;

    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const firstProcess = await respondToProcessSelection(worker, inspectionCount);
    await emitProcessed(worker, firstProcess);
    await waitFor(() =>
      expect(requestsOfType(worker, "select-image")).toHaveLength(
        inspectionCount + 2,
      ),
    );

    await crashAndFlush(worker);

    await waitFor(() =>
      expect(screen.getByText("Unable to initialise image tools")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Process batch" })).not.toHaveTextContent(
      "Processing batch…",
    );
    expect(screen.getByLabelText("Preset")).toBeEnabled();
    const completedArticle = screen.getByRole("article", { name: "complete.jpg" });
    expect(within(completedArticle).getByText("Complete")).toBeInTheDocument();
    expect(within(completedArticle).getByRole("link", { name: "Download" })).toBeInTheDocument();
    const activeArticle = screen.getByRole("article", { name: "active.jpg" });
    expect(within(activeArticle).queryByText("Processing")).not.toBeInTheDocument();
    expect(within(activeArticle).getByText("Failed")).toBeInTheDocument();
    expect(
      within(activeArticle).getByText(
        "The browser image worker stopped unexpectedly. Reload the page to try again.",
      ),
    ).toBeInTheDocument();
    expect(requestsOfType(worker, "process-image")).toHaveLength(1);
  });

  it("continues after a partial failure and keeps the failed image retryable", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("bad.jpg", "image/jpeg"), imageFile("good.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );
    const inspectionCount = requestsOfType(worker, "select-image").length;

    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const firstProcess = await respondToProcessSelection(worker, inspectionCount);
    await emitAndFlush(worker, {
      type: "error",
      requestId: firstProcess.requestId,
      stage: "processing",
      code: "PROCESSING_FAILED",
      message: "The first image could not be resized.",
    });

    await waitFor(() =>
      expect(requestsOfType(worker, "select-image")).toHaveLength(inspectionCount + 2),
    );
    const secondSelection = requestsOfType(worker, "select-image").at(-1)!;
    await emitAndFlush(worker, {
      type: "image-selected",
      requestId: secondSelection.requestId,
      imageId: secondSelection.imageId,
      width: 1200,
      height: 800,
      sourceFormat: "JPEG",
    });
    await waitFor(() => expect(requestsOfType(worker, "process-image")).toHaveLength(2));
    await emitProcessed(worker, requestsOfType(worker, "process-image")[1]);

    await waitFor(() =>
      expect(screen.getByText("1 complete, 1 failed. Failed images can be retried.")).toBeInTheDocument(),
    );
    expect(screen.getByText("The first image could not be resized.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry this image" })).toBeInTheDocument();
    const failedArticle = screen.getByRole("article", { name: "bad.jpg" });
    expect(within(failedArticle).getByLabelText("Output filename")).toBeVisible();
    expect(
      within(failedArticle).queryByRole("button", { name: /details for bad\.jpg/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
  });

  it("collapses a completed image while preserving its summary, download and edited values", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    const article = screen.getByRole("article", { name: "one.jpg" });
    await user.clear(within(article).getByLabelText("Output filename"));
    await user.type(within(article).getByLabelText("Output filename"), "Homepage Hero");
    await user.clear(within(article).getByLabelText("Title"));
    await user.type(within(article).getByLabelText("Title"), "Homepage portrait");
    await user.type(
      within(article).getByLabelText("Alt text for website"),
      "A portrait at sunset",
    );
    const inspectionCount = requestsOfType(worker, "select-image").length;

    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const processRequest = await respondToProcessSelection(worker, inspectionCount);
    await emitProcessed(worker, processRequest, "homepage-hero.jpg");
    await waitFor(() =>
      expect(screen.getByText("1 image complete.")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Process batch" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download all as ZIP (1)" }),
    ).toBeEnabled();

    const disclosure = within(article).getByRole("button", {
      name: "Edit details for one.jpg",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(within(article).queryByLabelText("Output filename")).not.toBeInTheDocument();
    expect(within(article).getByText("1600 × 1067 px")).toBeInTheDocument();
    expect(within(article).getByText("3 B")).toBeInTheDocument();
    expect(within(article).getByText("Format").nextElementSibling).toHaveTextContent(
      "JPEG",
    );
    expect(within(article).getByText("0.4 s")).toBeInTheDocument();
    expect(within(article).getByRole("link", { name: "Download" })).toHaveAttribute(
      "download",
      "homepage-hero.jpg",
    );

    await user.click(disclosure);
    expect(
      within(article).getByRole("button", { name: "Hide details for one.jpg" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(within(article).getByLabelText("Output filename")).toHaveValue(
      "homepage-hero.jpg",
    );
    expect(within(article).getByLabelText("Title")).toHaveValue(
      "Homepage portrait",
    );
    expect(within(article).getByLabelText("Alt text for website")).toHaveValue(
      "A portrait at sunset",
    );
    expect(within(article).getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("propagates shared settings, metadata, title, alt text and unique edited names", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg"), imageFile("two.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );

    await user.selectOptions(screen.getByLabelText("Output format"), "WebP");
    await user.clear(screen.getByLabelText("Creator / Business"));
    await user.type(screen.getByLabelText("Creator / Business"), "Blackburn Studio");
    await user.clear(screen.getByLabelText("Copyright"));
    await user.type(screen.getByLabelText("Copyright"), "© 2026 Blackburn Studio");
    await user.click(screen.getByLabelText(/Strip existing metadata/));
    const names = screen.getAllByLabelText("Output filename");
    await user.clear(names[0]);
    await user.type(names[0], "Hero Image");
    await user.clear(names[1]);
    await user.type(names[1], "hero image");
    const titles = screen.getAllByLabelText("Title");
    await user.clear(titles[0]);
    await user.type(titles[0], "Homepage hero");
    await user.type(screen.getAllByLabelText("Alt text for website")[0], "A family outdoors");

    const inspectionCount = requestsOfType(worker, "select-image").length;
    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const request = await respondToProcessSelection(worker, inspectionCount);

    expect(request).toMatchObject({
      outputFormat: "WebP",
      outputFilename: "hero-image.webp",
      title: "Homepage hero",
      altText: "A family outdoors",
      creator: "Blackburn Studio",
      copyright: "© 2026 Blackburn Studio",
      stripMetadata: false,
      neverEnlarge: true,
      quality: 85,
    });
    await emitProcessed(worker, request);

    await waitFor(() =>
      expect(requestsOfType(worker, "select-image")).toHaveLength(inspectionCount + 2),
    );
    const secondSelection = requestsOfType(worker, "select-image").at(-1)!;
    await emitAndFlush(worker, {
      type: "image-selected",
      requestId: secondSelection.requestId,
      imageId: secondSelection.imageId,
      width: 1200,
      height: 800,
      sourceFormat: "JPEG",
    });
    await waitFor(() => expect(requestsOfType(worker, "process-image")).toHaveLength(2));
    expect(requestsOfType(worker, "process-image")[1].outputFilename).toBe("hero-image-2.webp");
  });

  it("persists creator and copyright defaults locally", async () => {
    window.localStorage.setItem("blackburn-image-resizer-creator", "Saved Creator");
    window.localStorage.setItem("blackburn-image-resizer-copyright", "Saved Copyright");
    const { worker } = renderApp();
    emitReady(worker);

    await waitFor(() =>
      expect(screen.getByLabelText("Creator / Business")).toHaveValue("Saved Creator"),
    );
    expect(screen.getByLabelText("Copyright")).toHaveValue("Saved Copyright");

    await userEvent.clear(screen.getByLabelText("Creator / Business"));
    await userEvent.type(screen.getByLabelText("Creator / Business"), "New Creator");
    expect(window.localStorage.getItem("blackburn-image-resizer-creator")).toBe("New Creator");
  });

  it("copies per-file alt text as a web-use companion field", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    await user.type(screen.getByLabelText("Alt text for website"), "Portrait at sunset");
    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith("Portrait at sunset");
    expect(screen.getByText("Alt text copied.")).toBeInTheDocument();
  });

  it("creates a ZIP containing successful results only", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("bad.jpg", "image/jpeg"), imageFile("good.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );
    const inspectionCount = requestsOfType(worker, "select-image").length;
    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const firstProcess = await respondToProcessSelection(worker, inspectionCount);
    await emitAndFlush(worker, {
      type: "error",
      requestId: firstProcess.requestId,
      stage: "processing",
      code: "PROCESSING_FAILED",
      message: "Failed",
    });
    await waitFor(() => expect(requestsOfType(worker, "select-image")).toHaveLength(inspectionCount + 2));
    const selection = requestsOfType(worker, "select-image").at(-1)!;
    await emitAndFlush(worker, { type: "image-selected", requestId: selection.requestId, imageId: selection.imageId, width: 1200, height: 800, sourceFormat: "JPEG" });
    await waitFor(() => expect(requestsOfType(worker, "process-image")).toHaveLength(2));
    await emitProcessed(worker, requestsOfType(worker, "process-image")[1]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Download all as ZIP (1)" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Download all as ZIP (1)" }));
    await waitFor(() => expect(requestsOfType(worker, "create-zip")).toHaveLength(1));
    const zipRequest = requestsOfType(worker, "create-zip")[0];
    expect(zipRequest.entries).toHaveLength(1);
    expect(zipRequest.entries[0].fileName).toContain("good");
    await emitAndFlush(worker, { type: "zip-created", requestId: zipRequest.requestId, bytes: new Uint8Array([80, 75]).buffer, fileCount: 1 });

    await waitFor(() => expect(screen.getByRole("link", { name: "Download ZIP again" })).toBeInTheDocument());
  });

  it("keeps individual downloads available when ZIP creation fails", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    const inspectionCount = requestsOfType(worker, "select-image").length;

    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const processRequest = await respondToProcessSelection(worker, inspectionCount);
    await emitProcessed(worker, processRequest);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Download all as ZIP (1)" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Download all as ZIP (1)" }));
    await waitFor(() => expect(requestsOfType(worker, "create-zip")).toHaveLength(1));
    const zipRequest = requestsOfType(worker, "create-zip")[0];
    await emitAndFlush(worker, {
      type: "error",
      requestId: zipRequest.requestId,
      stage: "zip",
      code: "ZIP_CREATION_FAILED",
      message: "The archive could not be created. Download images individually instead.",
    });

    expect(
      await screen.findByText(
        "The archive could not be created. Download images individually instead.",
      ),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download all as ZIP (1)" })).toBeEnabled();
  });

  it("clears ZIP creation and fails future requests immediately after a worker crash", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    const inspectionCount = requestsOfType(worker, "select-image").length;
    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const processRequest = await respondToProcessSelection(worker, inspectionCount);
    await emitProcessed(worker, processRequest);
    const zipButton = await screen.findByRole("button", {
      name: "Download all as ZIP (1)",
    });

    await user.click(zipButton);
    await waitFor(() => expect(requestsOfType(worker, "create-zip")).toHaveLength(1));
    expect(screen.getByRole("button", { name: "Creating ZIP…" })).toBeDisabled();
    await crashAndFlush(worker);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Download all as ZIP (1)" })).toBeEnabled(),
    );
    expect(screen.queryByRole("button", { name: "Creating ZIP…" })).not.toBeInTheDocument();
    expect(
      screen.getAllByText(
        "The browser image worker stopped unexpectedly. Reload the page to try again.",
      ).length,
    ).toBeGreaterThanOrEqual(2);

    await user.click(screen.getByRole("button", { name: "Download all as ZIP (1)" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Download all as ZIP (1)" })).toBeEnabled(),
    );
    expect(requestsOfType(worker, "create-zip")).toHaveLength(1);
  });

  it("ignores stale worker responses", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    const inspectionCount = requestsOfType(worker, "select-image").length;
    await user.click(screen.getByRole("button", { name: "Process batch" }));
    await waitFor(() => expect(requestsOfType(worker, "select-image")).toHaveLength(inspectionCount + 1));
    const current = requestsOfType(worker, "select-image").at(-1)!;

    await emitAndFlush(worker, { type: "image-selected", requestId: "stale", imageId: current.imageId, width: 1, height: 1, sourceFormat: "JPEG" });
    expect(requestsOfType(worker, "process-image")).toHaveLength(0);

    await emitAndFlush(worker, { type: "image-selected", requestId: current.requestId, imageId: current.imageId, width: 1200, height: 800, sourceFormat: "JPEG" });
    await waitFor(() => expect(requestsOfType(worker, "process-image")).toHaveLength(1));
  });

  it("defaults to Resize only and reveals accessible crop controls when enabled", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    expect(screen.getByLabelText("Resize only")).toBeChecked();
    expect(screen.queryByLabelText("Crop ratio")).not.toBeInTheDocument();

    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    await user.click(screen.getByLabelText("Crop & resize"));

    expect(
      screen.queryByText(/Crop coordinates stay in this browser/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Drag the image to reposition it, then use Zoom to adjust the framing.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Crop ratio")).toHaveValue("original");
    expect(screen.getByLabelText(/Zoom/)).toHaveValue("1");
    expect(screen.getByRole("button", { name: "Reset crop" })).toBeEnabled();
    expect(screen.getByText("Image 1 of 1")).toBeInTheDocument();
  });

  it("enables queue crops, navigates to the editor and preserves existing crop state", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg"), imageFile("two.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );
    const cropEditor = screen.getByRole("region", { name: "Crop editor" });
    const firstArticle = screen.getByRole("article", { name: "one.jpg" });
    const secondArticle = screen.getByRole("article", { name: "two.jpg" });

    expect(
      within(secondArticle).getByRole("button", { name: "Set crop for two.jpg" }),
    ).toHaveTextContent("Set crop");
    expect(
      within(firstArticle).getByRole("button", { name: "Set crop for one.jpg" }),
    ).toHaveTextContent("Set crop");

    await user.click(
      within(secondArticle).getByRole("button", { name: "Set crop for two.jpg" }),
    );
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(cropEditor).toHaveFocus();
    expect(within(cropEditor).getByText("two.jpg")).toBeInTheDocument();
    expect(within(cropEditor).getByLabelText("Crop & resize")).toBeChecked();
    expect(
      within(secondArticle).getByRole("button", { name: "Edit crop for two.jpg" }),
    ).toHaveTextContent("Editing crop");

    await user.selectOptions(within(cropEditor).getByLabelText("Crop ratio"), "16:9");
    fireEvent.change(within(cropEditor).getByLabelText(/Zoom/), {
      target: { value: "1.25" },
    });

    await user.click(
      within(firstArticle).getByRole("button", { name: "Set crop for one.jpg" }),
    );
    expect(within(cropEditor).getByText("one.jpg")).toBeInTheDocument();
    expect(
      within(secondArticle).getByRole("button", { name: "Edit crop for two.jpg" }),
    ).toHaveTextContent("Edit crop");

    await user.click(
      within(secondArticle).getByRole("button", { name: "Edit crop for two.jpg" }),
    );
    expect(cropEditor).toHaveFocus();
    expect(within(cropEditor).getByText("two.jpg")).toBeInTheDocument();
    expect(within(cropEditor).getByLabelText("Crop & resize")).toBeChecked();
    expect(within(cropEditor).getByLabelText("Crop ratio")).toHaveValue("16:9");
    expect(within(cropEditor).getByLabelText(/Zoom/)).toHaveValue("1.25");

    vi.mocked(HTMLElement.prototype.scrollIntoView).mockClear();
    await user.click(
      within(secondArticle).getByRole("button", { name: "Edit crop for two.jpg" }),
    );
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(cropEditor).toHaveFocus();
    expect(
      within(secondArticle).getByRole("button", { name: "Edit crop for two.jpg" }),
    ).toHaveTextContent("Editing crop");
  });

  it("shows a transient navigation highlight for every activation method", async () => {
    const { worker, unmount } = renderApp();
    emitReady(worker);
    await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg"), imageFile("two.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );
    const cropEditor = screen.getByRole("region", { name: "Crop editor" });
    const firstAction = within(
      screen.getByRole("article", { name: "one.jpg" }),
    ).getByRole("button", { name: "Set crop for one.jpg" });
    const secondAction = within(
      screen.getByRole("article", { name: "two.jpg" }),
    ).getByRole("button", { name: "Set crop for two.jpg" });
    vi.useFakeTimers();

    fireEvent.click(secondAction, { detail: 1 });
    expect(cropEditor).toHaveAttribute("data-navigation-highlight", "true");
    expect(cropEditor).toHaveFocus();
    expect(within(cropEditor).getByText("two.jpg")).toBeInTheDocument();
    expect(within(cropEditor).getByLabelText("Crop & resize")).toBeChecked();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(firstAction, { detail: 0 });
    expect(cropEditor).toHaveAttribute("data-navigation-highlight", "true");
    expect(within(cropEditor).getByText("one.jpg")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(cropEditor).toHaveAttribute("data-navigation-highlight", "true");
    act(() => vi.advanceTimersByTime(800));
    expect(cropEditor).toHaveAttribute("data-navigation-highlight", "false");

    fireEvent.click(firstAction, { detail: 1 });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("invalidates a completed resize-only result when Set crop is used", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    const inspectionCount = requestsOfType(worker, "select-image").length;

    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const processRequest = await respondToProcessSelection(worker, inspectionCount);
    await emitProcessed(worker, processRequest);
    const download = await screen.findByRole("link", { name: "Download" });
    const staleUrl = download.getAttribute("href");

    await user.click(
      within(screen.getByRole("article", { name: "one.jpg" })).getByRole(
        "button",
        { name: "Set crop for one.jpg" },
      ),
    );

    expect(screen.getByLabelText("Crop & resize")).toBeChecked();
    expect(screen.queryByRole("link", { name: "Download" })).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(staleUrl);
    expect(screen.getByRole("button", { name: "Process batch" })).toBeEnabled();
  });

  it("blocks an undecodable crop preview and revokes its local Object URL", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    await user.click(screen.getByLabelText("Crop & resize"));
    const preview = screen.getByLabelText(/Interactive crop preview for one\.jpg/);
    fireEvent.error(preview.querySelector("img")!);

    expect(
      screen.getByText("This image could not be decoded for crop preview."),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByRole("button", { name: "Process batch" })).toBeDisabled();

    await user.click(screen.getByLabelText("Resize only"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result-1");
    expect(screen.getByRole("button", { name: "Process batch" })).toBeEnabled();
  });

  it("changes ratios and restores independent crop state with Previous and Next", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg"), imageFile("two.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );

    expect(screen.getByText("Image 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    await user.click(screen.getByLabelText("Crop & resize"));
    await user.selectOptions(screen.getByLabelText("Crop ratio"), "1:1");
    expect(
      within(screen.getByRole("article", { name: "one.jpg" })).getByText(
        "1:1 crop",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Image 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByLabelText("Resize only")).toBeChecked();
    expect(
      within(screen.getByRole("article", { name: "two.jpg" })).getByRole(
        "button",
        { name: "Set crop for two.jpg" },
      ),
    ).toHaveTextContent("Set crop");
    await user.click(screen.getByLabelText("Crop & resize"));
    await user.selectOptions(screen.getByLabelText("Crop ratio"), "4:5");
    expect(screen.getByLabelText("Crop ratio")).toHaveValue("4:5");

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByLabelText("Crop & resize")).toBeChecked();
    expect(screen.getByLabelText("Crop ratio")).toHaveValue("1:1");
  });

  it("invalidates and revokes a completed cropped result after a crop edit", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    await user.click(screen.getByLabelText("Crop & resize"));
    await user.selectOptions(screen.getByLabelText("Crop ratio"), "1:1");

    const inspectionCount = requestsOfType(worker, "select-image").length;
    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const processRequest = await respondToProcessSelection(worker, inspectionCount);
    expect(processRequest.crop).toMatchObject({
      x: expect.any(Number),
      y: 0,
      width: expect.any(Number),
      height: 1,
    });
    await emitProcessed(worker, processRequest);
    const download = await screen.findByRole("link", { name: "Download" });
    const staleUrl = download.getAttribute("href");
    expect(
      within(screen.getByRole("article", { name: "one.jpg" })).getByText(
        "1:1 crop",
      ),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Crop ratio"), "16:9");
    expect(screen.queryByRole("link", { name: "Download" })).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(staleUrl);
    expect(screen.getByRole("button", { name: "Process batch" })).toBeEnabled();
  });

  it("invalidates completed output and ZIP while a custom crop ratio is invalid", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    await user.click(screen.getByLabelText("Crop & resize"));
    await user.selectOptions(screen.getByLabelText("Crop ratio"), "custom");
    fireEvent.change(screen.getByLabelText("Custom ratio width"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Custom ratio height"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText(/Zoom/), {
      target: { value: "1.25" },
    });

    const inspectionCount = requestsOfType(worker, "select-image").length;
    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const processRequest = await respondToProcessSelection(worker, inspectionCount);
    await emitProcessed(worker, processRequest);
    const download = await screen.findByRole("link", { name: "Download" });
    const staleResultUrl = download.getAttribute("href");

    await user.click(
      screen.getByRole("button", { name: "Download all as ZIP (1)" }),
    );
    await waitFor(() =>
      expect(requestsOfType(worker, "create-zip")).toHaveLength(1),
    );
    const zipRequest = requestsOfType(worker, "create-zip")[0];
    await emitAndFlush(worker, {
      type: "zip-created",
      requestId: zipRequest.requestId,
      bytes: new Uint8Array([80, 75]).buffer,
      fileCount: 1,
    });
    const zipDownload = await screen.findByRole("link", {
      name: "Download ZIP again",
    });
    const staleZipUrl = zipDownload.getAttribute("href");
    vi.mocked(URL.revokeObjectURL).mockClear();

    await user.clear(screen.getByLabelText("Custom ratio width"));

    const article = screen.getByRole("article", { name: "one.jpg" });
    expect(screen.queryByRole("link", { name: "Download" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Download ZIP again" }),
    ).not.toBeInTheDocument();
    expect(within(article).getByText("Queued")).toBeInTheDocument();
    expect(
      within(article).getByRole("button", { name: "Hide details for one.jpg" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Crop & resize")).toBeChecked();
    expect(screen.getByLabelText("Custom ratio width")).toHaveValue(null);
    expect(screen.getByLabelText("Custom ratio height")).toHaveValue(5);
    expect(screen.getByLabelText(/Zoom/)).toHaveValue("1.25");
    expect(screen.getByRole("button", { name: "Process batch" })).toBeDisabled();

    const revokedUrls = vi
      .mocked(URL.revokeObjectURL)
      .mock.calls.map(([url]) => url);
    expect(revokedUrls.filter((url) => url === staleResultUrl)).toHaveLength(1);
    expect(revokedUrls.filter((url) => url === staleZipUrl)).toHaveLength(1);

    const predictionCount = requestsOfType(worker, "predict-crop").length;
    fireEvent.change(screen.getByLabelText("Custom ratio width"), {
      target: { value: "4" },
    });
    expect(screen.getByLabelText("Custom ratio width")).toHaveValue(4);
    expect(screen.getByRole("button", { name: "Process batch" })).toBeEnabled();
    await waitFor(() =>
      expect(requestsOfType(worker, "predict-crop").length).toBeGreaterThan(
        predictionCount,
      ),
    );
  });

  it("reset restores minimum zoom and Apply ratio to all recenters each image", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg"), imageFile("two.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );
    await user.click(screen.getByLabelText("Crop & resize"));
    await user.selectOptions(screen.getByLabelText("Crop ratio"), "1:1");
    fireEvent.change(screen.getByLabelText(/Zoom/), { target: { value: "2" } });
    expect(screen.getByLabelText(/Zoom/)).toHaveValue("2");
    await user.click(screen.getByRole("button", { name: "Reset crop" }));
    expect(screen.getByLabelText(/Zoom/)).toHaveValue("1");

    await user.selectOptions(screen.getByLabelText("Crop ratio"), "4:5");
    await user.click(screen.getByRole("button", { name: "Apply ratio to all" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Resize only")).toBeChecked();
    await user.click(screen.getByLabelText("Crop & resize"));
    expect(screen.getByLabelText("Crop ratio")).toHaveValue("4:5");
    expect(screen.getByLabelText(/Zoom/)).toHaveValue("1");
  });

  it("sends per-image crops only for cropped images in a mixed sequential batch", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("cropped.jpg", "image/jpeg"), imageFile("resize.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );
    await user.click(screen.getByLabelText("Crop & resize"));
    await user.selectOptions(screen.getByLabelText("Crop ratio"), "1:1");
    const inspectionCount = requestsOfType(worker, "select-image").length;

    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const firstRequest = await respondToProcessSelection(worker, inspectionCount);
    expect(firstRequest.crop).toBeDefined();
    await emitProcessed(worker, firstRequest);
    await waitFor(() =>
      expect(requestsOfType(worker, "select-image")).toHaveLength(
        inspectionCount + 2,
      ),
    );
    const secondSelection = requestsOfType(worker, "select-image").at(-1)!;
    await emitAndFlush(worker, {
      type: "image-selected",
      requestId: secondSelection.requestId,
      imageId: secondSelection.imageId,
      width: 2000,
      height: 1300,
      sourceFormat: "JPEG",
    });
    await waitFor(() =>
      expect(requestsOfType(worker, "process-image")).toHaveLength(2),
    );
    expect(requestsOfType(worker, "process-image")[1].crop).toBeUndefined();
  });

  it("shows shared predicted crop and output dimensions", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    await user.click(screen.getByLabelText("Crop & resize"));
    await user.selectOptions(screen.getByLabelText("Crop ratio"), "1:1");
    await waitFor(() =>
      expect(requestsOfType(worker, "predict-crop")).toHaveLength(1),
    );
    const prediction = requestsOfType(worker, "predict-crop")[0];
    await emitAndFlush(worker, {
      type: "crop-predicted",
      requestId: prediction.requestId,
      imageId: prediction.imageId,
      cropWidth: 1600,
      cropHeight: 1600,
      outputWidth: 1600,
      outputHeight: 1600,
    });

    expect(screen.getAllByText("1600 × 1600")).toHaveLength(2);
  });

  it("ignores an in-flight crop prediction after crop is disabled", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );

    vi.useFakeTimers();
    fireEvent.click(screen.getByLabelText("Crop & resize"));
    await advanceCropPredictionDebounce();
    const prediction = requestsOfType(worker, "predict-crop")[0];
    expect(prediction).toBeDefined();

    fireEvent.click(screen.getByLabelText("Resize only"));
    await emitAndFlush(worker, {
      type: "crop-predicted",
      requestId: prediction.requestId,
      imageId: prediction.imageId,
      cropWidth: 999,
      cropHeight: 999,
      outputWidth: 999,
      outputHeight: 999,
    });
    fireEvent.click(screen.getByLabelText("Crop & resize"));

    expect(screen.getAllByText("…")).toHaveLength(2);
    expect(screen.queryByText("999 × 999")).not.toBeInTheDocument();
    expect(requestsOfType(worker, "predict-crop")).toHaveLength(1);
  });

  it("ignores an in-flight crop prediction after the long edge becomes invalid", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    await user.selectOptions(screen.getByLabelText("Preset"), "custom");

    vi.useFakeTimers();
    fireEvent.click(screen.getByLabelText("Crop & resize"));
    await advanceCropPredictionDebounce();
    const prediction = requestsOfType(worker, "predict-crop")[0];
    expect(prediction).toBeDefined();

    fireEvent.change(screen.getByLabelText("Custom long edge (px)"), {
      target: { value: "0" },
    });
    await emitAndFlush(worker, {
      type: "crop-predicted",
      requestId: prediction.requestId,
      imageId: prediction.imageId,
      cropWidth: 888,
      cropHeight: 888,
      outputWidth: 888,
      outputHeight: 888,
    });

    expect(screen.getAllByText("…")).toHaveLength(2);
    expect(screen.queryByText("888 × 888")).not.toBeInTheDocument();
    expect(requestsOfType(worker, "predict-crop")).toHaveLength(1);
  });

  it("preserves the selected image debounce when an unrelated item is removed", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg"), imageFile("two.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );
    const selectedImageId = requestsOfType(worker, "select-image")[0].imageId;

    vi.useFakeTimers();
    fireEvent.click(screen.getByLabelText("Crop & resize"));
    fireEvent.click(screen.getByRole("button", { name: "Remove two.jpg" }));
    await advanceCropPredictionDebounce();

    const predictions = requestsOfType(worker, "predict-crop");
    expect(predictions).toHaveLength(1);
    expect(predictions[0].imageId).toBe(selectedImageId);
    await emitAndFlush(worker, {
      type: "crop-predicted",
      requestId: predictions[0].requestId,
      imageId: predictions[0].imageId,
      cropWidth: 1000,
      cropHeight: 800,
      outputWidth: 1000,
      outputHeight: 800,
    });

    expect(screen.queryByText("two.jpg")).not.toBeInTheDocument();
    expect(screen.getAllByText("1000 × 800")).toHaveLength(2);
  });

  it("reselects and predicts the next eligible image when the selected item is removed", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg"), imageFile("two.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );
    const secondImageId = requestsOfType(worker, "select-image")[1].imageId;

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByLabelText("Crop & resize"));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByLabelText("Crop & resize"));
    fireEvent.click(screen.getByRole("button", { name: "Remove one.jpg" }));
    await advanceCropPredictionDebounce();

    expect(screen.getByRole("article", { name: "two.jpg" })).toBeInTheDocument();
    expect(screen.getByText("Image 1 of 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Crop & resize")).toBeChecked();
    const predictions = requestsOfType(worker, "predict-crop");
    expect(predictions).toHaveLength(1);
    expect(predictions[0].imageId).toBe(secondImageId);
    expect(screen.getAllByText("…")).toHaveLength(2);

    await emitAndFlush(worker, {
      type: "crop-predicted",
      requestId: predictions[0].requestId,
      imageId: predictions[0].imageId,
      cropWidth: 900,
      cropHeight: 700,
      outputWidth: 900,
      outputHeight: 700,
    });
    expect(screen.getAllByText("900 × 700")).toHaveLength(2);
  });

  it("ignores an in-flight crop prediction after its item is removed", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg"), imageFile("two.jpg", "image/jpeg")],
      ["JPEG", "JPEG"],
    );

    vi.useFakeTimers();
    fireEvent.click(screen.getByLabelText("Crop & resize"));
    await advanceCropPredictionDebounce();
    const prediction = requestsOfType(worker, "predict-crop")[0];
    fireEvent.click(screen.getByRole("button", { name: "Remove one.jpg" }));
    await emitAndFlush(worker, {
      type: "crop-predicted",
      requestId: prediction.requestId,
      imageId: prediction.imageId,
      cropWidth: 777,
      cropHeight: 666,
      outputWidth: 777,
      outputHeight: 666,
    });

    expect(screen.queryByText("one.jpg")).not.toBeInTheDocument();
    expect(screen.getAllByText("two.jpg").length).toBeGreaterThan(0);
    expect(screen.queryByText("777 × 666")).not.toBeInTheDocument();
    expect(screen.getByText("1 file")).toBeInTheDocument();
  });

  it("cancels the pending crop prediction when the final image is removed", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );

    vi.useFakeTimers();
    fireEvent.click(screen.getByLabelText("Crop & resize"));
    fireEvent.click(screen.getByRole("button", { name: "Remove one.jpg" }));
    await advanceCropPredictionDebounce();

    expect(requestsOfType(worker, "predict-crop")).toHaveLength(0);
    expect(screen.getByText("0 files")).toBeInTheDocument();
    expect(
      screen.getByText("Add a readable image to start a crop preview."),
    ).toBeInTheDocument();
  });

  it("revokes result URLs and terminates the worker on teardown", async () => {
    const { worker, unmount } = renderApp();
    emitReady(worker);
    const user = await uploadAndInspect(
      worker,
      [imageFile("one.jpg", "image/jpeg")],
      ["JPEG"],
    );
    const inspectionCount = requestsOfType(worker, "select-image").length;
    await user.click(screen.getByRole("button", { name: "Process batch" }));
    const processRequest = await respondToProcessSelection(worker, inspectionCount);
    await emitProcessed(worker, processRequest);
    await waitFor(() => expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument());

    unmount();
    expect(worker.terminated).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result-1");
  });
});
