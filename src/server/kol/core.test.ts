// @vitest-environment node
import { describe, expect, it } from "vitest";
import { testDb } from "./test-db";
import {
  cooperationSchema,
  createPartner,
  updatePartner,
  startReferral,
  confirmReferral,
  createIntent,
  bindCart,
  verifyAttribution,
} from "./core";
import { commission, minor, rateBps, csvCell } from "./money";

const terms = {
  name: "Maya",
  alias: "maya",
  platform: "Instagram",
  socialUrl: "https://instagram.com/maya",
  email: "maya@example.com",
  rate: "7.25",
  startsAt: "2026-01-01",
  endsAt: "2027-01-01",
  target: "/products",
  status: "active" as const,
};
const now = Date.parse("2026-10-31T00:00:00Z");
describe("precise money and cooperation validation", () => {
  it("supports custom rates including zero without implicit defaults", () => {
    expect(rateBps("0")).toBe(0);
    expect(rateBps("7.25")).toBe(725);
    for (const value of ["", "100.01", "7.255", "-1", "1e1"])
      expect(() => rateBps(value)).toThrow();
    expect(cooperationSchema.safeParse({ ...terms, rate: "" }).success).toBe(false);
  });
  it("uses currency exponents and half-up commission without float drift", () => {
    expect(minor("19.99", "USD")).toBe(1999);
    expect(minor("199", "JPY")).toBe(199);
    expect(minor("1.234", "KWD")).toBe(1234);
    expect(() => minor("1.234", "USD")).toThrow();
    expect(commission(9000, 725)).toBe(653);
    expect(commission(100, 50)).toBe(1);
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });
});
describe("persisted session attribution", () => {
  it("freezes each checkout, prevents copied-cart claims, and ignores coupon ownership", () => {
    const db = testDb();
    const p = createPartner(db, terms, "admin", now);
    const visit = startReferral(db, "maya", now)!;
    expect(confirmReferral(db, visit.id, now)).toBe(true);
    const intent = createIntent(db, visit.id, "test-secret", now)!;
    bindCart(db, intent.id, "gid://shopify/Cart/cartA?key=secret", "https://checkout.test", now);
    updatePartner(db, p.id, { ...terms, rate: "18.5" }, "admin", now + 1);
    expect(
      verifyAttribution(db, intent.reference, "cartA", "order1", now + 1000, "test-secret"),
    ).toMatchObject({ rateBps: 725, kolId: p.id });
    expect(() =>
      verifyAttribution(db, intent.reference, "cartB", "order2", now + 1000, "test-secret"),
    ).toThrow("cart_mismatch");
    expect(createIntent(db, visit.id, "test-secret", now + 2)?.rateBps).toBe(1850);
  });
  it("expires idle chains and hosted checkout independently, rejects paused cooperation", () => {
    const db = testDb();
    const p = createPartner(db, terms, "admin", now);
    const visit = startReferral(db, "maya", now)!;
    confirmReferral(db, visit.id, now);
    expect(createIntent(db, visit.id, "secret", now + 30 * 60_000 + 1)).toBeNull();
    const i = createIntent(db, visit.id, "secret", now + 1)!;
    bindCart(db, i.id, "gid://shopify/Cart/A", "https://checkout.test", now);
    expect(() => verifyAttribution(db, i.reference, "A", "1", now + 31 * 60_000, "secret")).toThrow(
      "checkout_expired",
    );
    updatePartner(db, p.id, { ...terms, status: "paused" }, "admin", now + 2);
    expect(startReferral(db, "maya", now + 3)).toBeNull();
    expect(startReferral(db, "MAYA", now + 3)).toBeNull();
  });
  it("keeps aliases reserved and rejects external redirect targets", () => {
    const db = testDb();
    createPartner(db, terms, "admin", now);
    expect(() =>
      createPartner(db, { ...terms, name: "Other", alias: "MAYA" }, "admin", now),
    ).toThrow();
    for (const target of [
      "//evil.test",
      "/api/admin",
      "/products/../admin",
      "https://evil.test",
      "/%61dmin",
    ])
      expect(cooperationSchema.safeParse({ ...terms, target }).success).toBe(false);
  });
});
