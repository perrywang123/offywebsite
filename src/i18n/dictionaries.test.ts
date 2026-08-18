import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? flatten(value as Record<string, unknown>, path)
      : [path];
  });
}

describe("i18n dictionaries", () => {
  it("zh and en expose identical key sets", () => {
    expect(flatten(en).sort()).toEqual(flatten(zh).sort());
  });

  it("both dictionaries are non-empty", () => {
    expect(flatten(zh).length).toBeGreaterThan(0);
    expect(flatten(en).length).toBeGreaterThan(0);
  });
});
