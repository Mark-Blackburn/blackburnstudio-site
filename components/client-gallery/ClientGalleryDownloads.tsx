"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientGalleryAsset } from "@/lib/client-galleries/contracts";
import {
  prepareGalleryZipPart,
  type DownloadSize,
} from "@/lib/client-galleries/downloads";

const button =
  "inline-flex min-h-11 items-center justify-center rounded border border-studio-border px-3 py-2 text-sm text-studio-text hover:border-studio-accent focus-visible:ring-2 focus-visible:ring-studio-accent disabled:opacity-40";

export function ClientGalleryDownloads({
  galleryId,
  title,
  assets,
  selected,
  onSelectionChange,
}: {
  galleryId: string;
  title: string;
  assets: ClientGalleryAsset[];
  selected: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{
    url: string;
    filename: string;
    count: number;
    selection: string;
    partNumber: number;
    nextIndex: number;
    total: number;
    size: DownloadSize;
  } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const url = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  const eligible = assets.filter(
    (asset) => asset.webDownloadUrl || asset.fullDownloadUrl,
  );
  if (!eligible.length) return null;
  const chosen = assets
    .map((asset, index) => ({ ...asset, photoNumber: index + 1 }))
    .filter((asset) => selected.has(asset.id));
  const selection = chosen.map((asset) => `${asset.id}:${asset.photoNumber}`).join(",");
  const prepare = async (size: DownloadSize, startIndex = 0, partNumber = 1) => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    setMessage(`Preparing ZIP part ${partNumber} · ${startIndex} of ${chosen.length} photographs…`);
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setReady(null);
    try {
      const { part, nextIndex } = await prepareGalleryZipPart(
        galleryId,
        chosen,
        size,
        startIndex,
        request.signal,
        (count) => {
          if (mounted.current && !request.signal.aborted)
            setMessage(`Preparing ZIP part ${partNumber} · ${count} of ${chosen.length} photographs…`);
        },
      );
      if (!mounted.current || request.signal.aborted) return;
      const objectUrl = URL.createObjectURL(part.blob);
      url.current = objectUrl;
      const filename = `${
        title
          .replace(/[^a-zA-Z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80) || "gallery"
      }-${size}-part-${String(partNumber).padStart(2, '0')}.zip`;
      setReady({ url: objectUrl, filename, count: part.count, selection, partNumber, nextIndex, total: chosen.length, size });
      setMessage(`Part ${partNumber} ready (${part.count} photos, ${(part.blob.size / 1_000_000).toFixed(1)} MB). Save this ZIP${nextIndex < chosen.length ? " before preparing the next part." : ". All photographs are prepared."}`);
    } catch (e) {
      if (mounted.current && !request.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Unable to prepare this download. Please try again.",
        );
    } finally {
      if (controller.current === request) controller.current = null;
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <div className="mb-6 space-y-3 rounded border border-studio-border bg-studio-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="mr-auto text-sm text-studio-text">
          {chosen.length} of {eligible.length} selected
        </p>
        <button
          type="button"
          className={button}
          onClick={() =>
            onSelectionChange(new Set(eligible.map((asset) => asset.id)))
          }
        >
          Select all
        </button>
        <button
          type="button"
          className={button}
          disabled={!chosen.length}
          onClick={() => onSelectionChange(new Set())}
        >
          Clear selection
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={button}
          disabled={busy || !chosen.length}
          onClick={() => void prepare("web")}
        >
          Download selected · web
        </button>
        <button
          type="button"
          className={button}
          disabled={busy || !chosen.length}
          onClick={() => void prepare("full")}
        >
          Download selected · full resolution
        </button>
        {busy && (
          <button
            type="button"
            className={button}
            onClick={() => {
              controller.current?.abort();
              setMessage("Download cancelled.");
            }}
          >
            Cancel download
          </button>
        )}
        {ready && ready.selection === selection && (
          <a
            href={ready.url}
            download={ready.filename}
            className={button + " border-studio-accent"}
          >
            Save part {ready.partNumber} · {ready.count} photo{ready.count === 1 ? "" : "s"}
          </a>
        )}
      </div>
      {ready && ready.selection === selection && ready.nextIndex < ready.total && <button type="button" className={button} disabled={busy} onClick={() => void prepare(ready.size, ready.nextIndex, ready.partNumber + 1)}>Prepare next ZIP · part {ready.partNumber + 1}</button>}
      <p className="text-xs leading-5 text-studio-dim">
        Web copies suit socials and online sharing. Full resolution preserves
        the originals. Large selections are prepared in numbered ZIP parts (up to 100 MB each). Save each part before preparing the next.
      </p>
      {message && (
        <p role="status" className="text-sm">
          {ready && ready.selection !== selection
            ? "Selection changed. Prepare a new ZIP for these photographs."
            : message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-studio-text">
          {error}
        </p>
      )}
    </div>
  );
}
