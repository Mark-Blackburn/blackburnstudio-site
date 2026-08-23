import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ImageResizerRelease from "@/components/tools/ImageResizerRelease";
import {
  IMAGE_RESIZER_LATEST_URL,
  IMAGE_RESIZER_RELEASES_URL,
} from "@/lib/toolsConfig";

const latestRelease = {
  version: "0.1.2",
  releasedAt: "2026-08-23T10:30:44+10:00",
  platform: "Windows 10/11 (64-bit)",
  codeSigned: false,
  installer: {
    downloadUrl: "https://downloads.example/image-resizer-setup.exe",
    sha256: "abc123",
    sizeBytes: 20_389_502,
  },
  portable: {
    downloadUrl: "https://downloads.example/image-resizer.exe",
  },
  checksumUrl: "https://downloads.example/SHA256SUMS.txt",
  noticesUrl: "https://downloads.example/THIRD_PARTY_NOTICES.txt",
};

const historyRelease = {
  version: "0.1.2",
  releasedAt: "2026-08-23T10:30:44+10:00",
  installerUrl: "https://downloads.example/v0.1.2/setup.exe",
  checksumUrl: "https://downloads.example/v0.1.2/SHA256SUMS.txt",
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

  it("loads the current release and release history at runtime", async () => {
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
    expect(screen.getAllByText("23 August 2026")).toHaveLength(2);
    expect(screen.getByText("19.4 MB")).toBeInTheDocument();
    expect(screen.getByText(latestRelease.installer.sha256)).toBeInTheDocument();
    expect(
      screen.getByText(/SmartScreen warning because this version is not yet digitally signed/),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Version 0.1.2" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      IMAGE_RESIZER_LATEST_URL,
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      IMAGE_RESIZER_RELEASES_URL,
      expect.objectContaining({ cache: "no-store" }),
    );
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
