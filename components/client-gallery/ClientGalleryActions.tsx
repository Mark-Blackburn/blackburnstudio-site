"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientGalleryAsset } from "@/lib/client-galleries/contracts";
import { preparePhotoShare } from "@/lib/client-galleries/downloads";

const action =
  "inline-flex min-h-11 items-center justify-center rounded border border-white/30 px-3 py-2 text-xs text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#d2b47b] aria-disabled:opacity-40 sm:text-sm";

export function ClientGalleryActions({
  galleryId,
  asset,
}: {
  galleryId: string;
  asset: ClientGalleryAsset;
}) {
  // This component mounts only after the visitor opens the viewer.
  const [supportsSharing] = useState(() => {
    if (typeof navigator === "undefined") return false;
    try {
      return (
        typeof navigator.share === "function" &&
        Boolean(
          navigator.canShare?.({
            files: [new File([""], "photo.jpg", { type: "image/jpeg" })],
          }),
        )
      );
    } catch {
      return false;
    }
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  const prepare = async () => {
    if (pending.current) return;
    pending.current = true;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setMessage("Preparing web photo for sharing…");
    try {
      const photo = await preparePhotoShare(
        galleryId,
        asset,
        controller.signal,
      );
      if (!mounted.current || controller.signal.aborted) return;
      if (!navigator.canShare?.({ files: [photo] }))
        throw new Error(
          "File sharing is unavailable. Download the web photo and attach it in your social app.",
        );
      setFile(photo);
      setMessage("Ready. Choose Share photo, then select an app.");
    } catch (e) {
      if (mounted.current && !controller.signal.aborted)
        setMessage(
          e instanceof Error
            ? e.message
            : "Download the web photo and attach it in your social app.",
        );
    } finally {
      pending.current = false;
      if (request.current === controller) request.current = null;
      if (mounted.current) setBusy(false);
    }
  };
  const share = async () => {
    if (!file || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      // A separate click keeps native sharing within browser user activation.
      // Only the JPEG is shared; never the gallery URL or bearer fragment.
      await navigator.share({ files: [file] });
      if (mounted.current) setMessage("Photo handed to your chosen app.");
    } catch (e) {
      if (mounted.current)
        setMessage(
          e instanceof Error && e.name === "AbortError"
            ? "Sharing cancelled."
            : "Could not open sharing. Download the web photo and attach it in your social app.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
      {asset.webDownloadUrl && (
        <a
          href={asset.webDownloadUrl}
          download
          aria-label="Download web-size image"
          referrerPolicy="no-referrer"
          className={action}
        >
          ↓ Download web size
        </a>
      )}
      {asset.fullDownloadUrl && (
        <a
          href={asset.fullDownloadUrl}
          download
          aria-label="Download full-resolution image"
          referrerPolicy="no-referrer"
          className={action}
        >
          ↓ Download full resolution
        </a>
      )}
      {asset.webDownloadUrl && supportsSharing && (
        <button
          type="button"
          className={action}
          aria-disabled={busy}
          onClick={() => void (file ? share() : prepare())}
        >
          {file ? "Share photo" : "Prepare to share"}
        </button>
      )}
      {asset.webDownloadUrl && !supportsSharing && (
        <span className="w-full text-right text-xs text-white/60">
          For socials, download web size and attach it in your app.
        </span>
      )}
      {message && (
        <p role="status" className="w-full text-right text-xs text-white/80">
          {message}
        </p>
      )}
    </div>
  );
}
