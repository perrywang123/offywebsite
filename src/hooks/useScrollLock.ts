"use client";

import { useEffect } from "react";

/**
 * Locks page scrolling while an overlay (cart drawer, nav, quick view) is open.
 *
 * Writes `overflow: hidden` on `<html>` and restores whatever inline value was
 * there before. Three overlays share this hook so the restore path is written
 * once (mobile-adaptation-plan §2 A / RC-7).
 */
export function useScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);
}
