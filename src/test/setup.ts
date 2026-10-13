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

// jsdom(本版本)不提供 localStorage —— 即便配置了真实源,`window.localStorage`
// 仍是 undefined(Node 26 + 新版 jsdom 收紧了;旧版是宽松放行)。购物袋的持久化
// 逻辑依赖它,所以照上面 IntersectionObserver / matchMedia 的同一套做法补一个
// 最小实现。只实现被测代码用到的部分,不做完整 Storage 规范。
if (typeof window !== "undefined" && !window.localStorage) {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  };
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}
