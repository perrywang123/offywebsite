"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addLine, cartCount, pruneLines, removeLine, setQuantity, type CartState } from "@/lib/cart";

const STORAGE_KEY = "offy.cart.v1";

/** 购物车行展示所需的最小商品信息,来自公开实时商品 API(`/api/products`)。 */
export interface CartCatalogEntry {
  code: string;
  name: { en: string; zh: string };
  images: string[];
  priceCents: number;
  available: boolean;
}

interface ProductsApiItem {
  code: string;
  name: { en: string; zh: string };
  images: string[];
  price: { amountCents: number };
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
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: ProductsApiItem[] } | null) => {
        if (cancelled) return;
        const map: Record<string, CartCatalogEntry> = {};
        for (const p of data?.products ?? []) {
          map[p.code] = { code: p.code, name: p.name, images: p.images, priceCents: p.price.amountCents, available: p.available };
        }
        setCatalog(map);
        setCatalogLoaded(true);

        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as CartState;
            setLines(pruneLines(parsed, (code) => Boolean(map[code])));
          }
        } catch {
          /* ignore */
        }
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        // 目录拉取失败:仍按原始本地存储渲染购物车行(不做僵尸清理),避免把
        // "网络暂时不可用"误判成"商品已下架"而清空用户的购物车。
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) setLines(JSON.parse(raw) as CartState);
        } catch {
          /* ignore */
        }
        setHydrated(true);
      });
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
