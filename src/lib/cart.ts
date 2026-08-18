export interface CartLine {
  code: string;
  quantity: number;
}

export type CartState = CartLine[];

export function addLine(lines: CartState, code: string, qty = 1): CartState {
  const existing = lines.find((l) => l.code === code);
  if (existing) {
    return lines.map((l) => (l.code === code ? { ...l, quantity: l.quantity + qty } : l));
  }
  return [...lines, { code, quantity: qty }];
}

export function setQuantity(lines: CartState, code: string, qty: number): CartState {
  if (qty <= 0) return removeLine(lines, code);
  return lines.map((l) => (l.code === code ? { ...l, quantity: qty } : l));
}

export function removeLine(lines: CartState, code: string): CartState {
  return lines.filter((l) => l.code !== code);
}

export function cartCount(lines: CartState): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
