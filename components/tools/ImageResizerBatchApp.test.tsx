import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

async function uploadAndInspect(
  worker: MockWorker,
  files: File[],
  formats: Array<"JPEG" | "PNG" | "WebP">,
) {
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText(/Select images|Add more images/),
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
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  it("preserves preparing, ready and initialization error states", async () => {
    const { worker } = renderApp();
    expect(screen.getByText("Preparing image tools…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Process batch" })).toBeDisabled();

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
    await waitFor(() => expect(screen.getByText("Ready")).toBeInTheDocument());
    expect(screen.getByText("Started in 1.4 seconds")).toBeInTheDocument();
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

    expect(screen.getByText("3 files")).toBeInTheDocument();
    expect(screen.getByText("one.jpg")).toBeInTheDocument();
    expect(screen.getByText("two.png")).toBeInTheDocument();
    expect(screen.getByText("three.webp")).toBeInTheDocument();
    expect(requestsOfType(worker, "select-image")).toHaveLength(3);
    expect(worker.transfers.filter((transfer) => transfer.length === 1)).toHaveLength(3);
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
    expect(screen.getByText("3 files")).toBeInTheDocument();
    expect(screen.getByText("later.webp")).toBeInTheDocument();
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
