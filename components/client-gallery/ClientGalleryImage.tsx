"use client";

import type { ClientGalleryAsset } from "@/lib/client-galleries/contracts";

type ClientGalleryImageProps = {
  asset: ClientGalleryAsset;
  position: number;
  onOpen: (opener: HTMLButtonElement) => void;
};

export function ClientGalleryImage({
  asset,
  position,
  onOpen,
}: ClientGalleryImageProps) {
  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      aria-label={`Open image ${position}: ${asset.altText}`}
      className="group relative block w-full overflow-hidden rounded-md bg-studio-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9955a] focus-visible:ring-offset-4 focus-visible:ring-offset-studio-base"
      style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- future secure image URLs are request-time Function endpoints */}
      <img
        src={asset.webImageUrl}
        alt={asset.altText}
        width={asset.width}
        height={asset.height}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover transition duration-700 ease-out motion-reduce:transition-none md:group-hover:scale-[1.015]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 border border-white/0 transition-colors duration-300 group-hover:border-white/20"
      />
    </button>
  );
}