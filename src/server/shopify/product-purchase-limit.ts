export function readPurchaseLimit(tags: readonly string[]): 1 | undefined {
  return tags.includes("limit-1-per-order") ? 1 : undefined;
}
