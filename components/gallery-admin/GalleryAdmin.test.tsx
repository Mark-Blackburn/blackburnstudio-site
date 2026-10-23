import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { GalleryAdmin, makeWebJpeg } from "./GalleryAdmin";
const mockFetch = vi.fn();
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const gallery = {
  id: "g_privateGallery123456",
  title: "Portraits",
  clientDisplayName: "Test client",
  message: "",
  status: "published",
  expiresAt: Date.parse("2099-01-01"),
};
beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("requires dedicated admin sign-in", async () => {
  mockFetch.mockResolvedValue(response({ clientPrincipal: null }));
  render(<GalleryAdmin />);
  expect(
    await screen.findByRole("link", { name: "Sign in with Microsoft" }),
  ).toHaveAttribute("href", expect.stringContaining("/.auth/login/aad"));
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
it("creates a gallery and shows its copyable private link without storage persistence", async () => {
  const link = `https://www.theblackburn.studio/clients/${gallery.id}#access=${"t".repeat(43)}`;
  mockFetch
    .mockResolvedValueOnce(
      response({
        clientPrincipal: {
          identityProvider: "aad",
          userRoles: ["gallery-admin"],
        },
      }),
    )
    .mockResolvedValueOnce(response({ galleries: [] }))
    .mockResolvedValueOnce(response({ gallery, link }, 201))
    .mockResolvedValue(response({ galleries: [gallery] }));
  render(<GalleryAdmin />);
  await screen.findByRole("heading", { name: "Create a gallery" });
  fireEvent.change(screen.getByLabelText("Gallery title"), {
    target: { value: "Portraits" },
  });
  fireEvent.change(screen.getByLabelText("Available until"), {
    target: { value: "2026-11-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create gallery" }));
  expect(await screen.findByLabelText("Private client link")).toHaveValue(link);
  expect(screen.getByRole("link", { name: "Open gallery" })).toHaveAttribute(
    "href",
    link,
  );
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});
it("rejects files beyond original JPEG limits before decoding", async () => {
  await expect(
    makeWebJpeg(new File(["x"], "x.png", { type: "image/png" })),
  ).rejects.toThrow("Choose JPEGs");
});
it("resizes to 2048 pixels and re-encodes web bytes while preserving the source file", async () => {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 6000, height: 4000, close }),
  );
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  let size = [0, 0];
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
  ) {
    size = [this.width, this.height];
    callback(new Blob(["web"], { type: "image/jpeg" }));
  });
  const original = new File(["original"], "portrait.jpg", {
    type: "image/jpeg",
  });
  const web = await makeWebJpeg(original);
  expect(size).toEqual([2048, 1365]);
  expect(web.size).toBe(3);
  expect(original.size).toBe(8);
  expect(close).toHaveBeenCalledOnce();
});
