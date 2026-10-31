"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { addLine, cartCount, removeLine, setQuantity, type CartState } from "@/lib/cart";
const STORAGE_KEY = "offy.cart.v1";
export interface CartCatalogEntry {
  code: string;
  name: { en: string; zh: string };
  images: string[];
  priceCents: number;
  currency: string;
  available: boolean;
}
export type CatalogStatus = "loading" | "ready" | "unavailable";
interface CartContextValue {
  lines: CartState;
  catalog: Record<string, CartCatalogEntry>;
  catalogStatus: CatalogStatus;
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
  refresh: () => Promise<boolean>;
}
const itemSchema = z.object({
  code: z.string().min(1),
  name: z.object({ en: z.string().min(1), zh: z.string() }),
  images: z.array(z.string()),
  price: z.object({
    currency: z.string().regex(/^[a-zA-Z]{3}$/),
    amountCents: z.number().int().nonnegative().safe(),
  }),
  available: z.boolean(),
});
function entry(value: unknown): CartCatalogEntry {
  const p = itemSchema.parse(value);
  return {
    code: p.code,
    name: p.name,
    images: p.images,
    priceCents: p.price.amountCents,
    currency: p.price.currency.toUpperCase(),
    available: p.available,
  };
}
function savedLines(): CartState {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.reduce<CartState>((all, line) => {
      const p = z
        .object({ code: z.string().min(1).max(200), quantity: z.number().finite() })
        .safeParse(line);
      return p.success && p.data.quantity > 0 ? addLine(all, p.data.code, p.data.quantity) : all;
    }, []);
  } catch {
    return [];
  }
}
const CartContext = createContext<CartContextValue | null>(null);
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartState>([]),
    linesRef = useRef<CartState>([]);
  const [catalog, setCatalog] = useState<Record<string, CartCatalogEntry>>({});
  const [catalogStatus, setStatus] = useState<CatalogStatus>("loading");
  const [isOpen, setOpen] = useState(false),
    [mounted, setMounted] = useState(false);
  const hydrated = useRef(false),
    generation = useRef(0),
    alive = useRef(true),
    closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateLines = useCallback((next: CartState) => {
    linesRef.current = next;
    setLines(next);
    if (hydrated.current) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable; session bag still works */
      }
    }
  }, []);
  const refresh = useCallback(async (): Promise<boolean> => {
    const request = ++generation.current;
    setStatus((prev) => (prev === "unavailable" ? "unavailable" : "loading"));
    setCatalog({});
    const current = linesRef.current.map((l) => ({ ...l }));
    try {
      const res = await fetch("/api/products", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error("catalog_unavailable");
      const body = z.object({ products: z.array(itemSchema) }).parse(await res.json());
      const map: Record<string, CartCatalogEntry> = Object.fromEntries(
        body.products.map((p) => [p.code, entry(p)]),
      );
      const missing = new Set<string>();
      await Promise.all(
        current
          .filter((l) => !map[l.code])
          .map(async (line) => {
            const detail = await fetch(`/api/products/${encodeURIComponent(line.code)}`, {
              cache: "no-store",
              signal: AbortSignal.timeout(10000),
            });
            if (detail.status === 404) {
              missing.add(line.code);
              return;
            }
            if (!detail.ok) throw new Error("catalog_unavailable");
            const product = entry((await detail.json()).product);
            if (product.code !== line.code) throw new Error("product_mismatch");
            map[line.code] = product;
          }),
      );
      if (!alive.current || request !== generation.current) return false;
      // Apply only confirmed removals to current lines. Never restore an old snapshot after a user edit.
      const next = linesRef.current.filter((l) => !missing.has(l.code));
      if (next.some((l) => !map[l.code])) throw new Error("unverified_lines");
      updateLines(next);
      setCatalog(map);
      setStatus("ready");
      return true;
    } catch {
      if (alive.current && request === generation.current) {
        setCatalog({});
        setStatus("unavailable");
      }
      return false;
    }
  }, [updateLines]);
  useEffect(() => {
    alive.current = true;
    hydrated.current = true;
    updateLines(savedLines());
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive.current = false;
      // This is a request epoch, not a DOM ref; invalidate work on unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++generation.current;
      document.removeEventListener("visibilitychange", onVisible);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [refresh, updateLines]);
  const open = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMounted(true);
    setOpen(true);
    void refresh();
  }, [refresh]);
  const close = useCallback(() => {
    setOpen(false);
    closeTimer.current = setTimeout(() => setMounted(false), 360);
  }, []);
  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      catalog,
      catalogStatus,
      catalogLoaded: catalogStatus !== "loading",
      count: cartCount(lines),
      isOpen,
      mounted,
      refresh,
      add: (code, qty = 1) => {
        updateLines(addLine(linesRef.current, code, qty));
        open();
      },
      remove: (code) => updateLines(removeLine(linesRef.current, code)),
      setQty: (code, qty) => updateLines(setQuantity(linesRef.current, code, qty)),
      open,
      close,
      clear: () => {
        ++generation.current;
        updateLines([]);
        setCatalog({});
        setStatus("ready");
      },
    }),
    [lines, catalog, catalogStatus, isOpen, mounted, refresh, updateLines, open, close],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart(): CartContextValue {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
