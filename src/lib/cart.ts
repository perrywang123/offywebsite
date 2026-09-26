import { clampQuantity } from "./pricing";

export interface CartLine {
  code: string;
  quantity: number;
}

export type CartState = CartLine[];

export function addLine(lines: CartState, code: string, qty = 1): CartState {
  const existing = lines.find((l) => l.code === code);
  if (existing) {
    return lines.map((l) =>
      l.code === code ? { ...l, quantity: clampQuantity(l.quantity + qty) } : l,
    );
  }
  return [...lines, { code, quantity: clampQuantity(qty) }];
}

export function setQuantity(lines: CartState, code: string, qty: number): CartState {
  if (qty <= 0) return removeLine(lines, code);
  return lines.map((l) => (l.code === code ? { ...l, quantity: clampQuantity(qty) } : l));
}

export function removeLine(lines: CartState, code: string): CartState {
  return lines.filter((l) => l.code !== code);
}

export function cartCount(lines: CartState): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/**
 * Drop lines whose product code no longer exists in the catalog ("zombie
 * lines") — they would otherwise be silently hidden from the UI while still
 * inflating badge counts, with no way for the user to remove them.
 */
export function pruneLines(lines: CartState, isValid: (code: string) => boolean): CartState {
  return lines.filter((l) => isValid(l.code));
}
