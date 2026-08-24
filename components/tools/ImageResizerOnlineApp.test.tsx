import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ImageResizerOnlineApp from "@/components/tools/ImageResizerOnlineApp";
import type {
  ImageResizerWorkerRequest,
  ImageResizerWorkerResponse,
} from "@/components/tools/imageResizerWorkerProtocol";

class MockWorker {
  messages: ImageResizerWorkerRequest[] = [];
  transfers: Transferable[][] = [];
  terminated = false;
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
  }

  emit(message: ImageResizerWorkerResponse | unknown) {
    const event = { data: message } as MessageEvent<unknown>;
    this.messageListeners.forEach((listener) => listener(event));
  }
}

function renderApp() {
  const worker = new MockWorker();
  const view = render(
    <ImageResizerOnlineApp workerFactory={() => worker as unknown as Worker} />,
  );
  return { worker, ...view };
}

function initializeRequest(worker: MockWorker) {
  return worker.messages.find(
    (message): message is Extract<
      ImageResizerWorkerRequest,
      { type: "initialize" }
    > => message.type === "initialize",
  )!;
}

function emitReady(worker: MockWorker, webp = true) {
  const request = initializeRequest(worker);
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

function imageFile(name = "portrait.jpg", type = "image/jpeg") {
  const file = new File([new Uint8Array([1, 2, 3, 4])], name, { type });
  Object.defineProperty(file, "arrayBuffer", {
    value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
  });
  return file;
}

async function selectValidImage(worker: MockWorker) {
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText("Select image"), imageFile());

  await waitFor(() => {
    expect(
      worker.messages.some((message) => message.type === "select-image"),
    ).toBe(true);
  });

  const request = worker.messages.findLast(
    (message): message is Extract<
      ImageResizerWorkerRequest,
      { type: "select-image" }
    > => message.type === "select-image",
  )!;
  act(() => {
    worker.emit({
      type: "image-selected",
      requestId: request.requestId,
      imageId: request.imageId,
      width: 2400,
      height: 1600,
      sourceFormat: "JPEG",
    });
  });
  return { user, request };
}

describe("ImageResizerOnlineApp", () => {
  beforeEach(() => {
    Object.defineProperties(URL, {
      createObjectURL: {
        configurable: true,
        value: vi.fn(() => "blob:resized-image"),
      },
      revokeObjectURL: {
        configurable: true,
        value: vi.fn(),
      },
    });
  });

  it("shows the preparing and no-image-selected states initially", () => {
    const { worker } = renderApp();

    expect(screen.getByText("Preparing image tools…")).toBeInTheDocument();
    expect(screen.getByText("Select an image to continue.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resize image" })).toBeDisabled();
    expect(initializeRequest(worker)).toBeDefined();
  });

  it("shows ready after successful runtime initialization", () => {
    const { worker } = renderApp();
    emitReady(worker);

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Started in 1.4 seconds")).toBeInTheDocument();
  });

  it("shows a useful runtime initialization error and retry action", async () => {
    const { worker } = renderApp();
    const request = initializeRequest(worker);

    act(() => {
      worker.emit({
        type: "error",
        requestId: request.requestId,
        stage: "initialization",
        code: "MANIFEST_FETCH_FAILED",
        message: "The image tools manifest could not be downloaded.",
      });
    });

    expect(
      screen.getByText("Unable to initialise image tools"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The image tools manifest could not be downloaded."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      worker.messages.filter((message) => message.type === "initialize"),
    ).toHaveLength(2);
  });

  it("reflects WebP capability in the output format control", () => {
    const { worker } = renderApp();
    emitReady(worker, false);

    expect(screen.getByRole("option", { name: /WebP — unavailable/ })).toBeDisabled();
    expect(
      screen.getByText(
        "WebP output is unavailable in the loaded browser runtime.",
      ),
    ).toBeInTheDocument();
  });

  it("transfers the selected image, displays dimensions and enters processing", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const { user } = await selectValidImage(worker);

    expect(screen.getByText("portrait.jpg")).toBeInTheDocument();
    expect(screen.getByText("2400 × 1600 px")).toBeInTheDocument();
    const selectMessageIndex = worker.messages.findIndex(
      (message) => message.type === "select-image",
    );
    expect(worker.transfers[selectMessageIndex]).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Resize image" }));
    expect(
      screen.getByRole("button", { name: "Resizing image…" }),
    ).toBeDisabled();
    expect(worker.messages.at(-1)).toMatchObject({
      type: "process-image",
      longEdge: 1600,
      neverEnlarge: true,
      outputFormat: "original",
      quality: 85,
    });
  });

  it("creates a download link only after a current successful result", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const { user, request: selectionRequest } = await selectValidImage(worker);
    expect(
      screen.queryByRole("link", { name: "Download resized image" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resize image" }));
    const processRequest = worker.messages.at(-1) as Extract<
      ImageResizerWorkerRequest,
      { type: "process-image" }
    >;

    act(() => {
      worker.emit({
        type: "processed",
        requestId: "stale-process-request",
        imageId: selectionRequest.imageId,
        bytes: new Uint8Array([8, 9]).buffer,
        suggestedFilename: "stale.jpg",
        originalWidth: 2400,
        originalHeight: 1600,
        width: 1600,
        height: 1067,
        outputFormat: "JPEG",
        processingMs: 90,
      });
    });
    expect(
      screen.queryByRole("link", { name: "Download resized image" }),
    ).not.toBeInTheDocument();

    act(() => {
      worker.emit({
        type: "processed",
        requestId: processRequest.requestId,
        imageId: selectionRequest.imageId,
        bytes: new Uint8Array([8, 9, 10]).buffer,
        suggestedFilename: "portrait-long-edge-1600.jpg",
        originalWidth: 2400,
        originalHeight: 1600,
        width: 1600,
        height: 1067,
        outputFormat: "JPEG",
        processingMs: 410,
      });
    });

    expect(
      screen.getByRole("link", { name: "Download resized image" }),
    ).toHaveAttribute("href", "blob:resized-image");
    expect(
      screen.getByRole("link", { name: "Download resized image" }),
    ).toHaveAttribute("download", "portrait-long-edge-1600.jpg");
    expect(screen.getByText("1600 × 1067 px")).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it("shows a processing failure without creating a download", async () => {
    const { worker } = renderApp();
    emitReady(worker);
    const { user } = await selectValidImage(worker);
    await user.click(screen.getByRole("button", { name: "Resize image" }));
    const processRequest = worker.messages.at(-1) as Extract<
      ImageResizerWorkerRequest,
      { type: "process-image" }
    >;

    act(() => {
      worker.emit({
        type: "error",
        requestId: processRequest.requestId,
        stage: "processing",
        code: "PROCESSING_FAILED",
        message: "The image could not be resized.",
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The image could not be resized.",
    );
    expect(
      screen.queryByRole("link", { name: "Download resized image" }),
    ).not.toBeInTheDocument();
  });
});