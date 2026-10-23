"use client";

import { useEffect, useRef, useState } from "react";

type Photo = {
  id: string;
  altText: string;
  width: number;
  height: number;
  displayOrder: number;
};
type Request = (path: string, body?: object) => Promise<unknown>;
const button =
  "min-h-11 rounded border border-studio-border px-3 py-2 text-sm hover:border-studio-accent disabled:opacity-40";

export function GalleryAdminPhotos({
  galleryId,
  revision,
  busy,
  request,
  run,
}: {
  galleryId: string;
  revision: number;
  busy: boolean;
  request: Request;
  run: (work: () => Promise<void>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const key = `${revision}:${refresh}`;
  const [data, setData] = useState<{
    key: string;
    assets: Photo[];
    error?: string;
  } | null>(null);
  const [cleanup, setCleanup] = useState<Photo[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const base = `/api/gallery-management/galleries/${galleryId}`;
  useEffect(() => {
    if (!open) return;
    let active = true;
    request(`${base}/assets`)
      .then((value) => {
        const result = value as { assets?: Photo[] };
        if (!Array.isArray(result.assets))
          throw new Error(
            "Unable to read photographs. Refresh photographs and try again.",
          );
        if (active) setData({ key, assets: result.assets });
      })
      .catch((error) => {
        if (active)
          setData({
            key,
            assets: [],
            error:
              error instanceof Error
                ? error.message
                : "Unable to load photographs.",
          });
      });
    return () => {
      active = false;
    };
  }, [open, key, base, request]);
  const remove = (photo: Photo, retry = false) =>
    void run(async () => {
      if (
        !retry &&
        !window.confirm(
          `Remove “${photo.altText || "this photograph"}” from this gallery? Clients will no longer be able to view or download it. Previously downloaded copies are not affected.`,
        )
      )
        return;
      const result = (await request(`${base}/remove`, {
        assetId: photo.id,
      })) as { success?: boolean; cleanupComplete?: boolean };
      if (
        result.success !== true ||
        typeof result.cleanupComplete !== "boolean"
      )
        throw new Error(
          "Removal could not be confirmed. Refresh photographs before retrying.",
        );
      setData((previous) =>
        previous
          ? {
              ...previous,
              assets: previous.assets.filter((asset) => asset.id !== photo.id),
            }
          : previous,
      );
      setCleanup((previous) =>
        result.cleanupComplete
          ? previous.filter((asset) => asset.id !== photo.id)
          : [...previous.filter((asset) => asset.id !== photo.id), photo],
      );
      heading.current?.focus();
    });
  const loading = open && data?.key !== key;
  const photos = loading ? [] : (data?.assets ?? []);
  return (
    <section
      aria-label="Manage gallery photographs"
      className="mt-8 border-t border-studio-border pt-6"
    >
      <h3 ref={heading} tabIndex={-1} className="mb-3 text-lg text-studio-text">
        Photographs
      </h3>
      {!open ? (
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={() => setOpen(true)}
        >
          Manage photographs
        </button>
      ) : (
        <>
          <button
            type="button"
            className={button + " mb-4"}
            disabled={busy || loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh photographs
          </button>
          {loading ? (
            <p role="status" className="text-sm">
              Loading photographs…
            </p>
          ) : data?.error ? (
            <p role="alert" className="text-sm">
              {data.error}
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-studio-muted">
                {photos.length} photograph{photos.length === 1 ? "" : "s"}.
                Remove any photographs uploaded by mistake.
              </p>
              <ul className="grid max-h-[32rem] grid-cols-2 gap-3 overflow-y-auto">
                {photos.map((photo, index) => (
                  <li
                    key={photo.id}
                    className="min-w-0 rounded border border-studio-border p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- role-protected private preview endpoint */}
                    <img
                      src={`${base}/preview?assetId=${encodeURIComponent(photo.id)}`}
                      alt={photo.altText || `Photo ${index + 1}`}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="mb-3 aspect-[4/3] w-full rounded bg-studio-surface object-cover"
                    />
                    <p className="mb-2 break-words text-xs text-studio-muted">
                      {photo.altText || `Photo ${index + 1}`}
                    </p>
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      aria-label={`Remove photo ${index + 1}: ${photo.altText}`}
                      onClick={() => remove(photo)}
                    >
                      Remove photo
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {cleanup.length > 0 && (
            <div role="status" className="mt-4 space-y-3 text-sm">
              <p>
                These photographs are removed from the gallery, but stored-file
                cleanup has not finished. Retry cleanup before leaving.
              </p>
              {cleanup.map((photo) => (
                <div
                  key={photo.id}
                  className="flex flex-wrap items-center gap-3"
                >
                  <span>{photo.altText || "Removed photograph"}</span>
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => remove(photo, true)}
                  >
                    Retry file cleanup
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
