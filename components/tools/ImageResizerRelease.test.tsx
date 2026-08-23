import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ImageResizerRelease from "@/components/tools/ImageResizerRelease";
import {
  IMAGE_RESIZER_LATEST_URL,
  IMAGE_RESIZER_RELEASES_URL,
  TOOLS_DOWNLOADS_BASE_URL,
} from "@/lib/toolsConfig";

const imageResizerDownloadsUrl = `${TOOLS_DOWNLOADS_BASE_URL}/image-resizer`;

const latestRelease = {
  version: "0.1.2",
  releasedAt: "2026-08-23T10:30:44+10:00",
  platform: "Windows 10/11 (64-bit)",
  codeSigned: false,
  installer: {
    downloadUrl: `${imageResizerDownloadsUrl}/latest/image-resizer-setup.exe`,
    sha256: "abc123",
    sizeBytes: 20_389_502,
  },
  portable: {
    downloadUrl: `${imageResizerDownloadsUrl}/latest/image-resizer.exe`,
  },
  checksumUrl: `${imageResizerDownloadsUrl}/latest/SHA256SUMS.txt`,
  noticesUrl: `${imageResizerDownloadsUrl}/latest/THIRD_PARTY_NOTICES.txt`,
};

const historyRelease = {
  version: "0.1.2",
  releasedAt: "2026-08-23T10:30:44+10:00",
  installerUrl: `${imageResizerDownloadsUrl}/v0.1.2/setup.exe`,
  checksumUrl: `${imageResizerDownloadsUrl}/v0.1.2/SHA256SUMS.txt`,
};

function jsonResponse(data: unknown, ok = true): Response {
  return {
    ok,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

describe("ImageResizerRelease", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the current release with a positive file size and release history at runtime", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      return Promise.resolve(
        jsonResponse(
          url === IMAGE_RESIZER_LATEST_URL ? latestRelease : historyRelease,
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ImageResizerRelease />);

    expect(screen.getByText("Checking the latest release…")).toBeInTheDocument();
    expect(screen.getByText("Loading release history…")).toBeInTheDocument();

    expect(
      await screen.findByRole("link", { name: /Download for Windows/ }),
    ).toHaveAttribute("href", latestRelease.installer.downloadUrl);
    expect(
      screen.getByRole("link", { name: /Portable version/ }),
    ).toHaveAttribute("href", latestRelease.portable.downloadUrl);
    expect(
      screen.getByRole("link", { name: /View checksum file/ }),
    ).toHaveAttribute("href", latestRelease.checksumUrl);
    expect(
      screen.getByRole("link", { name: /View third-party notices/ }),
    ).toHaveAttribute("href", latestRelease.noticesUrl);
    expect(screen.getAllByText("23 August 2026")).toHaveLength(2);
    expect(screen.getByText("19.4 MB")).toBeInTheDocument();
    expect(screen.getByText(latestRelease.installer.sha256)).toBeInTheDocument();
    expect(
      screen.getByText(/SmartScreen warning because this version is not yet digitally signed/),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Version 0.1.2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Download installer for version 0.1.2/,
      }),
    ).toHaveAttribute("href", historyRelease.installerUrl);
    expect(
      screen.getByRole("link", { name: /View checksum for version 0.1.2/ }),
    ).toHaveAttribute("href", historyRelease.checksumUrl);
    expect(fetchMock).toHaveBeenCalledWith(
      IMAGE_RESIZER_LATEST_URL,
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      IMAGE_RESIZER_RELEASES_URL,
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it.each([
    ["zero", 0],
    ["a negative number", -1],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["a non-number value", "20389502"],
  ])("treats %s installer size as unavailable", async (_label, sizeBytes) => {
    const release = {
      ...latestRelease,
      installer: {
        ...latestRelease.installer,
        sizeBytes,
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          jsonResponse(
            String(input) === IMAGE_RESIZER_LATEST_URL
              ? release
              : historyRelease,
          ),
        ),
      ),
    );

    render(<ImageResizerRelease />);

    await screen.findByRole("link", { name: /Download for Windows/ });
    expect(screen.getByText("Installer size").parentElement).toHaveTextContent(
      "Not specified",
    );
    expect(screen.queryByText("0.0 MB")).not.toBeInTheDocument();
  });

  it("suppresses unsafe current release URLs without breaking release details", async () => {
    const unsafeRelease = {
      ...latestRelease,
      installer: {
        ...latestRelease.installer,
        downloadUrl: "javascript:alert('download')",
      },
      portable: {
        downloadUrl: "https://downloads.example/image-resizer.exe",
      },
      checksumUrl: "not a valid URL",
      noticesUrl: `${TOOLS_DOWNLOADS_BASE_URL}/other-tool/notices.txt`,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          jsonResponse(
            String(input) === IMAGE_RESIZER_LATEST_URL
              ? unsafeRelease
              : historyRelease,
          ),
        ),
      ),
    );

    render(<ImageResizerRelease />);

    expect(
      await screen.findByText(
        "The installer download is temporarily unavailable.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("0.1.2")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Download for Windows/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Portable version/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /View checksum file/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /View third-party notices/ }),
    ).not.toBeInTheDocument();
  });

  it("suppresses invalid history URLs without breaking release history", async () => {
    const history = [
      historyRelease,
      {
        version: "0.1.1",
        releasedAt: "2026-08-01T10:30:44+10:00",
        installerUrl: "javascript:alert('history')",
        checksumUrl: "https://downloads.example/SHA256SUMS.txt",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          jsonResponse(
            String(input) === IMAGE_RESIZER_RELEASES_URL
              ? history
              : latestRelease,
          ),
        ),
      ),
    );

    render(<ImageResizerRelease />);

    expect(
      await screen.findByRole("heading", { name: "Version 0.1.1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Version 0.1.2" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: /Download installer for version 0.1.1/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /View checksum for version 0.1.1/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Download installer for version 0.1.2/,
      }),
    ).toHaveAttribute("href", historyRelease.installerUrl);
  });

  it("keeps release history available when the current release fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          String(input) === IMAGE_RESIZER_LATEST_URL
            ? jsonResponse({}, false)
            : jsonResponse(historyRelease),
        ),
      ),
    );

    render(<ImageResizerRelease />);

    expect(
      await screen.findByText(
        "Current release information is temporarily unavailable.",
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Version 0.1.2" }),
    ).toBeInTheDocument();
  });

  it("keeps the current release available when release history fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          String(input) === IMAGE_RESIZER_RELEASES_URL
            ? jsonResponse({}, false)
            : jsonResponse({ ...latestRelease, codeSigned: true }),
        ),
      ),
    );

    render(<ImageResizerRelease />);

    expect(
      await screen.findByRole("link", { name: /Download for Windows/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Release history is temporarily unavailable."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/SmartScreen warning/)).not.toBeInTheDocument();
  });
});
