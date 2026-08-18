import { describe, expect, it } from "vitest";
import { addLine, cartCount, removeLine, setQuantity } from "./cart";

describe("cart", () => {
  it("adds a new line", () => {
    expect(addLine([], "PCOF1-A3", 1)).toEqual([{ code: "PCOF1-A3", quantity: 1 }]);
  });

  it("merges duplicate codes by incrementing quantity", () => {
    const lines = addLine([], "PCOF1-A3", 1);
    const merged = addLine(lines, "PCOF1-A3", 2);
    expect(merged).toEqual([{ code: "PCOF1-A3", quantity: 3 }]);
  });

  it("removes a line", () => {
    const lines = addLine([], "PCOF1-A3", 1);
    expect(removeLine(lines, "PCOF1-A3")).toEqual([]);
  });

  it("setQuantity to zero removes the line", () => {
    const lines = addLine([], "PCOF1-A3", 1);
    expect(setQuantity(lines, "PCOF1-A3", 0)).toEqual([]);
  });

  it("cartCount sums quantities", () => {
    const lines = addLine(addLine([], "PCOF1-A3", 2), "PCOF1-B2", 3);
    expect(cartCount(lines)).toBe(5);
  });
});
