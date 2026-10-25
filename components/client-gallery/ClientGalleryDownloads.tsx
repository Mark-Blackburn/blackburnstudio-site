"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientGalleryAsset } from "@/lib/client-galleries/contracts";
import {
  prepareGalleryZip,
  type DownloadSize,
} from "@/lib/client-galleries/downloads";

function waitForPoll(signal: AbortSignal, milliseconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("Stopped")); return; }
    const onAbort = () => { clearTimeout(timer); reject(new Error("Stopped")); };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

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
  const serverArchive = process.env.NEXT_PUBLIC_GALLERY_SERVER_ARCHIVES_ENABLED === "true";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{
    url: string;
    filename: string;
    count: number;
    selection: string;
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
  const prepare = async (size: DownloadSize) => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    setMessage(`Preparing 0 of ${chosen.length} photographs…`);
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setReady(null);
    try {
      if (chosen.length > 0 && serverArchive) {
        const response = await fetch(`/api/galleries/${encodeURIComponent(galleryId)}/archives`, {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variant: size, assetIds: chosen.map(asset => asset.id) }),
          signal: request.signal,
        });
        if (!response.ok) throw new Error("Unable to start archive preparation.");
        const job = await response.json() as { jobId: string; status: string; photosCompleted: number; photosTotal: number };
        const statusUrl = `/api/galleries/${encodeURIComponent(galleryId)}/archives/${encodeURIComponent(job.jobId)}`;
        while (!request.signal.aborted) {
          await waitForPoll(request.signal, 2000);
          const statusResponse = await fetch(statusUrl, { credentials: "same-origin", cache: "no-store", signal: request.signal });
          if (!statusResponse.ok) throw new Error("Unable to check archive progress.");
          const status = await statusResponse.json() as { status: string; photosCompleted: number; photosTotal: number };
          if (mounted.current) setMessage(`Preparing ${status.photosCompleted} of ${status.photosTotal} photographs…`);
          if (status.status === "failed" || status.status === "expired") throw new Error("Archive preparation did not complete. Please try again.");
          if (status.status === "ready") {
            if (mounted.current) {
              setReady({ url: `${statusUrl}/download`, filename: "blackburnstudio-gallery.zip", count: chosen.length, selection });
              setMessage("Your ZIP is ready. Choose Save ZIP to download it.");
            }
            return;
          }
        }
        return;
      }
      const blob = await prepareGalleryZip(
        galleryId,
        chosen,
        size,
        request.signal,
        (count) => {
          if (mounted.current && !request.signal.aborted)
            setMessage(`Preparing ${count} of ${chosen.length} photographs…`);
        },
      );
      if (!mounted.current || request.signal.aborted) return;
      const objectUrl = URL.createObjectURL(blob);
      url.current = objectUrl;
      const filename = `${
        title
          .replace(/[^a-zA-Z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80) || "gallery"
      }-${size}.zip`;
      setReady({ url: objectUrl, filename, count: chosen.length, selection });
      setMessage("Your ZIP is ready. Choose Save ZIP to download it.");
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
              setMessage(serverArchive ? "Stopped waiting. Archive preparation may continue on the server." : "Download cancelled.");
            }}
          >
            {serverArchive ? "Stop waiting" : "Cancel download"}
          </button>
        )}
        {ready && ready.selection === selection && (
          <a
            href={ready.url}
            download={ready.filename}
            className={button + " border-studio-accent"}
          >
            Save ZIP · {ready.count} photo{ready.count === 1 ? "" : "s"}
          </a>
        )}
      </div>
      <p className="text-xs leading-5 text-studio-dim">
        Web copies suit socials and online sharing. Full resolution preserves
        the originals. ZIP downloads contain your selection when preparation
        starts{serverArchive ? " in one ZIP file." : ", up to 100 MB at a time."}
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
