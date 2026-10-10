// @vitest-environment node
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import * as schema from "../db/schema";
import { createCheckoutSession } from "./create-checkout-session";

function createDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });
  return db;
}

function fakeStripe() {
  return {
    checkout: {
      sessions: {
        create: vi.fn(async (args: unknown) => ({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/c/pay/cs_test_123",
          ...(args as object),
        })),
      },
    },
  } as unknown as Stripe;
}

describe("createCheckoutSession", () => {
  it("uses server-side catalog price and records a session", async () => {
    const db = createDb();
    const stripe = fakeStripe();

    const result = await createCheckoutSession(
      [{ code: "royal-grey", quantity: 2 }],
      "zh",
      stripe,
      db,
    );

    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_123" });

    const createArgs = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { line_items: Array<{ quantity: number; price_data: { unit_amount: number } }> };
    expect(createArgs.line_items[0].price_data.unit_amount).toBe(4990);
    expect(createArgs.line_items[0].quantity).toBe(2);

    expect(db.select().from(schema.checkoutSessions).all()).toHaveLength(1);
  });

  it("rejects an unknown product code", async () => {
    const result = await createCheckoutSession(
      [{ code: "NOPE", quantity: 1 }],
      "zh",
      fakeStripe(),
      createDb(),
    );
    expect(result).toEqual({ ok: false, status: 400, error: "invalid_items" });
  });

  it("returns 503 when Stripe is not configured", async () => {
    const result = await createCheckoutSession([{ code: "royal-grey", quantity: 1 }], "zh");
    expect(result).toEqual({ ok: false, status: 503, error: "checkout_unavailable" });
  });
});
