"use client";

import { useEffect, useRef } from "react";

export type RevealVariant = "up" | "fade" | "left" | "right" | "clip";

export interface RevealOptions {
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
  variant?: RevealVariant;
}

/**
 * Reveal-on-scroll: adds `.is-in` to the element when it enters the viewport.
 * Progressive enhancement — initial hidden state only applies under `<html class="js">`.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {},
) {
  const {
    once = true,
    threshold = 0.15,
    rootMargin = "0px 0px -10% 0px",
    delay = 0,
    variant = "up",
  } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--reveal-delay", `${delay}ms`);
    el.dataset.variant = variant;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            if (once) io.unobserve(entry.target);
          }
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold, rootMargin, delay, variant]);

  return ref;
}
