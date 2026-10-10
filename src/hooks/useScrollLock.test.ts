import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useScrollLock } from "./useScrollLock";

// <html> 的内联 overflow 是全局状态,每个用例前后都要复位,否则会串味。
afterEach(() => {
  document.documentElement.style.overflow = "";
});

describe("useScrollLock", () => {
  it("locks documentElement scrolling while open", () => {
    renderHook(({ open }) => useScrollLock(open), { initialProps: { open: true } });
    expect(document.documentElement.style.overflow).toBe("hidden");
  });

  it("does not touch scrolling while closed", () => {
    renderHook(({ open }) => useScrollLock(open), { initialProps: { open: false } });
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("restores the previous inline value when the overlay closes", () => {
    document.documentElement.style.overflow = "clip";
    const { rerender } = renderHook(({ open }) => useScrollLock(open), {
      initialProps: { open: true },
    });
    expect(document.documentElement.style.overflow).toBe("hidden");

    rerender({ open: false });
    expect(document.documentElement.style.overflow).toBe("clip");
  });

  it("restores on unmount while still open", () => {
    const { unmount } = renderHook(({ open }) => useScrollLock(open), {
      initialProps: { open: true },
    });
    unmount();
    expect(document.documentElement.style.overflow).toBe("");
  });
});
