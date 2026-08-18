import { describe, expect, it } from "vitest";
import { isValidEmail } from "./validation";

describe("isValidEmail", () => {
  it("accepts a normal email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts a subdomain address", () => {
    expect(isValidEmail("a.b@mail.example.co")).toBe(true);
  });

  it("rejects a string without @", () => {
    expect(isValidEmail("user.example.com")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects whitespace inside the address", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
  });
});
