"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type PortraitImage = {
  id: number;
  src: string;
  alt: string;
};

const images: PortraitImage[] = [
  { id: 1, src: "/portraits/hero.jpg", alt: "Portrait in soft natural light" },
  { id: 2, src: "/portraits/candid.jpg", alt: "Candid portrait with natural expression" },
  { id: 4, src: "/portraits/male.jpg", alt: "Portrait in soft directional light" },
  { id: 3, src: "/portraits/natural.jpg", alt: "Portrait in warm natural light outdoors" },
  { id: 6, src: "/portraits/connection.jpg", alt: "Portrait capturing a quiet human moment" },
  { id: 7, src: "/portraits/environment.jpg", alt: "Environmental portrait outdoors" },
  { id: 5, src: "/portraits/moody.jpg", alt: "Portrait with subtle shadow and contrast" },
];

function ImageCard({
  image,
  onOpen,
  className = "",
}: {
  image: PortraitImage;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${image.alt}`}
      className={`group relative block aspect-4/5 w-full cursor-pointer overflow-hidden rounded-2xl bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60 ${className}`}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 768px) 50vw, 92vw"
        className="object-cover transition duration-700 ease-out md:group-hover:scale-[1.01]"
      />
    </button>
  );
}

function Lightbox({
  index,
  onClose,
  onPrev,
  onNext,
}: {
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const image = images[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Portrait viewer"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
      >
        <span aria-hidden="true" className="text-2xl leading-none">×</span>
      </button>

      <button
        type="button"
        aria-label="Previous image"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className="absolute left-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 md:left-6"
      >
        <span aria-hidden="true" className="text-3xl leading-none">‹</span>
      </button>

      <button
        type="button"
        aria-label="Next image"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 md:right-6"
      >
        <span aria-hidden="true" className="text-3xl leading-none">›</span>
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative h-[85vh] w-[90vw]"
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="90vw"
          priority
          className="rounded-xl object-contain"
        />
      </div>
    </div>
  );
}

export default function PortraitsGrid() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const open = useCallback((i: number) => setOpenIndex(i), []);
  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(
    () =>
      setOpenIndex((i) =>
        i === null ? null : (i - 1 + images.length) % images.length,
      ),
    [],
  );
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i + 1) % images.length)),
    [],
  );

  return (
    <>
      <div className="flex flex-col gap-8 md:gap-12">
        {/* Row 1: hero large + candid medium */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <ImageCard image={images[0]} onOpen={() => open(0)} className="md:col-span-2" />
          <ImageCard image={images[1]} onOpen={() => open(1)} />
        </div>

        {/* Row 2: male + natural */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <ImageCard image={images[2]} onOpen={() => open(2)} />
          <ImageCard image={images[3]} onOpen={() => open(3)} />
        </div>

        {/* Row 3: connection + environment */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <ImageCard image={images[4]} onOpen={() => open(4)} />
          <ImageCard image={images[5]} onOpen={() => open(5)} />
        </div>

        {/* Row 4: moody, centred */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-8">
          <ImageCard
            image={images[6]}
            onOpen={() => open(6)}
            className="md:col-start-2 md:col-span-2"
          />
        </div>
      </div>

      {openIndex !== null && (
        <Lightbox
          index={openIndex}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </>
  );
}
