// @vitest-environment node
import { describe, expect, it } from "vitest";
import { testDb } from "../kol/test-db";
import { checkoutAttempts, checkoutAttemptEvents, kolAudit } from "../db/schema";
import {
  createAttempt,
  claimAttempt,
  clientObservation,
  observeAttempt,
  finishAttempt,
  attemptDetail,
  listAttempts,
  revealAttempt,
  cleanupAttempts,
} from "./store";

const key = Buffer.alloc(32, 17);
const input = {
  items: [{ code: "wild-sweetie", quantity: 2 }],
  locale: "en",
  pagePath: "/cart",
  country: {
    country: "US",
    source: "header",
    header: "cf-ipcountry",
    candidates: [{ header: "cf-ipcountry", value: "US" }],
    ipSource: null,
    fallback: "US",
  },
};
const now = 1_800_000_000_000;

describe("anonymous checkout diagnostics", () => {
  it("removes expired encrypted payloads after seven days while preserving the diagnostic metadata", () => {
    const db = testDb(),
      a = claimAttempt(db, undefined, input, now);
    observeAttempt(
      db,
      a.id,
      { type: "shopify_response", data: { status: 200, body: {} } },
      key,
      now,
    );
    finishAttempt(
      db,
      a.id,
      {
        ok: true,
        provider: "shopify",
        redirect: { kind: "redirect", url: "https://test.invalid/checkout?key=secret" },
      },
      key,
      now,
    );
    cleanupAttempts(db, now + 8 * 86400000);
    expect(attemptDetail(db, a.id)).toMatchObject({ status: "redirect_ready" });
    expect(db.select().from(checkoutAttempts).all()[0].sensitiveJson).toBeNull();
    expect(
      db
        .select()
        .from(checkoutAttemptEvents)
        .all()
        .every((e) => e.sensitiveJson === null),
    ).toBe(true);
  });
  it("makes product names and Shopify warnings visible in list summaries and searchable", () => {
    const db = testDb(),
      a = claimAttempt(db, undefined, input, now);
    observeAttempt(
      db,
      a.id,
      {
        type: "catalog_checked",
        data: { resolved: [{ code: "wild-sweetie", product: { name: { en: "WILD SWEETIE" } } }] },
      },
      key,
      now,
    );
    observeAttempt(
      db,
      a.id,
      {
        type: "shopify_response",
        data: {
          body: {
            data: { cartCreate: { warnings: [{ code: "PRODUCT_UNAVAILABLE_IN_BUYER_LOCATION" }] } },
          },
        },
      },
      key,
      now,
    );
    const results = listAttempts(db, { query: "WILD SWEETIE" });
    expect(results.total).toBe(1);
    expect(results.rows[0]).toMatchObject({
      itemNames: { "wild-sweetie": "WILD SWEETIE" },
      warningCount: 1,
    });
  });
  it("correlates a valid receipt exactly once; mismatched items and forged receipts create separate attempts", () => {
    const db = testDb(),
      first = createAttempt(db, input, now);
    expect(claimAttempt(db, first.receipt, input, now + 1).id).toBe(first.id);
    expect(claimAttempt(db, first.receipt, input, now + 2).id).not.toBe(first.id);
    const other = createAttempt(db, input, now);
    expect(
      claimAttempt(db, other.receipt, { ...input, items: [{ code: "other", quantity: 1 }] }, now)
        .id,
    ).not.toBe(other.id);
    expect(claimAttempt(db, "forged", input, now).id).not.toBe(first.id);
    expect(JSON.stringify(db.select().from(checkoutAttempts).all())).not.toContain(first.receipt);
  });

  it("records preflight failures and distinguishes late client observations from server facts", () => {
    const db = testDb(),
      a = createAttempt(db, input, now);
    clientObservation(db, a.receipt, "client_verification_failed", now + 1);
    expect(attemptDetail(db, a.id)!.status).toBe("client_failed");
    const b = claimAttempt(db, undefined, input, now);
    finishAttempt(
      db,
      b.id,
      {
        ok: true,
        provider: "shopify",
        redirect: { kind: "redirect", url: "https://shop.test/checkouts/private?key=secret" },
      },
      key,
      now + 100,
    );
    clientObservation(db, b.receipt, "client_timeout", now + 101);
    expect(attemptDetail(db, b.id)!.status).toBe("redirect_ready");
    expect(attemptDetail(db, b.id)!.events.at(-1)!.type).toBe("client_timeout");
    expect(() => clientObservation(db, b.receipt, "paid" as never, now)).toThrow();
  });

  it("encrypts full Shopify output and links, redacts secrets from metadata, and audits sensitive reads", () => {
    const db = testDb(),
      a = claimAttempt(db, undefined, input, now);
    const url = "https://shop.test/checkouts/private-checkout-token?key=checkout-secret";
    observeAttempt(
      db,
      a.id,
      {
        type: "shopify_response",
        data: {
          status: 200,
          requestId: "shopify-request-1",
          durationMs: 25,
          body: {
            data: {
              cartCreate: {
                cart: {
                  id: "gid://shopify/Cart/private-cart?key=cart-secret",
                  checkoutUrl: url,
                  buyerIdentity: { countryCode: "US" },
                  lines: { nodes: [] },
                },
                warnings: [
                  { code: "PRODUCT_UNAVAILABLE_IN_BUYER_LOCATION", message: `bad ${url}` },
                ],
                userErrors: [],
              },
            },
          },
        },
      },
      key,
      now + 5,
    );
    finishAttempt(
      db,
      a.id,
      { ok: true, provider: "shopify", redirect: { kind: "redirect", url } },
      key,
      now + 10,
    );
    const stored = JSON.stringify([
      ...db.select().from(checkoutAttempts).all(),
      ...db.select().from(checkoutAttemptEvents).all(),
    ]);
    for (const secret of [
      "private-checkout-token",
      "checkout-secret",
      "private-cart",
      "cart-secret",
    ])
      expect(stored).not.toContain(secret);
    const detail = attemptDetail(db, a.id)!;
    expect(JSON.stringify(detail)).not.toContain("checkout-secret");
    expect(JSON.stringify(detail)).toContain("PRODUCT_UNAVAILABLE_IN_BUYER_LOCATION");
    const revealed = revealAttempt(db, a.id, "owner", key, now + 20);
    expect(revealed.checkoutUrl).toBe(url);
    expect(JSON.stringify(revealed)).toContain("cart-secret");
    expect(db.select().from(kolAudit).all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "checkout.reveal", entity: a.id }),
      ]),
    );
    expect(() => revealAttempt(db, a.id, "owner", Buffer.alloc(32, 3), now + 20)).toThrow(
      "diagnostic_key_unavailable",
    );
  });

  it("filters and paginates persisted records and enforces retention before cleanup", () => {
    const db = testDb();
    for (let i = 0; i < 4; i++) createAttempt(db, input, now + i);
    const failed = claimAttempt(
      db,
      undefined,
      { ...input, country: { ...input.country, country: "GB" } },
      now + 5,
    );
    finishAttempt(db, failed.id, { ok: false, status: 502, error: "shopify_error" }, key, now + 7);
    expect(
      listAttempts(db, { country: "GB", status: "failed", query: "wild", page: 1 }).total,
    ).toBe(1);
    expect(listAttempts(db, { page: 1, pageSize: 2 }).rows).toHaveLength(2);
    expect(listAttempts(db, { page: 2, pageSize: 2 }).rows).toHaveLength(2);
    expect(() => revealAttempt(db, failed.id, "owner", key, now + 8 * 86400000)).toThrow(
      "diagnostic_payload_expired",
    );
    cleanupAttempts(db, now + 31 * 86400000);
    expect(db.select().from(checkoutAttempts).all()).toHaveLength(0);
    expect(db.select().from(checkoutAttemptEvents).all()).toHaveLength(0);
  });
  it("still stores redacted evidence and the real outcome when encryption is unavailable", () => {
    const db = testDb(),
      a = claimAttempt(db, undefined, input, now);
    expect(() =>
      observeAttempt(
        db,
        a.id,
        { type: "shopify_response", data: { status: 200, body: { error: "safe" } } },
        Buffer.alloc(1),
        now + 1,
      ),
    ).not.toThrow();
    expect(() =>
      finishAttempt(
        db,
        a.id,
        {
          ok: true,
          provider: "shopify",
          redirect: { kind: "redirect", url: "https://shop.test/private?key=secret" },
        },
        Buffer.alloc(1),
        now + 2,
      ),
    ).not.toThrow();
    expect(attemptDetail(db, a.id)).toMatchObject({ status: "redirect_ready" });
    expect(attemptDetail(db, a.id)!.events.map((e) => e.type)).toContain("sensitive_unavailable");
    expect(() => revealAttempt(db, a.id, "owner", key, now + 5)).toThrow(
      "diagnostic_payload_unavailable",
    );
  });
});
