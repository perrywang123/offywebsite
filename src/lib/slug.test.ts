import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes accents", () => {
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  it("collapses runs of punctuation into a single dash", () => {
    expect(slugify("Hello,  World!!")).toBe("hello-world");
  });

  it("returns an empty string for blank input", () => {
    expect(slugify("   ")).toBe("");
  });
});
