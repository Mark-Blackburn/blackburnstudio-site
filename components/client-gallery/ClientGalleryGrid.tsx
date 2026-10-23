"use client";

import { ClientGalleryImage } from "@/components/client-gallery/ClientGalleryImage";
import type { ClientGalleryAsset } from "@/lib/client-galleries/contracts";

type ClientGalleryGridProps = {
  assets: ClientGalleryAsset[];
  onOpen: (index: number, opener: HTMLButtonElement) => void;
  selected?: Set<string>;
  onToggleSelection?: (id: string) => void;
};

export function ClientGalleryGrid({
  assets,
  onOpen,
  selected,
  onToggleSelection,
}: ClientGalleryGridProps) {
  return (
    <div role="group" aria-label="Gallery photographs" className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset, index) => (
        <div key={asset.id} className="min-w-0">
          <ClientGalleryImage
            asset={asset}
            position={index + 1}
            onOpen={(opener) => onOpen(index, opener)}
          />
          {onToggleSelection &&
            (asset.webDownloadUrl || asset.fullDownloadUrl) && (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-studio-text">
                <input
                  type="checkbox"
                  checked={selected?.has(asset.id) ?? false}
                  onChange={() => onToggleSelection(asset.id)}
                  className="h-4 w-4 accent-[#b9955a]"
                  aria-label={`Select image ${index + 1}: ${asset.altText}`}
                />
                Select photo {index + 1}
              </label>
            )}
        </div>
      ))}
    </div>
  );
}
