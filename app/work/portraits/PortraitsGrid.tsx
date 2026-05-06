"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
} from "react";

export type PortraitImage = {
  id: number;
  src: string;
  alt: string;
  blurDataURL: string;
};

export type MorphOrigin = {
  rect: DOMRect;
  borderRadius: string;
};

const CLOSE_THRESHOLD = 100;
const DIRECTION_LOCK = 10;
const TAP_MOVEMENT_THRESHOLD = 8;
const SLIDE_GAP_MOBILE = 24;
const SLIDE_GAP_DESKTOP = 32;
const RESISTANCE_RATIO = 0.35;
const FREE_DRAG_RATIO = 0.6;
const VELOCITY_THRESHOLD = 0.4; // px/ms
const DISTANCE_RATIO = 0.2;
const EASE_PREMIUM = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_SNAP = "cubic-bezier(0.22, 1.08, 0.36, 1)";
const EASE_MORPH = "cubic-bezier(0.22, 1.08, 0.36, 1)";
const MORPH_DURATION = 260;

function ImageCard({
  image,
  onOpen,
  className = "",
}: {
  image: PortraitImage;
  onOpen: (origin: MorphOrigin) => void;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const borderRadius = window.getComputedStyle(el).borderRadius;
        onOpen({ rect, borderRadius });
      }}
      aria-label={`Open ${image.alt}`}
      className={`group relative block aspect-4/5 w-full cursor-pointer overflow-hidden rounded-2xl bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60 ${className}`}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 768px) 50vw, 92vw"
        placeholder="blur"
        blurDataURL={image.blurDataURL}
        decoding="async"
        className="object-cover transition duration-700 ease-out md:group-hover:scale-[1.01]"
      />
    </button>
  );
}

type Axis = "none" | "x" | "y";

function Lightbox({
  images,
  index,
  setIndex,
  onClose,
  closing,
  origin,
  morphPhase,
}: {
  images: PortraitImage[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
  closing: boolean;
  origin: MorphOrigin | null;
  morphPhase: "opening" | "open" | "closing";
}) {
  const total = images.length;
  const prevIndex = (index - 1 + total) % total;
  const nextIndex = (index + 1) % total;

  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Drag state
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [slideGap, setSlideGap] = useState(SLIDE_GAP_MOBILE);
  const [viewportWidth, setViewportWidth] = useState(0);
  const animatingRef = useRef(false);
  const axisRef = useRef<Axis>("none");
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const movedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const apply = () => setSlideGap(m.matches ? SLIDE_GAP_DESKTOP : SLIDE_GAP_MOBILE);
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const measure = () => {
      setViewportWidth(viewportRef.current?.offsetWidth ?? window.innerWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = m.matches;
    const handler = () => (reducedMotionRef.current = m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  // keyboard + body scroll lock (preserves scroll position).
  // useLayoutEffect avoids a one-frame visual jump when opening from a
  // scrolled position — the lock applies before the browser paints.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goTo(prevIndex);
      else if (e.key === "ArrowRight") goTo(nextIndex);
    };
    window.addEventListener("keydown", onKey);

    const scrollY = window.scrollY;
    const body = document.body;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevWidth = body.style.width;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      window.removeEventListener("keydown", onKey);
      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevIndex, nextIndex, onClose]);

  const goTo = useCallback(
    (target: number) => {
      if (animatingRef.current) return;
      const width = viewportRef.current?.offsetWidth ?? window.innerWidth;
      const direction = target === nextIndex ? -1 : target === prevIndex ? 1 : 0;
      if (direction === 0 || reducedMotionRef.current) {
        setIndex(target);
        setDragX(0);
        setDragY(0);
        return;
      }
      animatingRef.current = true;
      setAnimating(true);
      setDragX(direction * (width + slideGap));
      window.setTimeout(() => {
        setIndex(target);
        setAnimating(false);
        animatingRef.current = false;
        setDragX(0);
      }, 260);
    },
    [nextIndex, prevIndex, setIndex, slideGap],
  );

  const handleTouchStart = (e: ReactTouchEvent) => {
    if (animatingRef.current) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startTime.current = performance.now();
    axisRef.current = "none";
    movedRef.current = false;
    setAnimating(false);
  };

  const applyResistance = (delta: number, width: number) => {
    const freeLimit = width * FREE_DRAG_RATIO;
    if (Math.abs(delta) <= freeLimit) return delta;
    const excess = Math.abs(delta) - freeLimit;
    const easedExcess =
      excess * RESISTANCE_RATIO * (1 - Math.exp(-excess / 120));
    return Math.sign(delta) * (freeLimit + easedExcess);
  };

  const dampenStart = (delta: number) =>
    Math.abs(delta) < 12 ? delta * 0.6 : delta;

  const handleTouchMove = (e: ReactTouchEvent) => {
    if (animatingRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    if (Math.abs(dx) > TAP_MOVEMENT_THRESHOLD || Math.abs(dy) > TAP_MOVEMENT_THRESHOLD) {
      movedRef.current = true;
    }

    if (axisRef.current === "none") {
      if (Math.abs(dx) > Math.abs(dy) + DIRECTION_LOCK) axisRef.current = "x";
      else if (Math.abs(dy) > Math.abs(dx) + DIRECTION_LOCK) axisRef.current = "y";
      else return;
    }

    if (axisRef.current === "x") {
      const width = viewportRef.current?.offsetWidth ?? window.innerWidth;
      // Strict horizontal lock: ignore vertical motion entirely once locked to x.
      setDragX(applyResistance(dampenStart(dx), width));
      if (dragY !== 0) setDragY(0);
    } else if (axisRef.current === "y") {
      // Pure vertical close gesture: no horizontal drift.
      if (dragX !== 0) setDragX(0);
      setDragY(dy);
    }
  };

  const handleTouchEnd = (e: ReactTouchEvent) => {
    if (animatingRef.current) return;
    const width = viewportRef.current?.offsetWidth ?? window.innerWidth;
    const distanceThreshold = Math.max(50, width * DISTANCE_RATIO);
    const elapsed = Math.max(1, performance.now() - startTime.current);

    if (axisRef.current === "x") {
      const velocity = dragX / elapsed; // px/ms (signed)
      const directionIntent = Math.sign(velocity) === Math.sign(dragX);
      const fastEnough =
        Math.abs(velocity) >= VELOCITY_THRESHOLD && directionIntent;
      const farEnough = Math.abs(dragX) >= distanceThreshold;
      if (farEnough || fastEnough) {
        if (dragX < 0) goTo(nextIndex);
        else goTo(prevIndex);
      } else {
        requestAnimationFrame(() => {
          setAnimating(true);
          setDragX(0);
        });
        window.setTimeout(() => setAnimating(false), 260);
      }
    } else if (axisRef.current === "y") {
      const velocityY = dragY / elapsed; // px/ms (signed)
      const fastVerticalClose = Math.abs(velocityY) >= 0.5;
      if (Math.abs(dragY) >= CLOSE_THRESHOLD || fastVerticalClose) {
        window.setTimeout(() => onClose(), 50);
      } else {
        requestAnimationFrame(() => {
          setAnimating(true);
          setDragX(0);
          setDragY(0);
        });
        window.setTimeout(() => setAnimating(false), 260);
      }
    } else if (!movedRef.current) {
      // Treat as tap: forgiving mobile zones (left 40% / right 40%)
      const rect = viewportRef.current?.getBoundingClientRect();
      const t = e.changedTouches[0];
      if (rect && t) {
        const xRel = (t.clientX - rect.left) / rect.width;
        if (xRel <= 0.4) goTo(prevIndex);
        else if (xRel >= 0.6) goTo(nextIndex);
      }
    }
    axisRef.current = "none";
    movedRef.current = false;
  };

  // backdrop opacity reduces during vertical close drag
  const closeProgress = Math.min(Math.abs(dragY) / 300, 0.6);
  // backdrop blur ramps up while open, eases off during vertical close drag
  const backdropBlurPx =
    morphPhase === "open" && !closing
      ? Math.max(0, 8 - (closeProgress / 0.6) * 8)
      : 0;
  // tactile feedback: scale + opacity falloff during vertical close drag
  const verticalCloseProgress = Math.min(Math.abs(dragY) / 140, 1);
  const verticalScale = 1 - verticalCloseProgress * 0.08;
  const verticalOpacity = 1 - verticalCloseProgress * 0.5;

  // horizontal drag progress (0–1) for active-image scale
  const dragProgress =
    viewportWidth > 0 ? Math.min(Math.abs(dragX) / viewportWidth, 1) : 0;
  const easedDragProgress = 1 - Math.pow(1 - dragProgress, 2);
  const activeScale = 1 - easedDragProgress * 0.05;

  const slides: { img: PortraitImage; offset: number }[] = [
    { img: images[prevIndex], offset: -1 },
    { img: images[index], offset: 0 },
    { img: images[nextIndex], offset: 1 },
  ];

  const transitionClass = "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Portrait image viewer"
      onClick={onClose}
      style={{
        backgroundColor: `rgba(0,0,0,${(closing || morphPhase === "closing" ? 0 : 0.95) - closeProgress})`,
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        backdropFilter: `blur(${backdropBlurPx}px)`,
        WebkitBackdropFilter: `blur(${backdropBlurPx}px)`,
        transition: `background-color ${MORPH_DURATION}ms ${EASE_PREMIUM}, backdrop-filter ${MORPH_DURATION}ms ${EASE_PREMIUM}`,
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close image viewer"
        onClick={onClose}
        style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
        className="absolute right-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
      >
        <span aria-hidden="true" className="text-2xl leading-none">×</span>
      </button>

      <button
        type="button"
        aria-label="Previous image"
        onClick={(e) => {
          e.stopPropagation();
          goTo(prevIndex);
        }}
        className="absolute left-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-white/40 opacity-0 transition duration-300 ease-out hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 md:inline-flex md:left-6 md:opacity-100"
      >
        <span aria-hidden="true" className="text-3xl leading-none">‹</span>
      </button>

      <button
        type="button"
        aria-label="Next image"
        onClick={(e) => {
          e.stopPropagation();
          goTo(nextIndex);
        }}
        className="absolute right-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-white/40 opacity-0 transition duration-300 ease-out hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 md:inline-flex md:right-6 md:opacity-100"
      >
        <span aria-hidden="true" className="text-3xl leading-none">›</span>
      </button>

      <p
        aria-live="polite"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-white/40"
      >
        {index + 1} / {total}
      </p>

      {/* Mobile tap zones — sit behind viewport (z-0); viewport handles in-image taps */}
      <button
        type="button"
        aria-label="Previous image"
        onClick={(e) => {
          e.stopPropagation();
          goTo(prevIndex);
        }}
        className="absolute inset-y-0 left-0 z-0 w-[40vw] cursor-default md:hidden"
      />
      <button
        type="button"
        aria-label="Next image"
        onClick={(e) => {
          e.stopPropagation();
          goTo(nextIndex);
        }}
        className="absolute inset-y-0 right-0 z-0 w-[40vw] cursor-default md:hidden"
      />

      <div
        ref={viewportRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${dragY}px) scale(${closing ? 0.98 : verticalScale})`,
          opacity:
            morphPhase === "open"
              ? closing
                ? 0
                : verticalOpacity
              : 0,
          transition: closing
            ? `transform 220ms ${EASE_PREMIUM}, opacity 220ms ${EASE_PREMIUM}`
            : animating
              ? `transform 260ms ${EASE_PREMIUM}, opacity 260ms ${EASE_PREMIUM}`
              : morphPhase === "open"
                ? `opacity 120ms ${EASE_PREMIUM} 80ms`
                : undefined,
          pointerEvents: morphPhase === "open" ? undefined : "none",
        }}
        className="relative z-10 h-[84vh] w-[92vw] max-w-[92vw] overflow-hidden bg-black touch-pan-y select-none"
      >
        <div
          style={{
            transform: `translate3d(${dragX}px, 0, 0)`,
            transition: animating
              ? `transform 260ms ${EASE_SNAP}`
              : undefined,
          }}
          className={`flex h-full w-full ${transitionClass}`}
        >
          {slides.map(({ img, offset }) => {
            const isActive = offset === 0;
            // Side images dim baseline; incoming side image lifts toward 1 during drag.
            const incomingSign = dragX < 0 ? 1 : dragX > 0 ? -1 : 0;
            const isIncoming = !isActive && offset === incomingSign;
            const sideBase = 0.65;
            const sideOpacity = isIncoming
              ? sideBase + (1 - sideBase) * Math.pow(dragProgress, 1.4)
              : isActive
                ? 1
                : sideBase;
            const slideScale = isActive ? activeScale : 1;
            return (
              <div
                key={`${img.id}-${offset}`}
                style={{
                  transform: `translateX(calc(${offset * 100}% + ${offset * slideGap}px)) scale(${slideScale})`,
                  opacity: sideOpacity,
                  left: 0,
                  transition: animating
                    ? `transform 260ms ${EASE_PREMIUM}, opacity 260ms ${EASE_PREMIUM}`
                    : undefined,
                }}
                className="absolute inset-0 flex h-full w-full items-center justify-center"
              >
              <div className="relative h-full w-full overflow-hidden bg-black">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(min-width: 768px) 80vw, 92vw"
                  priority={isActive}
                  loading="eager"
                  placeholder="empty"
                  decoding="async"
                  draggable={false}
                  className="object-contain select-none"
                />
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <MorphOverlay
        image={images[index]}
        origin={origin}
        phase={morphPhase}
      />
    </div>
  );
}

function MorphOverlay({
  image,
  origin,
  phase,
}: {
  image: PortraitImage;
  origin: MorphOrigin | null;
  phase: "opening" | "open" | "closing";
}) {
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    if (phase === "open") {
      setStyle(null);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const round = (v: number) => Math.round(v);
    const target = computeCenteredRect();
    const originRect = origin?.rect ?? null;
    const originRadius = origin?.borderRadius ?? "0px";
    const initial = originRect ?? target;
    const start: React.CSSProperties = {
      position: "fixed",
      top: round(phase === "opening" ? initial.top : target.top) + "px",
      left: round(phase === "opening" ? initial.left : target.left) + "px",
      width: round(phase === "opening" ? initial.width : target.width) + "px",
      height: round(phase === "opening" ? initial.height : target.height) + "px",
      transform:
        (phase === "opening" ? "scale(0.98)" : "scale(1)") + " translateZ(0)",
      opacity: phase === "opening" ? (originRect ? 1 : 0) : 1,
      transition: "none",
      borderRadius: phase === "opening" && originRect ? originRadius : "0px",
      overflow: "hidden",
      backgroundColor: "#000",
      zIndex: 60,
      willChange: "transform, top, left, width, height, opacity",
      pointerEvents: "none",
    };
    // Write initial style synchronously so the browser commits it before
    // the rAF that triggers the animated end state — prevents a 1-frame flash.
    setStyle(start);
    if (reduce) {
      // Skip morph: jump to fade
      requestAnimationFrame(() => {
        setStyle({
          ...start,
          opacity: phase === "opening" ? 1 : 0,
          transition: `opacity 180ms ${EASE_PREMIUM}`,
        });
      });
      return;
    }
    const raf = requestAnimationFrame(() => {
      const end =
        phase === "opening"
          ? {
              top: round(target.top),
              left: round(target.left),
              width: round(target.width),
              height: round(target.height),
              transform: "scale(1) translateZ(0)",
              opacity: 1,
              borderRadius: "0px",
            }
          : {
              top: round((originRect ?? target).top),
              left: round((originRect ?? target).left),
              width: round((originRect ?? target).width),
              height: round((originRect ?? target).height),
              transform: "scale(0.98) translateZ(0)",
              opacity: originRect ? 1 : 0,
              borderRadius: originRect ? originRadius : "0px",
            };
      setStyle({
        ...start,
        ...end,
        transition: `top ${MORPH_DURATION}ms ${EASE_MORPH}, left ${MORPH_DURATION}ms ${EASE_MORPH}, width ${MORPH_DURATION}ms ${EASE_MORPH}, height ${MORPH_DURATION}ms ${EASE_MORPH}, transform ${MORPH_DURATION}ms ${EASE_MORPH}, opacity ${MORPH_DURATION}ms ${EASE_MORPH}, border-radius ${MORPH_DURATION}ms ${EASE_MORPH}`,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, origin]);

  if (phase === "open" || !style) return null;

  const hasOrigin = !!origin;
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
        className={
          phase === "opening" || hasOrigin
            ? "object-cover select-none"
            : "object-contain select-none"
        }
      />
    </div>
  );
}

function computeCenteredRect() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = vw * 0.92;
  const h = vh * 0.84;
  return {
    top: (vh - h) / 2,
    left: (vw - w) / 2,
    width: w,
    height: h,
  };
}

export default function PortraitsGrid({ images }: { images: PortraitImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [origin, setOrigin] = useState<MorphOrigin | null>(null);
  const [morphPhase, setMorphPhase] =
    useState<"opening" | "open" | "closing">("open");

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

  return (
    <>
      <div className="flex flex-col gap-8 md:gap-12">
        {/* Row 1: hero large + candid medium */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <ImageCard image={images[0]} onOpen={(o) => open(0, o)} className="md:col-span-2" />
          <ImageCard image={images[1]} onOpen={(o) => open(1, o)} />
        </div>

        {/* Row 2: male + natural */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <ImageCard image={images[2]} onOpen={(o) => open(2, o)} />
          <ImageCard image={images[3]} onOpen={(o) => open(3, o)} />
        </div>

        {/* Row 3: connection + environment */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <ImageCard image={images[4]} onOpen={(o) => open(4, o)} />
          <ImageCard image={images[5]} onOpen={(o) => open(5, o)} />
        </div>

        {/* Row 4: moody, centred */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-8">
          <ImageCard
            image={images[6]}
            onOpen={(o) => open(6, o)}
            className="md:col-start-2 md:col-span-2"
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
