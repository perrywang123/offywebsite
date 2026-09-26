import { describe, expect, it } from "vitest";
import { addLine, cartCount, pruneLines, removeLine, setQuantity } from "./cart";

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

  it("setQuantity clamps to 99 (matches server clamp)", () => {
    const lines = addLine([], "PCOF1-A3", 1);
    expect(setQuantity(lines, "PCOF1-A3", 500)).toEqual([{ code: "PCOF1-A3", quantity: 99 }]);
  });

  it("addLine clamps the merged quantity to 99", () => {
    const lines = addLine([], "PCOF1-A3", 90);
    expect(addLine(lines, "PCOF1-A3", 50)).toEqual([{ code: "PCOF1-A3", quantity: 99 }]);
  });

  it("pruneLines drops lines whose code is no longer valid (zombie data)", () => {
    const lines = [
      { code: "swan-princess", quantity: 2 },
      { code: "WCOFFY-CPL01", quantity: 1 },
    ];
    const isValid = (code: string) => code === "swan-princess";
    expect(pruneLines(lines, isValid)).toEqual([{ code: "swan-princess", quantity: 2 }]);
  });

  it("pruneLines keeps everything when all codes are valid", () => {
    const lines = [
      { code: "a", quantity: 1 },
      { code: "b", quantity: 2 },
    ];
    expect(pruneLines(lines, () => true)).toEqual(lines);
  });
});
