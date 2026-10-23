import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GalleryAdminPhotos } from "./GalleryAdminPhotos";

const galleryId = "g_privateGallery123456";
const photo = {
  id: "a_privateAsset12345678",
  altText: "Mistaken upload",
  width: 150,
  height: 100,
  displayOrder: 0,
};
const run = async (work: () => Promise<void>) => {
  await work();
};
afterEach(() => vi.restoreAllMocks());

it("loads role-protected thumbnails only when requested, and respects cancelled removal", async () => {
  const request = vi.fn().mockResolvedValue({ assets: [photo] });
  vi.spyOn(window, "confirm").mockReturnValue(false);
  render(
    <GalleryAdminPhotos
      galleryId={galleryId}
      revision={0}
      busy={false}
      request={request}
      run={run}
    />,
  );
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Manage photographs" }));
  const remove = await screen.findByRole("button", { name: /Remove photo 1/ });
  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    `/api/gallery-management/galleries/${galleryId}/preview?assetId=${photo.id}`,
  );
  fireEvent.click(remove);
  expect(window.confirm).toHaveBeenCalledWith(
    expect.stringContaining("Previously downloaded copies are not affected"),
  );
  expect(request).toHaveBeenCalledTimes(1);
  expect(remove).toBeInTheDocument();
});

it("removes a confirmed photo, preserves incomplete cleanup across refresh, and offers cleanup-only retry", async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({ assets: [photo] })
    .mockResolvedValueOnce({ success: true, cleanupComplete: false })
    .mockResolvedValueOnce({ assets: [] })
    .mockResolvedValueOnce({ success: true, cleanupComplete: true });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(
    <GalleryAdminPhotos
      galleryId={galleryId}
      revision={0}
      busy={false}
      request={request}
      run={run}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Manage photographs" }));
  fireEvent.click(
    await screen.findByRole("button", { name: /Remove photo 1/ }),
  );
  await screen.findByRole("button", { name: "Retry file cleanup" });
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Photographs" })).toHaveFocus();
  expect(request.mock.calls[1]).toEqual([
    `/api/gallery-management/galleries/${galleryId}/remove`,
    { assetId: photo.id },
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Refresh photographs" }));
  await screen.findByText(
    "0 photographs. Remove any photographs uploaded by mistake.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Retry file cleanup" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Retry file cleanup" }),
    ).not.toBeInTheDocument(),
  );
  expect(window.confirm).toHaveBeenCalledTimes(1);
});

it("discards a delayed list response after switching galleries", async () => {
  let finish!: (value: unknown) => void;
  const request = vi.fn().mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const view = render(
    <GalleryAdminPhotos
      key={galleryId}
      galleryId={galleryId}
      revision={0}
      busy={false}
      request={request}
      run={run}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Manage photographs" }));
  view.rerender(
    <GalleryAdminPhotos
      key="other"
      galleryId="g_otherGallery12345678"
      revision={0}
      busy={false}
      request={request}
      run={run}
    />,
  );
  await act(async () => {
    finish({ assets: [photo] });
  });
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Manage photographs" }),
  ).toBeInTheDocument();
});

it("refreshes an open photo list after upload revision changes and disables mutation controls during admin work", async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({ assets: [photo] })
    .mockResolvedValueOnce({
      assets: [photo, { ...photo, id: "a_otherAsset123456789" }],
    });
  const view = render(
    <GalleryAdminPhotos
      galleryId={galleryId}
      revision={0}
      busy={false}
      request={request}
      run={run}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Manage photographs" }));
  await screen.findByRole("button", { name: /Remove photo 1/ });
  view.rerender(
    <GalleryAdminPhotos
      galleryId={galleryId}
      revision={1}
      busy={true}
      request={request}
      run={run}
    />,
  );
  await screen.findByRole("button", { name: /Remove photo 2/ });
  expect(screen.getByRole("button", { name: /Remove photo 1/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Remove photo 2/ })).toBeDisabled();
  expect(request).toHaveBeenCalledTimes(2);
});
