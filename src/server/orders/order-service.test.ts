// @vitest-environment node
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { handleCheckoutCompleted } from "./order-service";

function createDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });
  return db;
}

const session = {
  id: "cs_test_1",
  customerEmail: "buyer@example.com",
  currency: "usd",
  amountTotal: 12900,
  amountSubtotal: 12900,
  lineItems: [
    { code: "PCOF1-A3", nameEn: "Offy Tennis Ace", nameZh: "网球甜心 Offy", unitPriceCents: 4500, quantity: 2 },
    { code: "PCOF1-F0", nameEn: "Offy Bag Charm", nameZh: "时尚包挂 Offy", unitPriceCents: 2200, quantity: 1 },
  ],
};

describe("handleCheckoutCompleted", () => {
  it("creates an order with snapshot line items", () => {
    const db = createDb();
    expect(handleCheckoutCompleted(session, "evt_1", db)).toEqual({ created: true });

    const orders = db.select().from(schema.orders).all();
    expect(orders).toHaveLength(1);
    expect(orders[0].totalCents).toBe(12900);
    expect(orders[0].email).toBe("buyer@example.com");

    const items = db.select().from(schema.orderItems).all();
    expect(items).toHaveLength(2);
    expect(items[0].unitPriceCents).toBe(4500);
    expect(items[0].lineTotalCents).toBe(9000);
  });

  it("is idempotent: replaying the same event does not duplicate the order", () => {
    const db = createDb();
    handleCheckoutCompleted(session, "evt_1", db);
    const replayed = handleCheckoutCompleted(session, "evt_1", db);

    expect(replayed).toEqual({ created: false });
    expect(db.select().from(schema.orders).all()).toHaveLength(1);
    expect(db.select().from(schema.orderItems).all()).toHaveLength(2);
  });
});
