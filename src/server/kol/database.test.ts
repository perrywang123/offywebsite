// @vitest-environment node
import { describe, expect, it } from "vitest";
import { testDb } from "./test-db";
import { assertShop } from "./database";
describe("single-shop accounting boundary", () => {
  it("pins the accounting database to its first shop and refuses silent shop switches", () => {
    const db = testDb();
    assertShop(db, "offy.myshopify.com");
    expect(() => assertShop(db, "OFFY.MYSHOPIFY.COM")).not.toThrow();
    expect(() => assertShop(db, "another.myshopify.com")).toThrow("accounting_shop_changed");
  });
});
