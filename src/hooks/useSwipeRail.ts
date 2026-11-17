"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

const SETTLE = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
const now = () => performance.now();
const transform = (index: number, offset = 0) =>
  `translateX(calc(${-index * 100}% + ${Math.round(offset * 100) / 100}px))`;
type Point = { x: number; y: number };
type Gesture = {
  origin: Point;
  last: Point;
  axis: "pending" | "horizontal" | "vertical";
  moved: boolean;
  width: number;
  samples: { x: number; t: number }[];
  pointerId?: number;
};

/** Shared finite rail. Touch keeps native pan-y/pinch; mouse/pen use pointer capture after intent. */
export function useSwipeRail(count: number) {
  const [requested, setRequested] = useState(0);
  const active = Math.max(0, Math.min(requested, count - 1));
  const [gestureActive, setGestureActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const swallowClick = useRef(false);

  const paint = useCallback(
    (index: number, offset: number, animate: boolean) => {
      const el = trackRef.current;
      if (!el) return;
      el.style.transition = animate && !reducedMotion ? SETTLE : "none";
      el.style.transform = transform(index, offset);
    },
    [reducedMotion],
  );

  const cancel = useCallback(
    (suppress = false) => {
      const previous = gesture.current;
      gesture.current = null;
      if (previous) {
        swallowClick.current ||= suppress || previous.moved;
        paint(active, 0, previous.axis === "horizontal");
        setGestureActive(false);
      }
    },
    [active, paint],
  );

  const goTo = useCallback(
    (index: number, animate = true) => {
      gesture.current = null;
      setGestureActive(false);
      const target = Math.max(0, Math.min(index, count - 1));
      paint(target, 0, animate);
      setRequested(target);
    },
    [count, paint],
  );

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    setReducedMotion(media.matches);
    const change = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener?.("change", change);
    return () => media.removeEventListener?.("change", change);
  }, []);

  useEffect(() => {
    const abandon = () => cancel(true);
    const releaseOutside = (event: PointerEvent) => {
      if (gesture.current?.pointerId === event.pointerId) abandon();
    };
    const visibility = () => {
      if (document.hidden) abandon();
    };
    window.addEventListener("blur", abandon);
    window.addEventListener("resize", abandon);
    window.addEventListener("pointerup", releaseOutside);
    window.addEventListener("pointercancel", releaseOutside);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", abandon);
      window.removeEventListener("resize", abandon);
      window.removeEventListener("pointerup", releaseOutside);
      window.removeEventListener("pointercancel", releaseOutside);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [cancel]);

  const begin = (point: Point, pointerId?: number) => {
    swallowClick.current = false;
    if (count <= 1) return;
    // Do not snap a moving rail to its destination when another contact arrives.
    // A CSS settle lasts only 280ms; accepting the next gesture afterwards is deterministic.
    if (
      trackRef.current?.getAnimations?.().some((animation) => animation.playState === "running")
    ) {
      swallowClick.current = true;
      return;
    }
    gesture.current = {
      origin: point,
      last: point,
      axis: "pending",
      moved: false,
      width: viewportRef.current?.getBoundingClientRect().width || 0,
      samples: [{ x: point.x, t: now() }],
      pointerId,
    };
    paint(active, 0, false);
    setGestureActive(true);
  };

  const move = (point: Point) => {
    const drag = gesture.current;
    if (!drag) return false;
    drag.last = point;
    const dx = point.x - drag.origin.x,
      dy = point.y - drag.origin.y;
    drag.samples.push({ x: point.x, t: now() });
    if (drag.samples.length > 7) drag.samples.shift();
    if (drag.axis === "pending" && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
      if (Math.abs(dx) > Math.abs(dy) * 1.2) drag.axis = "horizontal";
      else if (Math.abs(dy) >= Math.abs(dx)) {
        drag.axis = "vertical";
        cancel(true);
        return false;
      }
    }
    if (drag.axis !== "horizontal") return false;
    drag.moved = true; // Latched even if contact returns to its origin.
    const beyond = (active === 0 && dx > 0) || (active === count - 1 && dx < 0);
    const limit = drag.width || Number.POSITIVE_INFINITY;
    const offset = beyond
      ? Math.sign(dx) * Math.min(Math.abs(dx) * 0.35, drag.width ? drag.width * 0.15 : 80)
      : Math.max(-limit, Math.min(limit, dx));
    paint(active, offset, false);
    return true;
  };

  const end = (point?: Point) => {
    const drag = gesture.current;
    if (!drag) return;
    if (point) move(point);
    gesture.current = null;
    setGestureActive(false);
    if (drag.axis !== "horizontal") return;
    const dx = drag.last.x - drag.origin.x;
    const endT = now();
    const samples = drag.samples.filter((sample) => endT - sample.t <= 120);
    const first = samples[0];
    const span = first ? endT - first.t : 0;
    const velocity = span >= 8 ? (drag.last.x - first.x) / span : 0;
    const threshold = Math.max(40, Math.min(80, drag.width * 0.18));
    const flick =
      Math.abs(dx) >= 10 && Math.abs(velocity) >= 0.5 && Math.sign(dx) === Math.sign(velocity);
    const direction = Math.abs(dx) >= threshold || flick ? (dx < 0 ? 1 : -1) : 0;
    swallowClick.current = drag.moved;
    goTo(active + direction);
  };
  const point = (input: { clientX: number; clientY: number }): Point => ({
    x: input.clientX,
    y: input.clientY || 0,
  });
  const handlers: HTMLAttributes<HTMLDivElement> = {
    onPointerDown(event) {
      if (event.pointerType === "touch" || event.button > 0 || event.isPrimary === false) return;
      if (gesture.current) {
        cancel(true);
        return;
      }
      begin(point(event), event.pointerId);
    },
    onPointerMove(event) {
      if (event.pointerType === "touch" || gesture.current?.pointerId !== event.pointerId) return;
      if (move(point(event))) {
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
          /* contact ended */
        }
      }
    },
    onPointerUp(event) {
      if (event.pointerType !== "touch" && gesture.current?.pointerId === event.pointerId)
        end(point(event));
    },
    onPointerCancel(event) {
      if (event.pointerType !== "touch") cancel(true);
    },
    onLostPointerCapture() {
      cancel(true);
    },
    onTouchStart(event) {
      if (event.touches.length !== 1) {
        cancel(true);
        return;
      }
      begin(point(event.touches[0]));
    },
    onTouchMove(event) {
      if (event.touches.length !== 1) {
        cancel(true);
        return;
      }
      move(point(event.touches[0]));
    },
    onTouchEnd(event) {
      if (event.touches?.length) {
        cancel(true);
        return;
      }
      end(event.changedTouches[0] ? point(event.changedTouches[0]) : undefined);
    },
    onTouchCancel() {
      cancel(true);
    },
    onDragStart(event) {
      event.preventDefault();
    },
    onClickCapture(event) {
      if (!swallowClick.current || event.detail === 0) return;
      swallowClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  const trackStyle: CSSProperties = { transform: transform(active) };
  return {
    active,
    goTo,
    gestureActive,
    reducedMotion,
    trackRef,
    viewportRef,
    trackStyle,
    handlers,
  };
}
