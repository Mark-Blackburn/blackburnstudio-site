"use client";

import { useCallback, useState } from "react";

import {
  GalleryImageCard,
  Lightbox,
  MORPH_DURATION,
  type GalleryImage,
  type MorphOrigin,
  type MorphPhase,
} from "@/components/gallery";

export default function JapanGrid({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [origin, setOrigin] = useState<MorphOrigin | null>(null);
  const [morphPhase, setMorphPhase] = useState<MorphPhase>("open");

  const open = useCallback((i: number, o: MorphOrigin) => {
    setClosing(false);
    setOrigin(o);
    setMorphPhase("opening");
    setOpenIndex(i);
    window.setTimeout(() => setMorphPhase("open"), MORPH_DURATION);
  }, []);

  const close = useCallback(() => {
    setMorphPhase("closing");
    setClosing(true);
    window.setTimeout(() => {
      setOpenIndex(null);
      setClosing(false);
      setOrigin(null);
      setMorphPhase("open");
    }, MORPH_DURATION);
  }, []);

  // Curated editorial rhythm — sequence preserved exactly.
  //  1 — soft tactile overture, full-width
  //  2 + 3 — figure + abstract companion
  //  4 — first landscape breath, full-width
  //  5 + 6 — architectural duet
  //  7 — atmospheric / ceremonial centrepiece, full-width
  //  8 + 9 — human moments
  // 10 — nocturnal pause, full-width
  // 11 + 12 — figure + detail
  // 13 + 14 — quiet closing duet, with subtle editorial exhale
  return (
    <>
      <div className="flex flex-col gap-8 md:gap-12">
        {/* 1 — overture */}
        <GalleryImageCard
          image={images[0]}
          onOpen={(o) => open(0, o)}
          intrinsicAspect
        />

        {/* 2 + 3 — figure + abstract companion */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard
            image={images[1]}
            onOpen={(o) => open(1, o)}
            intrinsicAspect
          />
          <GalleryImageCard
            image={images[2]}
            onOpen={(o) => open(2, o)}
            intrinsicAspect
          />
        </div>

        {/* 4 — first landscape breath */}
        <GalleryImageCard
          image={images[3]}
          onOpen={(o) => open(3, o)}
          intrinsicAspect
        />

        {/* 5 + 6 — architectural duet */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard
            image={images[4]}
            onOpen={(o) => open(4, o)}
            intrinsicAspect
          />
          <GalleryImageCard
            image={images[5]}
            onOpen={(o) => open(5, o)}
            intrinsicAspect
          />
        </div>

        {/* 7 — atmospheric centrepiece */}
        <GalleryImageCard
          image={images[6]}
          onOpen={(o) => open(6, o)}
          intrinsicAspect
        />

        {/* 8 + 9 — human moments */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard
            image={images[7]}
            onOpen={(o) => open(7, o)}
            intrinsicAspect
          />
          <GalleryImageCard
            image={images[8]}
            onOpen={(o) => open(8, o)}
            intrinsicAspect
          />
        </div>

        {/* 10 — nocturnal pause */}
        <GalleryImageCard
          image={images[9]}
          onOpen={(o) => open(9, o)}
          intrinsicAspect
        />

        {/* 11 + 12 — figure + detail */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard
            image={images[10]}
            onOpen={(o) => open(10, o)}
            intrinsicAspect
          />
          <GalleryImageCard
            image={images[11]}
            onOpen={(o) => open(11, o)}
            intrinsicAspect
          />
        </div>

        {/* 13 + 14 — quiet closing duet.
            Small additional top spacing acts as a gentle editorial exhale
            before the final pair. Subtle, not a structural break. */}
        <div className="mt-2 grid grid-cols-1 items-start gap-6 md:mt-4 md:grid-cols-2 md:gap-8">
          <GalleryImageCard
            image={images[12]}
            onOpen={(o) => open(12, o)}
            intrinsicAspect
          />
          <GalleryImageCard
            image={images[13]}
            onOpen={(o) => open(13, o)}
            intrinsicAspect
          />
        </div>
      </div>

      {openIndex !== null && (
        <Lightbox
          images={images}
          index={openIndex}
          setIndex={setOpenIndex}
          onClose={close}
          closing={closing}
          origin={origin}
          morphPhase={morphPhase}
        />
      )}
    </>
  );
}
