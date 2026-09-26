import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom lacks IntersectionObserver; Reveal observes elements with it. The stub
// never fires callbacks, so content simply renders without the is-in class.
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

// jsdom lacks matchMedia; Reveal/motion hooks query prefers-reduced-motion.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

// Ensure the DOM is reset between tests (vitest does not enable globals, so
// @testing-library/react's automatic afterEach cleanup is not registered).
afterEach(() => {
  cleanup();
});
