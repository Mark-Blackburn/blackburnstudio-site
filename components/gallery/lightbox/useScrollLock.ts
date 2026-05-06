"use client";

import { useLayoutEffect } from "react";

/**
 * Locks body scroll while preserving (and restoring) the current scroll
 * position. Uses `useLayoutEffect` so the lock is committed before paint —
 * prevents a one-frame visual jump when opening from a scrolled position.
 */
export function useScrollLock(enabled: boolean) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevWidth = body.style.width;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
  }, [enabled]);
}
