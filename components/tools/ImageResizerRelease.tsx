"use client";

import { useEffect, useState } from "react";

import { SectionEyebrow, StudioButton, StudioTag } from "@/components/studio";
import {
  getSafeToolDownloadUrl,
  IMAGE_RESIZER_LATEST_URL,
  IMAGE_RESIZER_RELEASES_URL,
} from "@/lib/toolsConfig";

type DownloadArtifact = {
  fileName?: string;
  downloadUrl?: string;
  versionedDownloadUrl?: string;
  sha256?: string;
  sizeBytes?: number;
};

type LatestRelease = {
  name?: string;
  version?: string;
  releasedAt?: string;
  platform?: string;
  codeSigned?: boolean;
  installer?: DownloadArtifact;
  portable?: DownloadArtifact;
  checksumUrl?: string;
  noticesUrl?: string;
};

type HistoryRelease = {
  version: string;
  releasedAt?: string;
  installerUrl?: string;
  checksumUrl?: string;
};

type LoadState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optionalPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function parseArtifact(value: unknown): DownloadArtifact | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    fileName: optionalString(value.fileName),
    downloadUrl: getSafeToolDownloadUrl(value.downloadUrl) ?? undefined,
    versionedDownloadUrl:
      getSafeToolDownloadUrl(value.versionedDownloadUrl) ?? undefined,
    sha256: optionalString(value.sha256),
    sizeBytes: optionalPositiveNumber(value.sizeBytes),
  };
}

function parseLatestRelease(value: unknown): LatestRelease | null {
  if (!isRecord(value)) {
    return null;
  }

  const release: LatestRelease = {
    name: optionalString(value.name),
    version: optionalString(value.version),
    releasedAt: optionalString(value.releasedAt),
    platform: optionalString(value.platform),
    codeSigned: optionalBoolean(value.codeSigned),
    installer: parseArtifact(value.installer),
    portable: parseArtifact(value.portable),
    checksumUrl: getSafeToolDownloadUrl(value.checksumUrl) ?? undefined,
    noticesUrl: getSafeToolDownloadUrl(value.noticesUrl) ?? undefined,
  };

  return release.version || release.installer?.downloadUrl ? release : null;
}

function parseHistoryRelease(value: unknown): HistoryRelease | null {
  if (!isRecord(value)) {
    return null;
  }

  const version = optionalString(value.version);
  if (!version) {
    return null;
  }

  return {
    version,
    releasedAt: optionalString(value.releasedAt),
    installerUrl: getSafeToolDownloadUrl(value.installerUrl) ?? undefined,
    checksumUrl: getSafeToolDownloadUrl(value.checksumUrl) ?? undefined,
  };
}

function parseReleaseHistory(value: unknown): HistoryRelease[] {
  let candidates: unknown[];

  if (Array.isArray(value)) {
    candidates = value;
  } else if (isRecord(value) && Array.isArray(value.releases)) {
    candidates = value.releases;
  } else {
    candidates = [value];
  }

  return candidates
    .map(parseHistoryRelease)
    .filter((release): release is HistoryRelease => release !== null)
    .sort((a, b) => {
      const aTime = a.releasedAt ? Date.parse(a.releasedAt) : 0;
      const bTime = b.releasedAt ? Date.parse(b.releasedAt) : 0;
      return (Number.isNaN(bTime) ? 0 : bTime) -
        (Number.isNaN(aTime) ? 0 : aTime);
    });
}

function formatReleaseDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatFileSize(value?: number): string | null {
  if (value === undefined) {
    return null;
  }

  return `${(value / 1_048_576).toLocaleString("en-AU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} MB`;
}

function ExternalLink({
  href,
  children,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
    >
      {children}
    </a>
  );
}

function CurrentRelease({ release }: { release: LatestRelease }) {
  const releaseDate = formatReleaseDate(release.releasedAt);
  const installerSize = formatFileSize(release.installer?.sizeBytes);

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {release.version ? <StudioTag>Version {release.version}</StudioTag> : null}
        {release.platform ? <StudioTag>{release.platform}</StudioTag> : null}
      </div>

      <dl className="mt-8 grid gap-6 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-studio-dim">
            Version
          </dt>
          <dd className="mt-2 text-sm text-studio-text">
            {release.version ?? "Not specified"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-studio-dim">
            Released
          </dt>
          <dd className="mt-2 text-sm text-studio-text">
            {releaseDate ?? "Not specified"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-studio-dim">
            Installer size
          </dt>
          <dd className="mt-2 text-sm text-studio-text">
            {installerSize ?? "Not specified"}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        {release.installer?.downloadUrl ? (
          <StudioButton
            href={release.installer.downloadUrl}
            external
            variant="primary"
          >
            Download for Windows
            <span className="sr-only"> (opens in a new tab)</span>
          </StudioButton>
        ) : (
          <p className="text-sm text-studio-muted">
            The installer download is temporarily unavailable.
          </p>
        )}
        {release.portable?.downloadUrl ? (
          <StudioButton
            href={release.portable.downloadUrl}
            external
            variant="secondary"
          >
            Portable version
            <span className="sr-only"> (opens in a new tab)</span>
          </StudioButton>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-studio-dim">
        The installer is recommended for most users. The portable version runs
        without installation.
      </p>

      {release.codeSigned === false ? (
        <aside className="mt-8 max-w-[72ch] text-sm leading-relaxed text-studio-dim">
          Windows or Microsoft Edge may display a SmartScreen warning because
          this version is not yet digitally signed.
        </aside>
      ) : null}

      {release.installer?.sha256 ? (
        <div className="mt-9">
          <h3 className="text-sm font-medium text-studio-text">
            SHA-256 checksum
          </h3>
          <code className="mt-3 block max-w-full break-all rounded-xl border border-studio-border/60 bg-studio-base/45 px-4 py-3 font-mono text-xs leading-relaxed text-studio-muted">
            {release.installer.sha256}
          </code>
        </div>
      ) : null}

      {release.checksumUrl || release.noticesUrl ? (
        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-studio-muted">
          {release.checksumUrl ? (
            <ExternalLink
              href={release.checksumUrl}
              ariaLabel="View checksum file (opens in a new tab)"
            >
              Checksum file
            </ExternalLink>
          ) : null}
          {release.noticesUrl ? (
            <ExternalLink
              href={release.noticesUrl}
              ariaLabel="View third-party notices (opens in a new tab)"
            >
              Third-party notices
            </ExternalLink>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function ReleaseHistory({ state }: { state: LoadState<HistoryRelease[]> }) {
  return (
    <section aria-labelledby="release-history-heading" className="mt-16 md:mt-20">
      <h2
        id="release-history-heading"
        className="text-2xl font-medium tracking-tight text-studio-text md:text-3xl"
      >
        Release history
      </h2>

      {state.status === "loading" ? (
        <p className="mt-5 text-sm text-studio-dim" role="status">
          Loading release history…
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-5 text-sm text-studio-dim">
          Release history is temporarily unavailable.
        </p>
      ) : null}

      {state.status === "success" && state.data.length === 0 ? (
        <p className="mt-5 text-sm text-studio-dim">
          No previous releases are listed yet.
        </p>
      ) : null}

      {state.status === "success" && state.data.length > 0 ? (
        <ol className="mt-6 divide-y divide-studio-border/60 rounded-2xl border border-studio-border/70 bg-studio-surface/45 px-5 md:px-6">
          {state.data.map((release) => (
            <li
              key={`${release.version}-${release.releasedAt ?? "undated"}`}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="text-base font-medium text-studio-text">
                  Version {release.version}
                </h3>
                <p className="mt-1 text-sm text-studio-dim">
                  {formatReleaseDate(release.releasedAt) ?? "Release date unavailable"}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-studio-muted">
                {release.installerUrl ? (
                  <ExternalLink
                    href={release.installerUrl}
                    ariaLabel={`Download installer for version ${release.version} (opens in a new tab)`}
                  >
                    Installer
                  </ExternalLink>
                ) : null}
                {release.checksumUrl ? (
                  <ExternalLink
                    href={release.checksumUrl}
                    ariaLabel={`View checksum for version ${release.version} (opens in a new tab)`}
                  >
                    Checksum
                  </ExternalLink>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export default function ImageResizerRelease() {
  const [latestState, setLatestState] = useState<LoadState<LatestRelease>>({
    status: "loading",
  });
  const [historyState, setHistoryState] = useState<LoadState<HistoryRelease[]>>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadLatestRelease() {
      try {
        const response = await fetch(IMAGE_RESIZER_LATEST_URL, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Release request failed");
        }

        const release = parseLatestRelease(await response.json());
        if (!release) {
          throw new Error("Release response was invalid");
        }

        setLatestState({ status: "success", data: release });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLatestState({ status: "error" });
      }
    }

    async function loadReleaseHistory() {
      try {
        const response = await fetch(IMAGE_RESIZER_RELEASES_URL, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Release history request failed");
        }

        setHistoryState({
          status: "success",
          data: parseReleaseHistory(await response.json()),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setHistoryState({ status: "error" });
      }
    }

    void loadLatestRelease();
    void loadReleaseHistory();

    return () => controller.abort();
  }, []);

  return (
    <>
      <section
        aria-labelledby="current-release-heading"
        className="rounded-3xl border border-studio-border bg-studio-surface px-6 py-8 md:px-9 md:py-10"
      >
        <SectionEyebrow>Latest release</SectionEyebrow>
        <h2
          id="current-release-heading"
          className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
        >
          Download Web Image Resizer
        </h2>

        <div className="mt-7" aria-live="polite">
          {latestState.status === "loading" ? (
            <div className="min-h-32 py-2">
              <p className="text-sm text-studio-dim" role="status">
                Checking the latest release…
              </p>
            </div>
          ) : null}

          {latestState.status === "error" ? (
            <div className="min-h-32 py-2">
              <p className="text-sm leading-relaxed text-studio-muted">
                Current release information is temporarily unavailable.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-studio-dim">
                Please try again shortly.
              </p>
            </div>
          ) : null}

          {latestState.status === "success" ? (
            <CurrentRelease release={latestState.data} />
          ) : null}
        </div>
      </section>

      <ReleaseHistory state={historyState} />
    </>
  );
}