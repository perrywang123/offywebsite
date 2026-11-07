// Isolated HTTP workflow only. This script refuses any destination outside the local simulator.
import assert from "node:assert/strict";
const site = "http://127.0.0.1:3901",
  admin = "http://127.0.0.1:3902",
  mock = "http://127.0.0.1:3903";
const state = await (await fetch(mock + "/test/state")).json();
assert.match(state.directory, /offy-kol-integration-/);
let cookie = "",
  checks = 0;
async function call(path, body, expected = 200) {
  const response = await fetch(admin + "/api/admin/kol/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { cookie, origin: admin, "x-offy-csrf": "1", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  if (path === "login") cookie = response.headers.get("set-cookie").split(";")[0];
  checks++;
  return result;
}
await call("login", { email: "tester@example.com", password: "offy-local-test-only-2026" });
assert.equal((await call("state")).accountingMode, "collabs");
await call("partners", {}, 409);
await call("settlements", {}, 409);
await call("codes/generate", {}, 409);
const existing = (await call("collabs")).creators.find((c) => c.alias === "qa-collabs");
await call("collabs/creators", {
  id: existing?.id,
  name: "Maya simulation",
  alias: "qa-collabs",
  creatorKey: "Maya",
  officialLink: site + "/discount/MAYA-EXISTING?dt_id=0",
  enabled: true,
});
const short = await fetch(site + "/r/qa-collabs", { redirect: "manual" });
assert.equal(short.status, 303);
assert.match(short.headers.get("location"), /dt_id=0/);
assert.equal(new URL(short.headers.get("location")).searchParams.has("offy_visit"), false);
checks++;
const source = `${site}/discount/MAYA-EXISTING?redirect=%2Fproducts&dt_id=0&utm_source=collabs-test`;
// Production URLs must be HTTPS; localhost link index is tested at unit level with HTTPS.
const redirect = await fetch(source, { redirect: "manual" });
assert.equal(redirect.status, 303);
assert.match(redirect.headers.get("location"), /dt_id=0/);
checks++;
const discountCookie = redirect.headers.get("set-cookie").split(";")[0];
const checkout = await fetch(site + "/api/payments/checkout", {
  method: "POST",
  headers: { cookie: discountCookie, "content-type": "application/json", origin: site },
  body: JSON.stringify({
    provider: "shopify",
    locale: "en",
    items: [{ code: "integration-sample", quantity: 1 }],
  }),
});
const checkoutData = await checkout.json();
assert.equal(checkout.status, 200, JSON.stringify(checkoutData));
assert.equal(new URL(checkoutData.redirect.url).origin, mock);
checks++;
// The simulated order never reaches the real Shopify service or payment gateway.
await fetch(checkoutData.redirect.url, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: "code=MAYA-EXISTING",
  redirect: "manual",
});
const order = (await (await fetch(mock + "/test/state")).json()).orders.at(-1);
const report = {
  filename: "isolated-collabs-report.csv",
  csv: `Creator,Order,Currency,Sales,Commission\nMaya,${order.name},USD,90.00,9.00`,
  kind: "sales",
  granularity: "order",
  periodFrom: "2026-11-01",
  periodTo: "2026-11-30",
  numberFormat: "dot",
  salesBasis: "order-total",
  mapping: {
    creator: "Creator",
    orderName: "Order",
    currency: "Currency",
    sales: "Sales",
    commission: "Commission",
  },
};
const preview = await call("collabs/preview", report);
assert.equal(preview.totals[0].commission, 900);
const batch = await call("collabs/import", { report, confirmed: true, allowOverlap: true });
assert.equal(
  (await call("collabs/import", { report, confirmed: true, allowOverlap: true })).id,
  batch.id,
);
const checked = await call("collabs/reconcile", { id: batch.id });
assert.equal(checked.verifiedOrders, 1);
assert.equal(checked.complete, true);
assert.equal(
  checked.findings.some((f) => f.code === "sales_amount_difference"),
  false,
);
await fetch(mock + "/test/refund", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: order.id }),
});
const refunded = await call("collabs/reconcile", { id: batch.id });
assert.equal(
  refunded.findings.some((f) => f.code === "refunded_or_canceled_with_commission"),
  true,
);
await call("collabs/review", {
  checkId: refunded.id,
  findingKey: refunded.findings.find((f) => f.code === "refunded_or_canceled_with_commission").key,
  reason: "仅隔离环境流程验证",
});
const snapshot = await call("state");
assert.equal(snapshot.settlements.length, 0);
assert.equal(snapshot.orders.length, 0);
const detail = await call(`collabs/reports/${batch.id}`);
assert.equal(detail.rows[0].commission, 900);
assert.equal(detail.reviews.length, 1);
assert.equal(detail.checks.length, 2);
await call("logout", {});
console.log(
  JSON.stringify({
    checks,
    isolated: true,
    reportId: batch.id,
    orderVerified: true,
    refundFlagged: true,
    duplicateImportIdempotent: true,
    localPayouts: 0,
  }),
);
