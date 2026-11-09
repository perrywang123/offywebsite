// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ version: 1, valid: true, exists: false, reader: vi.fn() }));
vi.mock("node:fs", () => ({
  statSync: () => {
    if (!state.exists) throw new Error("missing");
    return { mtimeMs: state.version, size: 100 };
  },
  readFileSync: () => Buffer.from("fixture"),
}));
vi.mock("maxmind", () => ({
  Reader: class {
    metadata = { databaseType: "GeoLite2-Country" };
    constructor() {
      state.reader();
      if (!state.valid) throw new Error("broken");
    }
    get() {
      return { country: { iso_code: "GB" } };
    }
  },
}));
vi.mock("geoip-lite", () => ({ default: { lookup: () => ({ country: "US" }) } }));
import { createCountryLookup } from "./geo-database";
afterEach(() => vi.useRealTimers());
it("uses bundled IP data until a valid updated Country database arrives, retaining the last good reader on bad updates", () => {
  vi.useFakeTimers();
  state.exists = false;
  const lookup = createCountryLookup("/private/country.mmdb");
  expect(lookup("1.1.1.1")).toBe("US");
  state.exists = true;
  vi.advanceTimersByTime(60001);
  expect(lookup("1.1.1.1")).toBe("GB");
  state.version++;
  state.valid = false;
  vi.advanceTimersByTime(60001);
  expect(lookup("1.1.1.1")).toBe("GB");
});
