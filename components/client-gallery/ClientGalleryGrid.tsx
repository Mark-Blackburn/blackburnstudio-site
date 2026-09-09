"use client";

import { ClientGalleryImage } from "@/components/client-gallery/ClientGalleryImage";
import type { ClientGalleryAsset } from "@/lib/client-galleries/contracts";

type ClientGalleryGridProps = {
  assets: ClientGalleryAsset[];
  onOpen: (index: number, opener: HTMLButtonElement) => void;
};

export function ClientGalleryGrid({ assets, onOpen }: ClientGalleryGridProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
      {assets.map((asset, index) => (
        <div
          key={asset.id}
          className={asset.orientation === "landscape" ? "sm:col-span-2" : ""}
        >
          <ClientGalleryImage
            asset={asset}
            position={index + 1}
            onOpen={(opener) => onOpen(index, opener)}
          />
        </div>
      ))}
    </div>
  );
}