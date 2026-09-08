"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { useLightboxGestures } from "@/components/gallery/lightbox/useLightboxGestures";
import { useScrollLock } from "@/components/gallery/lightbox/useScrollLock";
import type { ClientGalleryAsset } from "@/lib/client-galleries/contracts";

type ClientGalleryViewerProps = {
  assets: ClientGalleryAsset[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  renderActions?: (asset: ClientGalleryAsset) => ReactNode;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ClientGalleryViewer({
  assets,
  index,
  onIndexChange,
  onClose,
  returnFocusRef,
  renderActions,
}: ClientGalleryViewerProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const total = assets.length;
  const gestureTotal = Math.max(total, 1);
  const normalizedIndex = Number.isFinite(index) ? index : 0;
  const safeIndex =
    total > 0 ? ((normalizedIndex % total) + total) % total : 0;

  useScrollLock(total > 0);

  const {
    dragX,
    dragY,
    animating,
    slideGap,
    prevIndex,
    nextIndex,
    goPrev,
    goNext,
    touchHandlers,
  } = useLightboxGestures({
    viewportRef,
    index: safeIndex,
    total: gestureTotal,
    setIndex: onIndexChange,
    onClose,
  });

  useEffect(() => {
    if (total === 0) return;

    const returnFocusTo = returnFocusRef.current;
    closeButtonRef.current?.focus();

    const containFocus = (event: FocusEvent) => {
      if (!dialogRef.current?.contains(event.target as Node)) {
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener("focusin", containFocus);
    return () => {
      document.removeEventListener("focusin", containFocus);
      returnFocusTo?.focus();
    };
  }, [returnFocusRef, total]);

  if (total === 0) {
    return null;
  }

  const currentAsset = assets[safeIndex];

  if (!currentAsset) {
    return null;
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (total > 1) {
        goPrev();
      }
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (total > 1) {
        goNext();
      }
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    );
    if (focusable.length === 0) {
      event.preventDefault();
      closeButtonRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const slides = [
    { asset: assets[prevIndex], offset: -1 },
    { asset: currentAsset, offset: 0 },
    { asset: assets[nextIndex], offset: 1 },
  ].filter(
    (slide): slide is { asset: ClientGalleryAsset; offset: -1 | 0 | 1 } =>
      Boolean(slide.asset),
  );
  const closeProgress = Math.min(Math.abs(dragY) / 220, 1);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-gallery-viewer-title"
      onKeyDown={handleKeyDown}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <h2 id="client-gallery-viewer-title" className="sr-only">
        Full-screen gallery viewer
      </h2>

      <div className="relative z-20 flex min-h-16 items-center justify-between gap-4 border-b border-white/10 px-4 md:px-6">
        <p aria-live="polite" className="text-xs text-white/60">
          {safeIndex + 1} of {total}
        </p>
        <div className="flex items-center gap-2">
          {renderActions ? renderActions(currentAsset) : null}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            aria-label="Close image viewer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-2xl text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2b47b]"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goPrev();
          }}
          aria-label="Previous image"
          disabled={total < 2}
          className="absolute left-2 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-2xl text-white/75 transition hover:bg-black/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2b47b] disabled:hidden md:left-6"
        >
          <span aria-hidden="true">&lsaquo;</span>
        </button>

        <div
          ref={viewportRef}
          onClick={(event) => event.stopPropagation()}
          onTouchStart={touchHandlers.onTouchStart}
          onTouchMove={touchHandlers.onTouchMove}
          onTouchEnd={touchHandlers.onTouchEnd}
          className="absolute inset-0 overflow-hidden touch-none select-none"
          style={{
            transform: `translateY(${dragY}px) scale(${1 - closeProgress * 0.05})`,
            opacity: 1 - closeProgress * 0.45,
            transition: animating
              ? "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms cubic-bezier(0.22, 1, 0.36, 1)"
              : undefined,
          }}
        >
          <div
            className="relative h-full w-full motion-reduce:transition-none"
            style={{
              transform: `translate3d(${dragX}px, 0, 0)`,
              transition: animating
                ? "transform 260ms cubic-bezier(0.22, 1.08, 0.36, 1)"
                : undefined,
            }}
          >
            {slides.map(({ asset, offset }) => (
              <div
                key={`${asset.id}-${offset}`}
                aria-hidden={offset !== 0}
                className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 md:p-12"
                style={{
                  transform: `translateX(calc(${offset * 100}% + ${offset * slideGap}px))`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- future secure image URLs are request-time Function endpoints */}
                <img
                  src={asset.webImageUrl}
                  alt={offset === 0 ? asset.altText : ""}
                  width={asset.width}
                  height={asset.height}
                  loading={offset === 0 ? "eager" : "lazy"}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="max-h-full max-w-full object-contain select-none"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          aria-label="Next image"
          disabled={total < 2}
          className="absolute right-2 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-2xl text-white/75 transition hover:bg-black/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2b47b] disabled:hidden md:right-6"
        >
          <span aria-hidden="true">&rsaquo;</span>
        </button>
      </div>
    </div>
  );
}