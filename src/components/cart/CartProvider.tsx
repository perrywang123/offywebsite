"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addLine, cartCount, removeLine, setQuantity, type CartState } from "@/lib/cart";

const STORAGE_KEY = "offy.cart.v1";

/** 购物车行展示所需的最小商品信息,来自公开实时商品 API(`/api/products`)。 */
export interface CartCatalogEntry {
  code: string;
  name: { en: string; zh: string };
  images: string[];
  priceCents: number;
  /** ISO-4217 币种(小写下发,这里统一成大写)。价格按访客所在市场返回,
   * 所以每次 `/api/products` 拉取到的币种可能随访客国家不同。 */
  currency: string;
  available: boolean;
}

interface ProductsApiItem {
  code: string;
  name: { en: string; zh: string };
  images: string[];
  price: { currency?: string; amountCents: number };
  available: boolean;
}

interface CartContextValue {
  lines: CartState;
  /** 按 code 索引的实时商品目录,供 CartDrawer 等客户端组件渲染行信息。 */
  catalog: Record<string, CartCatalogEntry>;
  /** 实时目录是否已完成首次加载(用于避免加载完成前把购物车误判为"空")。 */
  catalogLoaded: boolean;
  count: number;
  isOpen: boolean;
  mounted: boolean;
  add: (code: string, qty?: number) => void;
  remove: (code: string) => void;
  setQty: (code: string, qty: number) => void;
  open: () => void;
  close: () => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartState>([]);
  const [catalog, setCatalog] = useState<Record<string, CartCatalogEntry>>({});
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // 客户端组件(购物车)拿不到服务端的 Shopify 凭据,改为请求公开实时商品 API
  // (该 API 内部实时拉取 Shopify,不再是本地静态目录),保证购物车展示的
  // 名称/图片/价格/库存与网站其它地方一致,并用于清理"僵尸行"(购物车里存着
  // 但目录中已不存在的 code)。
  useEffect(() => {
    let cancelled = false;

    const toEntry = (p: ProductsApiItem): CartCatalogEntry => ({
      code: p.code,
      name: p.name,
      images: p.images,
      priceCents: p.price.amountCents,
      // 老版本 API 响应(以及任何缺失币种的响应)按 USD 兜底,与本地静态目录一致。
      currency: (p.price.currency ?? "usd").toUpperCase(),
      available: p.available,
    });

    /**
     * 逐行确认购物车里存的 code 还有没有效。
     *
     * 目录(`/api/products`)只覆盖三个 collection 的成员,但**不属于任何 collection 的
     * 已发布商品**(如 offy-sticker-sheet)在详情页照样能加购 —— 它们在目录里查不到,
     * 旧逻辑会当成"僵尸行"直接剔除,顾客点了"已加入"进袋却是空的。所以目录里没有的
     * 再按 code 直查一次,只有**明确 404** 才认定商品真的没了。
     */
    async function reconcile(
      parsed: CartState,
      map: Record<string, CartCatalogEntry>,
    ): Promise<{ kept: CartState; extra: Record<string, CartCatalogEntry> }> {
      const kept: CartState = [];
      const extra: Record<string, CartCatalogEntry> = {};
      for (const line of parsed) {
        if (map[line.code]) {
          kept.push(line);
          continue;
        }
        try {
          const res = await fetch(`/api/products/${encodeURIComponent(line.code)}`);
          if (res.status === 404) continue; // 确认已下架 → 剔除
          if (!res.ok) {
            kept.push(line); // 403/429/5xx:不敢断定,保留
            continue;
          }
          const data = (await res.json()) as { product?: ProductsApiItem };
          if (!data.product) continue;
          extra[line.code] = toEntry(data.product);
          kept.push(line);
        } catch {
          kept.push(line); // 网络失败:保留,别把"连不上"当成"商品没了"
        }
      }
      return { kept, extra };
    }

    async function load() {
      const map: Record<string, CartCatalogEntry> = {};
      let catalogOk = false;
      try {
        const res = await fetch("/api/products");
        // 关键:非 2xx 不能当成"目录是空的"。旧逻辑 `res.ok ? json() : null` 会让
        // catalog 变 {} → pruneLines 剔掉所有行 → 再把空数组写回 localStorage,
        // 于是任何 5xx/429/403(CDN、WAF、部署重启)都会**永久清空**用户的购物袋。
        if (res.ok) {
          const data = (await res.json()) as { products?: ProductsApiItem[] };
          for (const p of data.products ?? []) map[p.code] = toEntry(p);
          catalogOk = true;
        }
      } catch {
        /* 网络层失败,同样按"目录不可用"处理 */
      }
      if (cancelled) return;

      setCatalog(map);
      // 无论成功与否都要置位:否则购物袋页会永远停在 "Loading your bag…"
      setCatalogLoaded(true);

      let parsed: CartState = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) parsed = JSON.parse(raw) as CartState;
      } catch {
        /* ignore */
      }
      if (cancelled) return;

      if (!catalogOk) {
        // 目录不可用:原样渲染本地存储的行,不做任何清理,等下次加载再对账。
        setLines(parsed);
        setHydrated(true);
        return;
      }

      const { kept, extra } = await reconcile(parsed, map);
      if (cancelled) return;
      if (Object.keys(extra).length > 0) setCatalog((prev) => ({ ...prev, ...extra }));
      setLines(kept);
      setHydrated(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      catalog,
      catalogLoaded,
      count: cartCount(lines),
      isOpen,
      mounted,
      add: (code, qty = 1) => {
        setLines((prev) => addLine(prev, code, qty));
        setMounted(true);
        setIsOpen(true);
      },
      remove: (code) => setLines((prev) => removeLine(prev, code)),
      setQty: (code, qty) => setLines((prev) => setQuantity(prev, code, qty)),
      open: () => {
        setMounted(true);
        setIsOpen(true);
      },
      close: () => {
        setIsOpen(false);
        setTimeout(() => setMounted(false), 360);
      },
      clear: () => setLines([]),
    }),
    [lines, catalog, catalogLoaded, isOpen, mounted],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
