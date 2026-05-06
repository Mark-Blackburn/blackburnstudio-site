"use client";

type LightboxControlsProps = {
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export function LightboxControls({
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: LightboxControlsProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close image viewer"
        onClick={onClose}
        style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
        className="absolute right-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
      >
        <span aria-hidden="true" className="text-2xl leading-none">
          ×
        </span>
      </button>

      <button
        type="button"
        aria-label="Previous image"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className="absolute left-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-white/40 opacity-0 transition duration-300 ease-out hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 md:inline-flex md:left-6 md:opacity-100"
      >
        <span aria-hidden="true" className="text-3xl leading-none">
          ‹
        </span>
      </button>

      <button
        type="button"
        aria-label="Next image"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-white/40 opacity-0 transition duration-300 ease-out hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 md:inline-flex md:right-6 md:opacity-100"
      >
        <span aria-hidden="true" className="text-3xl leading-none">
          ›
        </span>
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
          onPrev();
        }}
        className="absolute inset-y-0 left-0 z-0 w-[40vw] cursor-default md:hidden"
      />
      <button
        type="button"
        aria-label="Next image"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute inset-y-0 right-0 z-0 w-[40vw] cursor-default md:hidden"
      />
    </>
  );
}
