import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClientGallery } from "./ClientGallery";
import { ClientGalleryActions } from "./ClientGalleryActions";
import {
  prepareGalleryZip,
  preparePhotoShare,
} from "@/lib/client-galleries/downloads";
import {
  getSampleClientGallery,
  SAMPLE_CLIENT_GALLERY_ID,
} from "@/lib/client-galleries/fixtures/sampleClientGallery";

vi.mock("@/lib/client-galleries/downloads", () => ({
  prepareGalleryZip: vi.fn(),
  preparePhotoShare: vi.fn(),
}));
const sample = getSampleClientGallery(SAMPLE_CLIENT_GALLERY_ID)!;
const gallery = {
  ...sample,
  assets: sample.assets.slice(0, 3).map((asset) => ({
    ...asset,
    webDownloadUrl: `/api/galleries/${sample.id}/assets/${asset.id}/web`,
    fullDownloadUrl: `/api/galleries/${sample.id}/assets/${asset.id}/full`,
  })),
};
const createUrl = vi.fn(() => "blob:zip");
const revokeUrl = vi.fn();
beforeEach(() => {
  vi.mocked(prepareGalleryZip).mockReset();
  vi.mocked(preparePhotoShare).mockReset();
  createUrl.mockClear();
  revokeUrl.mockClear();
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: createUrl,
      revokeObjectURL: revokeUrl,
    }),
  );
});
afterEach(() => {
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "canShare");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("selects individual photos or all, clears selection, and packages only the chosen web copies", async () => {
  vi.mocked(prepareGalleryZip).mockResolvedValue(new Blob(["zip"]));
  render(<ClientGallery gallery={gallery} />);
  const download = screen.getByRole("button", {
    name: "Download selected · web",
  });
  expect(download).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Select all" }));
  expect(
    screen
      .getAllByRole("checkbox")
      .every((input) => (input as HTMLInputElement).checked),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
  expect(download).toBeDisabled();
  fireEvent.click(screen.getAllByRole("checkbox")[1]);
  fireEvent.click(download);
  const save = await screen.findByRole("link", { name: "Save ZIP · 1 photo" });
  expect(prepareGalleryZip).toHaveBeenCalledWith(
    gallery.id,
    [gallery.assets[1]],
    "web",
    expect.any(AbortSignal),
    expect.any(Function),
  );
  expect(save).toHaveAttribute("href", "blob:zip");
  expect(save).toHaveAttribute("download", expect.stringContaining("-web.zip"));
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(
    screen.queryByRole("link", { name: /Save ZIP/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Selection changed");
});

it("aborts ZIP preparation on leaving the gallery and never exposes a late download", async () => {
  let finish!: (value: Blob) => void;
  vi.mocked(prepareGalleryZip).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const view = render(<ClientGallery gallery={gallery} />);
  fireEvent.click(screen.getByRole("button", { name: "Select all" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Download selected · full resolution" }),
  );
  const signal = vi.mocked(prepareGalleryZip).mock.calls[0][3];
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => {
    finish(new Blob(["zip"]));
  });
  expect(createUrl).not.toHaveBeenCalled();
});

it("shows preparation failures without offering a partial ZIP", async () => {
  vi.mocked(prepareGalleryZip).mockRejectedValue(
    new Error("Access expired. Refresh."),
  );
  render(<ClientGallery gallery={gallery} />);
  fireEvent.click(screen.getByRole("button", { name: "Select all" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Download selected · web" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Access expired");
  expect(
    screen.queryByRole("link", { name: /Save ZIP/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Download selected · web" }),
  ).toBeEnabled();
});

it("revokes a prepared ZIP URL when the gallery closes", async () => {
  vi.mocked(prepareGalleryZip).mockResolvedValue(new Blob(["zip"]));
  const view = render(<ClientGallery gallery={gallery} />);
  fireEvent.click(screen.getByRole("button", { name: "Select all" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Download selected · web" }),
  );
  await screen.findByRole("link", { name: /Save ZIP/ });
  view.unmount();
  expect(revokeUrl).toHaveBeenCalledWith("blob:zip");
});

it("lets the visitor cancel preparation without reporting a failure", async () => {
  vi.mocked(prepareGalleryZip).mockImplementation(
    async (_id, _assets, _size, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () =>
          reject(new DOMException("Cancelled", "AbortError")),
        );
      }),
  );
  render(<ClientGallery gallery={gallery} />);
  fireEvent.click(screen.getByRole("button", { name: "Select all" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Download selected · web" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel download" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Download selected · web" }),
    ).toBeEnabled(),
  );
  expect(screen.getByRole("status")).toHaveTextContent("cancelled");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("offers download guidance when file sharing is unsupported", () => {
  render(
    <ClientGalleryActions galleryId={gallery.id} asset={gallery.assets[0]} />,
  );
  expect(
    screen.queryByRole("button", { name: "Prepare to share" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/For socials, download web size/),
  ).toBeInTheDocument();
});

it("shares only a prepared JPEG on a second user action, never the private URL", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: vi.fn(() => true),
  });
  const file = new File(["jpeg"], "photo.jpg", { type: "image/jpeg" });
  vi.mocked(preparePhotoShare).mockResolvedValue(file);
  render(
    <ClientGalleryActions galleryId={gallery.id} asset={gallery.assets[0]} />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Prepare to share" }),
  );
  const button = await screen.findByRole("button", { name: "Share photo" });
  expect(share).not.toHaveBeenCalled();
  fireEvent.click(button);
  await waitFor(() => expect(share).toHaveBeenCalledWith({ files: [file] }));
  expect(
    screen.getByRole("link", { name: "Download web-size image" }),
  ).toHaveTextContent("Download web size");
});
