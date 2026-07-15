"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { EASE_MORPH, EASE_PREMIUM, MORPH_DURATION } from "@/components/gallery/lightbox/constants";
import type { GalleryImage, MorphOrigin, MorphPhase } from "@/components/gallery/types";

// Compute the rect that an image of `imgW × imgH` will occupy inside the
// 92vw × 84vh carousel viewport when rendered with object-contain. Morphing
// to this rect (instead of the outer 92vw × 84vh box) means the overlay's
// cover-filled image already matches the carousel's contain-letterboxed image
// at handoff — eliminating the perceived "shrinks into place" artifact.
function computeContainRect(imgW?: number, imgH?: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const boxW = vw * 0.92;
  const boxH = vh * 0.84;
  if (!imgW || !imgH) {
    return {
      top: (vh - boxH) / 2,
      left: (vw - boxW) / 2,
      width: boxW,
      height: boxH,
    };
  }
  const imgAr = imgW / imgH;
  const boxAr = boxW / boxH;
  let w: number;
  let h: number;
  if (imgAr > boxAr) {
    w = boxW;
    h = boxW / imgAr;
  } else {
    h = boxH;
    w = boxH * imgAr;
  }
  return {
    top: (vh - h) / 2,
    left: (vw - w) / 2,
    width: w,
    height: h,
  };
}

export function MorphOverlay({
  image,
  origin,
  phase,
}: {
  image: GalleryImage;
  origin: MorphOrigin | null;
  phase: MorphPhase;
}) {
  const [style, setStyle] = useState<React.CSSProperties | null>(null);
  // Hold the overlay rendered for a brief cross-fade window after "open" so the
  // carousel takes over without a visible handoff seam.
  const [holdAfterOpen, setHoldAfterOpen] = useState(false);

  useEffect(() => {
    if (phase === "open") {
      // Don't unmount immediately — let the carousel fade in beneath us.
      if (!holdAfterOpen) return;
      return;
    }
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const round = (v: number) => Math.round(v);
    const target = computeContainRect(image.width, image.height);
    const originRect = origin?.rect ?? null;
    const originRadius = origin?.borderRadius ?? "0px";
    const initial = originRect ?? target;
    const start: React.CSSProperties = {
      position: "fixed",
      top: round(phase === "opening" ? initial.top : target.top) + "px",
      left: round(phase === "opening" ? initial.left : target.left) + "px",
      width:
        round(phase === "opening" ? initial.width : target.width) + "px",
      height:
        round(phase === "opening" ? initial.height : target.height) + "px",
      transform: "translateZ(0)",
      opacity: phase === "opening" ? (originRect ? 1 : 0) : 1,
      transition: "none",
      borderRadius:
        phase === "opening" && originRect ? originRadius : "0px",
      overflow: "hidden",
      backgroundColor: "#000",
      zIndex: 60,
      willChange: "transform, top, left, width, height, opacity",
      pointerEvents: "none",
    };
    let cancelled = false;
    let raf = 0;
    let startRaf = 0;
    let reduceRaf = 0;
    startRaf = requestAnimationFrame(() => {
      if (!cancelled) {
        setStyle(start);
      }
    });

    if (reduce) {
      reduceRaf = requestAnimationFrame(() => {
        setStyle({
          ...start,
          opacity: phase === "opening" ? 1 : 0,
          transition: `opacity 180ms ${EASE_PREMIUM}`,
        });
      });
      return () => {
        cancelled = true;
        if (startRaf) cancelAnimationFrame(startRaf);
        if (reduceRaf) cancelAnimationFrame(reduceRaf);
      };
    }

    // Pre-decode the target image so intrinsic sizing is resolved and the
    // bitmap is ready to paint before the morph begins. Eliminates the
    // late-decode "pop" on slower CPUs / Safari.
    const preload = new window.Image();
    preload.decoding = "async";
    preload.src = image.src;
    const ready = preload.decode ? preload.decode().catch(() => undefined) : Promise.resolve();

    ready.then(() => {
      if (cancelled) return;
      // Two rAFs: first commits the start style, second triggers the animated
      // end state. Guarantees the browser has painted the start frame before
      // the transition begins — no first-frame flash.
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          if (cancelled) return;
          const end =
            phase === "opening"
              ? {
                  top: round(target.top),
                  left: round(target.left),
                  width: round(target.width),
                  height: round(target.height),
                  opacity: 1,
                  borderRadius: "0px",
                }
              : {
                  top: round((originRect ?? target).top),
                  left: round((originRect ?? target).left),
                  width: round((originRect ?? target).width),
                  height: round((originRect ?? target).height),
                  opacity: originRect ? 1 : 0,
                  borderRadius: originRect ? originRadius : "0px",
                };
          setStyle({
            ...start,
            ...end,
            transition: `top ${MORPH_DURATION}ms ${EASE_MORPH}, left ${MORPH_DURATION}ms ${EASE_MORPH}, width ${MORPH_DURATION}ms ${EASE_MORPH}, height ${MORPH_DURATION}ms ${EASE_MORPH}, opacity ${MORPH_DURATION}ms ${EASE_MORPH}, border-radius ${MORPH_DURATION}ms ${EASE_MORPH}`,
          });
        });
      });
    });

    return () => {
      cancelled = true;
      if (startRaf) cancelAnimationFrame(startRaf);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [phase, origin, image.src, image.width, image.height, holdAfterOpen]);

  // When the parent transitions to "open", keep rendering for a short
  // cross-fade window so the carousel emerges seamlessly underneath.
  useEffect(() => {
    if (phase !== "open") {
      const resetRaf = requestAnimationFrame(() => {
        setHoldAfterOpen(false);
      });
      return () => {
        cancelAnimationFrame(resetRaf);
      };
    }
    const openRaf = requestAnimationFrame(() => {
      setHoldAfterOpen(true);
    });
    // Fade overlay out over the same window the carousel uses to fade in.
    const fadeStart = requestAnimationFrame(() => {
      setStyle((prev) =>
        prev
          ? {
              ...prev,
              transition: `opacity 160ms ${EASE_PREMIUM}`,
              opacity: 0,
            }
          : prev,
      );
    });
    const t = window.setTimeout(() => setHoldAfterOpen(false), 200);
    return () => {
      cancelAnimationFrame(openRaf);
      cancelAnimationFrame(fadeStart);
      window.clearTimeout(t);
    };
  }, [phase]);

  const styleVisible = style?.opacity !== 0;
  if ((phase === "open" && !holdAfterOpen && !styleVisible) || !style) return null;

  return (
    <div style={style}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 768px) 80vw, 92vw"
        placeholder="blur"
        blurDataURL={image.blurDataURL}
        decoding="async"
        draggable={false}
        priority
        className="object-cover select-none"
      />
    </div>
  );
}
