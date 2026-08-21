// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../../db/schema";

vi.mock("./client", () => ({
  createOrder: vi.fn(),
  getOrder: vi.fn(),
  captureOrder: vi.fn(),
  voidOrder: vi.fn(),
}));

// env 必须在 provider（及其 env.ts）被导入前设置
process.env.PAYPAL_CLIENT_ID = "sandbox_client_id";
process.env.PAYPAL_CLIENT_SECRET = "sandbox_client_secret";
process.env.PAYPAL_MODE = "sandbox";

import { captureOrder, createOrder, getOrder, voidOrder } from "./client";
const { PayPalPaymentProvider } = await import("./provider");

function createDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });
  return db;
}

describe("PayPalPaymentProvider.createCheckout", () => {
  it("creates a PayPal order and stores a checkout session", async () => {
    const db = createDb();
    (createOrder as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ORDER123",
      status: "CREATED",
      links: [{ rel: "approve", href: "https://www.sandbox.paypal.com/checkoutnow?token=ABC" }],
    });

    const provider = new PayPalPaymentProvider(db);
    const result = await provider.createCheckout({
      items: [{ code: "PCOF1-A3", quantity: 2 }],
      locale: "en",
    });

    expect(result).toEqual({
      ok: true,
      provider: "paypal",
      redirect: {
        kind: "approve",
        orderId: "ORDER123",
        approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ABC",
        returnUrl: "http://localhost:3000/en/checkout/paypal-return?orderId=ORDER123",
      },
    });
    const sessions = db.select().from(schema.checkoutSessions).all();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].paypalOrderId).toBe("ORDER123");
  });

  it("rejects unknown products", async () => {
    const provider = new PayPalPaymentProvider(createDb());
    const result = await provider.createCheckout({
      items: [{ code: "NOPE", quantity: 1 }],
      locale: "en",
    });
    expect(result).toEqual({ ok: false, status: 400, error: "invalid_items" });
  });
});

describe("PayPalPaymentProvider.capture", () => {
  it("captures an approved order and writes the order idempotently", async () => {
    const db = createDb();
    db.insert(schema.checkoutSessions)
      .values({
        provider: "paypal",
        paypalOrderId: "ORDER123",
        currency: "usd",
        lineItemsJson: JSON.stringify([
          { code: "PCOF1-A3", nameEn: "Offy Tennis Ace", nameZh: "网球甜心 Offy", unitPriceCents: 4500, quantity: 2 },
        ]),
        status: "pending",
      })
      .run();
    (getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ORDER123",
      status: "APPROVED",
      purchase_units: [{ amount: { currency_code: "USD", value: "90.00" } }],
    });
    (captureOrder as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ORDER123",
      status: "COMPLETED",
      payer: { email_address: "buyer@example.com" },
      purchase_units: [{ payments: { captures: [{ id: "CAPTURE1", status: "COMPLETED", amount: { currency_code: "USD", value: "90.00" } }] } }],
    });

    const provider = new PayPalPaymentProvider(db);
    const result = await provider.capture({ orderId: "ORDER123" });

    expect(result.ok).toBe(true);
    const rows = db.select().from(schema.orders).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].totalCents).toBe(9000);
    expect(rows[0].paypalOrderId).toBe("ORDER123");

    // 幂等：重复 capture 返回已有订单，不新增
    const again = await provider.capture({ orderId: "ORDER123" });
    expect(again.ok).toBe(true);
    expect(db.select().from(schema.orders).all()).toHaveLength(1);
  });

  it("voids and rejects on amount mismatch (tampered price)", async () => {
    const db = createDb();
    db.insert(schema.checkoutSessions)
      .values({
        provider: "paypal",
        paypalOrderId: "ORDER123",
        currency: "usd",
        lineItemsJson: JSON.stringify([
          { code: "PCOF1-A3", nameEn: "Offy Tennis Ace", nameZh: "网球甜心 Offy", unitPriceCents: 4500, quantity: 1 },
        ]),
        status: "pending",
      })
      .run();
    (getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ORDER123",
      status: "APPROVED",
      purchase_units: [{ amount: { currency_code: "USD", value: "1.00" } }],
    });
    (voidOrder as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const provider = new PayPalPaymentProvider(db);
    const result = await provider.capture({ orderId: "ORDER123" });

    expect(result).toEqual({ ok: false, status: 409, error: "amount_mismatch" });
    expect(voidOrder).toHaveBeenCalledWith("ORDER123");
    expect(db.select().from(schema.orders).all()).toHaveLength(0);
  });

  it("rejects capture when order is not APPROVED", async () => {
    const db = createDb();
    db.insert(schema.checkoutSessions)
      .values({ provider: "paypal", paypalOrderId: "ORDER123", currency: "usd", status: "pending" })
      .run();
    (getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ORDER123", status: "CREATED" });

    const provider = new PayPalPaymentProvider(db);
    const result = await provider.capture({ orderId: "ORDER123" });
    expect(result).toEqual({ ok: false, status: 409, error: "not_approved" });
  });
});
