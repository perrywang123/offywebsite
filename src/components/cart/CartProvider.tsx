"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addLine, cartCount, pruneLines, removeLine, setQuantity, type CartState } from "@/lib/cart";
import { getProductByCode } from "@/lib/catalog";

const STORAGE_KEY = "offy.cart.v1";

interface CartContextValue {
  lines: CartState;
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
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        // 加载时清理失效商品行(僵尸数据):不在目录中的 code 直接移除并落盘,
        // 保证徽标计数与渲染行一致。
        setLines(pruneLines(parsed, (code) => Boolean(getProductByCode(code))));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
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
    [lines, isOpen, mounted],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
