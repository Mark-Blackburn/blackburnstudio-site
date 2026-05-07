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

export default function FamiliesGrid({ images }: { images: GalleryImage[] }) {
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
  //  1 L  — cinematic opener, full-width
  //  2 P  | 3 L  — emotional intimacy (anchor + supporting landscape)
  //  4 P  | 5 P  — structured portraiture pair
  //  6 L  — storytelling breath, full-width
  //  7 L  | 8 L  — paired landscapes (environmental context)
  //  9 L  — emotional moment, full-width
  // 10 P  | 11 L — quiet duet
  // 12 P  — playful closing, centred narrower
  // Intrinsic-aspect cards: each frame uses its image's true width/height,
  // so no cropping occurs. Layout stability preserved because plaiceholder
  // metadata is baked in at build time and applied via CSS aspect-ratio
  // before the image loads. Editorial composition is unchanged — only the
  // frame ratios are now derived from the photographs themselves.
  return (
    <>
      <div className="flex flex-col gap-8 md:gap-12">
        {/* 1 — cinematic opener */}
        <GalleryImageCard
          image={images[0]}
          onOpen={(o) => open(0, o)}
          intrinsicAspect
        />

        {/* 2 + 3 — emotional intimacy */}
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

        {/* 4 + 5 — structured portraiture pair, narrowed and centred so two
            portrait frames don't dominate the page rhythm */}
        <div className="mx-auto w-full md:max-w-4xl">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
            <GalleryImageCard
              image={images[3]}
              onOpen={(o) => open(3, o)}
              intrinsicAspect
            />
            <GalleryImageCard
              image={images[4]}
              onOpen={(o) => open(4, o)}
              intrinsicAspect
            />
          </div>
        </div>

        {/* 6 — storytelling breath, full-width */}
        <GalleryImageCard
          image={images[5]}
          onOpen={(o) => open(5, o)}
          intrinsicAspect
        />

        {/* 7 + 8 — paired landscapes */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard
            image={images[6]}
            onOpen={(o) => open(6, o)}
            intrinsicAspect
          />
          <GalleryImageCard
            image={images[7]}
            onOpen={(o) => open(7, o)}
            intrinsicAspect
          />
        </div>

        {/* 9 — emotional moment, full-width */}
        <GalleryImageCard
          image={images[8]}
          onOpen={(o) => open(8, o)}
          intrinsicAspect
        />

        {/* 10 + 11 — quiet duet */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
          <GalleryImageCard
            image={images[9]}
            onOpen={(o) => open(9, o)}
            intrinsicAspect
          />
          <GalleryImageCard
            image={images[10]}
            onOpen={(o) => open(10, o)}
            intrinsicAspect
          />
        </div>

        {/* 12 — playful closing, centred and narrower.
            Small additional top spacing acts as a gentle editorial exhale
            before the final image. Subtle, not a structural break. */}
        <div className="mt-2 grid grid-cols-1 gap-6 md:mt-4 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-6 md:col-start-4">
            <GalleryImageCard
              image={images[11]}
              onOpen={(o) => open(11, o)}
              intrinsicAspect
            />
          </div>
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
