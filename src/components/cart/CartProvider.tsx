"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addLine, cartCount, removeLine, setQuantity, type CartState } from "@/lib/cart";

const STORAGE_KEY = "offy.cart.v1";

interface CartContextValue {
  lines: CartState;
  count: number;
  isOpen: boolean;
  add: (code: string, qty?: number) => void;
  remove: (code: string) => void;
  setQty: (code: string, qty: number) => void;
  open: () => void;
  close: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartState>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoid SSR/hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartState);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    }
  }, [lines, hydrated]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: cartCount(lines),
      isOpen,
      add: (code, qty = 1) => {
        setLines((prev) => addLine(prev, code, qty));
        setIsOpen(true);
      },
      remove: (code) => setLines((prev) => removeLine(prev, code)),
      setQty: (code, qty) => setLines((prev) => setQuantity(prev, code, qty)),
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [lines, isOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
