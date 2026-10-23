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
  accessTokenVersion: 1,
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
    .mockResolvedValueOnce(
      response({ gallery, link, accessTokenVersion: 1 }, 201),
    )
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

const otherGallery = {
  ...gallery,
  id: "g_otherGallery12345678",
  title: "Other client",
};
const principal = {
  clientPrincipal: { identityProvider: "aad", userRoles: ["gallery-admin"] },
};
const privateLink = `https://www.theblackburn.studio/clients/${gallery.id}#access=${"t".repeat(43)}`;

it.each(["success", "failure"])(
  "blocks actions until the initial gallery list settles with %s",
  async (outcome) => {
    let settle!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      settle = resolve;
    });
    mockFetch
      .mockResolvedValueOnce(response(principal))
      .mockReturnValueOnce(pending);
    render(<GalleryAdmin />);
    const refresh = await screen.findByRole("button", { name: "Refresh list" });
    const create = screen.getByRole("button", { name: "Create gallery" });
    expect(refresh).toBeDisabled();
    expect(create).toBeDisabled();
    expect(screen.getByLabelText("Gallery title")).toBeDisabled();
    fireEvent.click(refresh);
    fireEvent.click(create);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    settle(
      outcome === "success"
        ? response({ galleries: [gallery] })
        : response({}, 500),
    );
    await waitFor(() => expect(refresh).toBeEnabled());
    expect(create).toBeEnabled();
    if (outcome === "success") {
      expect(screen.getByRole("button", { name: /Portraits/ })).toBeEnabled();
    } else {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to refresh galleries",
      );
    }
    expect(mockFetch).toHaveBeenCalledTimes(2);
  },
);

function fillCreateForm(title = "Portraits") {
  fireEvent.change(screen.getByLabelText("Gallery title"), {
    target: { value: title },
  });
  fireEvent.change(screen.getByLabelText("Available until"), {
    target: { value: "2026-11-01" },
  });
}

async function createGalleryWithLink() {
  mockFetch
    .mockResolvedValueOnce(response(principal))
    .mockResolvedValueOnce(response({ galleries: [] }))
    .mockResolvedValueOnce(
      response({ gallery, link: privateLink, accessTokenVersion: 1 }, 201),
    )
    .mockResolvedValueOnce(response({ galleries: [gallery] }));
  render(<GalleryAdmin />);
  await screen.findByRole("heading", { name: "Create a gallery" });
  fillCreateForm();
  fireEvent.click(screen.getByRole("button", { name: "Create gallery" }));
  await screen.findByLabelText("Private client link");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Replace client link" }),
    ).toBeEnabled(),
  );
}

it.each(["select", "create"])(
  "discards pending client files when switching galleries via %s",
  async (method) => {
    mockFetch
      .mockResolvedValueOnce(response(principal))
      .mockResolvedValueOnce(response({ galleries: [gallery, otherGallery] }));
    render(<GalleryAdmin />);
    fireEvent.click(await screen.findByRole("button", { name: /Portraits/ }));
    const originalInput = screen.getByLabelText(
      "JPEG photographs",
    ) as HTMLInputElement;
    fireEvent.change(originalInput, {
      target: {
        files: [
          new File(["private-client-A"], "client-A.jpg", {
            type: "image/jpeg",
          }),
        ],
      },
    });
    expect(originalInput.files).toHaveLength(1);
    if (method === "select") {
      fireEvent.click(screen.getByRole("button", { name: /Other client/ }));
    } else {
      mockFetch
        .mockResolvedValueOnce(
          response(
            {
              gallery: otherGallery,
              link: "https://example.test/new-link",
              accessTokenVersion: 1,
            },
            201,
          ),
        )
        .mockResolvedValueOnce(
          response({ galleries: [gallery, otherGallery] }),
        );
      fillCreateForm("Other client");
      fireEvent.click(screen.getByRole("button", { name: "Create gallery" }));
      await screen.findByLabelText("Private client link");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Upload selected photos" }),
        ).toBeEnabled(),
      );
    }
    const newInput = screen.getByLabelText(
      "JPEG photographs",
    ) as HTMLInputElement;
    expect(newInput).not.toBe(originalInput);
    expect(newInput.files).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload selected photos" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Upload selected photos" }),
      ).toBeEnabled(),
    );
    expect(
      mockFetch.mock.calls.some(([path]) => String(path).endsWith("/assets")),
    ).toBe(false);
  },
);

it.each(["revoked", "expired"])(
  "refreshes the selected panel when a sidebar record becomes %s",
  async (status) => {
    mockFetch
      .mockResolvedValueOnce(response(principal))
      .mockResolvedValueOnce(response({ galleries: [gallery] }))
      .mockResolvedValueOnce(
        response({
          galleries: [
            {
              ...gallery,
              status: status === "revoked" ? "revoked" : "published",
              expiresAt: status === "expired" ? 1 : gallery.expiresAt,
            },
          ],
        }),
      );
    render(<GalleryAdmin />);
    fireEvent.click(await screen.findByRole("button", { name: /Portraits/ }));
    expect(
      screen.getByRole("button", { name: "Upload selected photos" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh list" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Upload selected photos" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Replace client link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: new RegExp(`Portraits.*Test client.*${status}`),
      }),
    ).toBeInTheDocument();
    if (status === "revoked")
      expect(screen.getByText("Test client · revoked")).toBeInTheDocument();
  },
);

it.each(["Replace client link", "Revoke access"])(
  "hides the old link before %s and keeps it hidden after an uncertain failure",
  async (name) => {
    await createGalleryWithLink();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let fail!: (error: Error) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );
    fireEvent.click(screen.getByRole("button", { name }));
    expect(
      screen.queryByLabelText("Private client link"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open gallery" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy client link" }),
    ).not.toBeInTheDocument();
    fail(new Error("Connection lost after request"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "may already have been saved",
    );
    mockFetch.mockResolvedValueOnce(response({ galleries: [gallery] }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh list" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Refresh list" }),
      ).toBeEnabled(),
    );
    expect(
      screen.queryByLabelText("Private client link"),
    ).not.toBeInTheDocument();
  },
);

it("keeps the current link if an access change is cancelled", async () => {
  await createGalleryWithLink();
  vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "Replace client link" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Replace client link" }),
    ).toBeEnabled(),
  );
  expect(screen.getByLabelText("Private client link")).toHaveValue(privateLink);
  expect(mockFetch).toHaveBeenCalledTimes(4);
});

it("shows only the new bearer after a successful replacement", async () => {
  await createGalleryWithLink();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const newLink = privateLink.replace("t".repeat(43), "u".repeat(43));
  mockFetch
    .mockResolvedValueOnce(response({ link: newLink, accessTokenVersion: 2 }))
    .mockResolvedValueOnce(
      response({ galleries: [{ ...gallery, accessTokenVersion: 2 }] }),
    );
  fireEvent.click(screen.getByRole("button", { name: "Replace client link" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Private client link")).toHaveValue(newLink),
  );
  expect(screen.getByRole("link", { name: "Open gallery" })).toHaveAttribute(
    "href",
    newLink,
  );
});

it("clears a displayed link when refresh confirms external revocation", async () => {
  await createGalleryWithLink();
  mockFetch.mockResolvedValueOnce(
    response({ galleries: [{ ...gallery, status: "revoked" }] }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Refresh list" }));
  await waitFor(() =>
    expect(
      screen.queryByLabelText("Private client link"),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByText("Test client · revoked")).toBeInTheDocument();
});

it("refreshes a selected gallery from a later page and discards a revoked link", async () => {
  const later = { ...otherGallery };
  const laterLink = privateLink.replace(gallery.id, later.id);
  mockFetch.mockImplementation(async (path: string) => {
    if (path === "/.auth/me") return response(principal);
    if (path.endsWith("/replace")) {
      later.accessTokenVersion++;
      return response({
        link: laterLink,
        accessTokenVersion: later.accessTokenVersion,
      });
    }
    if (path.endsWith("/details")) return response({ gallery: { ...later } });
    if (path.includes("cursor="))
      return response({ galleries: [{ ...later }] });
    return response({ galleries: [gallery], cursor: "second-page" });
  });
  render(<GalleryAdmin />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Load more galleries" }),
  );
  fireEvent.click(await screen.findByRole("button", { name: /Other client/ }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Replace client link" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Refresh list" })).toBeEnabled(),
  );
  expect(screen.getByLabelText("Private client link")).toHaveValue(laterLink);
  later.status = "revoked";
  fireEvent.click(screen.getByRole("button", { name: "Refresh list" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Upload selected photos" }),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByLabelText("Private client link"),
  ).not.toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledWith(
    `/api/admin/galleries/${later.id}/details`,
    expect.anything(),
  );
});

it("preserves a newly issued link when the created gallery is beyond the first page", async () => {
  const newLink = privateLink.replace(gallery.id, otherGallery.id);
  mockFetch
    .mockResolvedValueOnce(response(principal))
    .mockResolvedValueOnce(response({ galleries: [gallery] }))
    .mockResolvedValueOnce(
      response(
        { gallery: otherGallery, link: newLink, accessTokenVersion: 1 },
        201,
      ),
    )
    .mockResolvedValueOnce(response({ galleries: [gallery], cursor: "later" }))
    .mockResolvedValueOnce(response({ gallery: otherGallery }));
  render(<GalleryAdmin />);
  await screen.findByRole("button", { name: /Portraits/ });
  fillCreateForm("Other client");
  fireEvent.click(screen.getByRole("button", { name: "Create gallery" }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(5));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Upload selected photos" }),
    ).toBeEnabled(),
  );
  expect(screen.getByLabelText("Private client link")).toHaveValue(newLink);
});

it.each([true, false])(
  "shows validation guidance for HTTP 400 (public message=%s)",
  async (hasMessage) => {
    const message = "Enter a title and an expiry within the next year.";
    mockFetch
      .mockResolvedValueOnce(response(principal))
      .mockResolvedValueOnce(response({ galleries: [] }))
      .mockResolvedValueOnce(
        hasMessage
          ? response({ message }, 400)
          : new Response("Invalid JSON", { status: 400 }),
      );
    render(<GalleryAdmin />);
    await screen.findByRole("heading", { name: "Create a gallery" });
    fillCreateForm();
    fireEvent.click(screen.getByRole("button", { name: "Create gallery" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      hasMessage ? message : "Check the gallery details",
    );
    expect(alert).not.toHaveTextContent("could not be confirmed");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  },
);

it("warns that an upload may have committed after a transport failure without retrying", async () => {
  await createGalleryWithLink();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => callback(new Blob(["web"], { type: "image/jpeg" })),
  );
  mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  fireEvent.change(screen.getByLabelText("JPEG photographs"), {
    target: {
      files: [new File(["original"], "client.jpg", { type: "image/jpeg" })],
    },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Upload selected photos" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "current photo or other change may already have been saved",
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "0 photos confirmed uploaded",
  );
  expect(mockFetch).toHaveBeenCalledTimes(5);
});

it.each([1, 2])(
  "keeps only links matching the refreshed access version %s",
  async (accessTokenVersion) => {
    await createGalleryWithLink();
    mockFetch.mockResolvedValueOnce(
      response({ galleries: [{ ...gallery, accessTokenVersion }] }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh list" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Refresh list" }),
      ).toBeEnabled(),
    );
    if (accessTokenVersion === 1) {
      expect(screen.getByLabelText("Private client link")).toHaveValue(
        privateLink,
      );
      expect(
        screen.getByRole("link", { name: "Open gallery" }),
      ).toHaveAttribute("href", privateLink);
    } else {
      expect(
        screen.queryByLabelText("Private client link"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Copy client link" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Open gallery" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Upload selected photos" }),
      ).toBeInTheDocument();
    }
  },
);
