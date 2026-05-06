"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
} from "react";

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

const CLOSE_THRESHOLD = 100;
const DIRECTION_LOCK = 10;

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

type Axis = "none" | "x" | "y";

function Lightbox({
  index,
  setIndex,
  onClose,
}: {
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
}) {
  const total = images.length;
  const prevIndex = (index - 1 + total) % total;
  const nextIndex = (index + 1) % total;

  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Drag state
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [animating, setAnimating] = useState(false);
  const animatingRef = useRef(false);
  const axisRef = useRef<Axis>("none");
  const startX = useRef(0);
  const startY = useRef(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = m.matches;
    const handler = () => (reducedMotionRef.current = m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  // keyboard + scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goTo(prevIndex);
      else if (e.key === "ArrowRight") goTo(nextIndex);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
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
      setDragX(direction * width);
      window.setTimeout(() => {
        setIndex(target);
        setAnimating(false);
        animatingRef.current = false;
        setDragX(0);
      }, 260);
    },
    [nextIndex, prevIndex, setIndex],
  );

  const handleTouchStart = (e: ReactTouchEvent) => {
    if (animatingRef.current) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    axisRef.current = "none";
    setAnimating(false);
  };

  const handleTouchMove = (e: ReactTouchEvent) => {
    if (animatingRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    if (axisRef.current === "none") {
      if (Math.abs(dx) > Math.abs(dy) + DIRECTION_LOCK) axisRef.current = "x";
      else if (Math.abs(dy) > Math.abs(dx) + DIRECTION_LOCK) axisRef.current = "y";
      else return;
    }

    if (axisRef.current === "x") setDragX(dx);
    else if (axisRef.current === "y") setDragY(dy);
  };

  const handleTouchEnd = () => {
    if (animatingRef.current) return;
    const width = viewportRef.current?.offsetWidth ?? window.innerWidth;
    const swipeThreshold = Math.max(50, width * 0.2);

    if (axisRef.current === "x") {
      if (dragX <= -swipeThreshold) goTo(nextIndex);
      else if (dragX >= swipeThreshold) goTo(prevIndex);
      else {
        setAnimating(true);
        setDragX(0);
        window.setTimeout(() => setAnimating(false), 260);
      }
    } else if (axisRef.current === "y") {
      if (Math.abs(dragY) >= CLOSE_THRESHOLD) {
        onClose();
      } else {
        setAnimating(true);
        setDragY(0);
        window.setTimeout(() => setAnimating(false), 260);
      }
    }
    axisRef.current = "none";
  };

  // backdrop opacity reduces during vertical close drag
  const closeProgress = Math.min(Math.abs(dragY) / 300, 0.6);

  const slides: { img: PortraitImage; offset: number }[] = [
    { img: images[prevIndex], offset: -1 },
    { img: images[index], offset: 0 },
    { img: images[nextIndex], offset: 1 },
  ];

  const transitionClass = animating
    ? "transition-transform duration-[260ms] ease-out"
    : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Portrait image viewer"
      onClick={onClose}
      style={{ backgroundColor: `rgba(0,0,0,${0.9 - closeProgress})` }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm motion-safe:animate-fade-in"
    >
      <button
        type="button"
        aria-label="Close image viewer"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
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
        className="absolute left-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 md:inline-flex md:left-6"
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
        className="absolute right-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 md:inline-flex md:right-6"
      >
        <span aria-hidden="true" className="text-3xl leading-none">›</span>
      </button>

      <p
        aria-live="polite"
        className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-xs font-medium uppercase tracking-[0.3em] text-white/60"
      >
        {index + 1} / {total}
      </p>

      <div
        ref={viewportRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateY(${dragY}px)` }}
        className={`relative h-[84vh] w-[92vw] max-w-[92vw] overflow-hidden touch-pan-y select-none ${transitionClass}`}
      >
        <div
          style={{ transform: `translate3d(${dragX}px, 0, 0)` }}
          className={`flex h-full w-full ${transitionClass}`}
        >
          {slides.map(({ img, offset }) => (
            <div
              key={`${img.id}-${offset}`}
              style={{
                transform: `translateX(${offset * 100}%)`,
                left: 0,
              }}
              className="absolute inset-0 flex h-full w-full items-center justify-center"
            >
              <div className="relative h-full w-full">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="92vw"
                  priority={offset === 0}
                  draggable={false}
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PortraitsGrid() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const open = useCallback((i: number) => setOpenIndex(i), []);
  const close = useCallback(() => setOpenIndex(null), []);

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
          setIndex={setOpenIndex}
          onClose={close}
        />
      )}
    </>
  );
}
