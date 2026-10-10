import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCart } from "./CartProvider";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

const STORAGE_KEY = "offy.cart.v1";

/** 一个把购物车状态暴露到 DOM 上、方便断言的探针组件。 */
function Probe() {
  const { lines, catalogLoaded, count } = useCart();
  return (
    <div>
      <span data-testid="lines">{JSON.stringify(lines)}</span>
      <span data-testid="loaded">{String(catalogLoaded)}</span>
      <span data-testid="count">{String(count)}</span>
    </div>
  );
}

const PRODUCT = {
  code: "offy_redrush",
  slug: "offy_redrush",
  name: { en: "NEON RUSH", zh: "赤红冲锋" },
  description: { en: "", zh: "" },
  price: { currency: "usd", amountCents: 4990 },
  series: "outdoor-sporty",
  dimensions: null,
  emotionTags: { en: [], zh: [] },
  images: ["https://cdn.example/a.jpg"],
  available: true,
};

/** 目录接口只返回三个 collection 的成员;offy-sticker-sheet 不在其中。 */
function mockRoutes({ catalog }: { catalog: "ok" | "500" | "reject" }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/products") {
      if (catalog === "reject") throw new Error("network down");
      if (catalog === "500") return { ok: false, status: 500, json: async () => ({}) } as Response;
      return { ok: true, status: 200, json: async () => ({ products: [PRODUCT], categories: [] }) } as Response;
    }
    // 单品直查:只有不属于任何 collection 的商品会走到这里
    if (url.includes("offy-sticker-sheet")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ product: { ...PRODUCT, code: "offy-sticker-sheet", name: { en: "OFFY STICKER SHEET", zh: "贴纸" } } }),
      } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const lines = () => JSON.parse(screen.getByTestId("lines").textContent ?? "[]");

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([{ code: "offy_redrush", quantity: 2 }]));
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("CartProvider 健壮性", () => {
  it("S1:目录接口返回 500 时不得清空购物袋(也不得把空数组写回 localStorage)", async () => {
    mockRoutes({ catalog: "500" });
    render(<CartProvider><Probe /></CartProvider>);

    await waitFor(() => expect(screen.getByTestId("loaded").textContent).toBe("true"));
    expect(lines()).toEqual([{ code: "offy_redrush", quantity: 2 }]);
    // 关键:持久化的内容也必须保住 —— 旧实现会在这里写回 []
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual([
      { code: "offy_redrush", quantity: 2 },
    ]);
  });

  it("S3:目录接口网络失败时 catalogLoaded 仍要置位,否则购物袋页永远转圈", async () => {
    mockRoutes({ catalog: "reject" });
    render(<CartProvider><Probe /></CartProvider>);

    await waitFor(() => expect(screen.getByTestId("loaded").textContent).toBe("true"));
    expect(lines()).toEqual([{ code: "offy_redrush", quantity: 2 }]);
  });

  it("S2:目录里没有、但单品接口能查到的商品必须留在购物袋里", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ code: "offy-sticker-sheet", quantity: 1 }]));
    mockRoutes({ catalog: "ok" });
    render(<CartProvider><Probe /></CartProvider>);

    await waitFor(() => expect(screen.getByTestId("loaded").textContent).toBe("true"));
    await waitFor(() => expect(lines()).toEqual([{ code: "offy-sticker-sheet", quantity: 1 }]));
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("仍然会清理真正下架的商品(单品接口 404)", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ code: "long-gone", quantity: 1 }]));
    mockRoutes({ catalog: "ok" });
    render(<CartProvider><Probe /></CartProvider>);

    await waitFor(() => expect(screen.getByTestId("loaded").textContent).toBe("true"));
    await waitFor(() => expect(lines()).toEqual([]));
  });
});
