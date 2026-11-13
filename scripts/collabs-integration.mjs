// Isolated HTTP workflow only. This script refuses any destination outside the local simulator.
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
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
const pendingAlias = `qa-deferred-${randomUUID().slice(0, 8)}`;
const pending = await call("collabs/creators", {
  name: "Deferred identity simulation",
  alias: pendingAlias,
  officialLink: site + "/products?dt_id=isolated-test-only",
  enabled: true,
});
assert.equal(pending.creatorKey, null);
await call(
  "collabs/creators",
  {
    name: "Duplicate tracking simulation",
    alias: pendingAlias + "-duplicate-tracking",
    officialLink: site + "/collections/all?utm_source=test&dt_id=isolated-test-only",
    enabled: true,
  },
  409,
);
const pendingShort = await fetch(site + "/r/" + pendingAlias, { redirect: "manual" });
assert.equal(pendingShort.status, 303);
assert.equal(pendingShort.headers.get("location"), pending.officialLink);
checks++;
const bound = await call("collabs/creators", {
  ...pending,
  creatorKey: `isolated-report-source-${pendingAlias}`,
});
assert.equal(bound.id, pending.id);
assert.equal(bound.alias, pendingAlias);
await call("collabs/creators", { ...bound, creatorKey: null }, 409);
await call("collabs/creators", { ...bound, creatorKey: "reassigned-test-only" }, 409);
await call(
  "collabs/creators",
  { ...bound, id: undefined, alias: pendingAlias + "-duplicate" },
  409,
);
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
// Synthetic Flow events stay in the isolated simulator database only.
const flowCredential = createHmac("sha256", "integration-signing-only-0000000000000000")
  .update("offy:collabs:flow-attributed:v1")
  .digest("hex");
const event = {
  version: 1,
  shop: "offy-integration.myshopify.com",
  sentAt: String(Math.floor(Date.now() / 1000)),
  communityMemberId: 123,
  firstName: "Maya",
  lastName: null,
  primaryUsername: "isolated-only",
  salesNumber: 1,
  linkVisitsCumulative: 3,
  salesCumulativeCents: 9000,
  commissionCumulativeCents: 900,
  orderId: order.id,
  orderName: order.name,
  orderCreatedAt: new Date().toISOString(),
};
const push = () =>
  fetch(site + "/api/collabs/attributed", {
    method: "POST",
    headers: { authorization: `Bearer ${flowCredential}`, "content-type": "application/json" },
    body: JSON.stringify(event),
  });
const accepted = await push();
assert.equal(accepted.status, 200, await accepted.clone().text());
assert.equal((await accepted.json()).duplicate, false);
checks++;
assert.equal((await (await push()).json()).duplicate, true);
checks++;
await fetch("http://127.0.0.1:3900/api/kol/worker", {
  method: "POST",
  headers: { authorization: "Bearer integration-worker-only-00000000000000000" },
});
const automaticallyReceived = (await call("collabs")).attribution;
assert.equal(automaticallyReceived.events.length, 1);
assert.equal(automaticallyReceived.creators[0].creatorId, null);
assert.equal(automaticallyReceived.events[0].order.financialStatus, "PAID");
const indexed = (await call("collabs")).creators.find((c) => c.alias === "qa-collabs");
await call("collabs/bind-flow", { nativeId: "123", creatorId: indexed.id });
assert.equal((await call("collabs")).attribution.creators[0].creatorId, indexed.id);
const metrics = await call("collabs/links?days=7");
assert.equal(metrics.links.find((l) => l.id === indexed.id).total, 1);
assert.equal(metrics.links.find((l) => l.id === indexed.id).periodTotal, 1);
assert.ok(metrics.links.find((l) => l.id === indexed.id).firstAt);
// First-party landing observations remain separate from short-link requests and official events.
const landingView = {
  version: 1,
  dtId: "isolated-test-only",
  eventId: randomUUID(),
  path: "/products",
  analyticsAllowed: true,
};
const observe = (body, visitorCookie = "") =>
  fetch(site + "/api/collabs/landing", {
    method: "POST",
    headers: { origin: site, "content-type": "application/json", cookie: visitorCookie },
    body: JSON.stringify(body),
  });
const landingFirst = await observe(landingView);
assert.equal(landingFirst.status, 200);
checks++;
const landingCookie = landingFirst.headers.get("set-cookie").split(";")[0];
assert.equal((await (await observe(landingView, landingCookie)).json()).duplicate, true);
checks++;
assert.equal((await observe({ ...landingView, eventId: randomUUID() }, landingCookie)).status, 200);
checks++;
const traffic = (await call("collabs/traffic?days=7")).groups.find(
  (g) => g.dtId === landingView.dtId,
);
assert.equal(traffic.periodPv, 2);
assert.equal(traffic.periodUv, 1);
assert.equal(
  (await observe({ ...landingView, dtId: "unknown", eventId: randomUUID() })).status,
  204,
);
checks++;
assert.equal(
  (
    await fetch(site + "/api/collabs/landing", {
      method: "DELETE",
      headers: { origin: site, cookie: landingCookie },
    })
  ).status,
  204,
);
checks++;
const optedOut = (await call("collabs/traffic?days=7")).groups.find(
  (g) => g.dtId === landingView.dtId,
);
assert.equal(optedOut.periodPv, 2);
assert.equal(optedOut.periodUv, 0);
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
// Recoverable cleanup: local history stays readable and official mapping is not removed.
await call("collabs/archive", { id: indexed.id, reason: "test", confirmed: false }, 400);
await call("collabs/archive", { id: indexed.id, reason: "test", confirmed: true });
const afterArchive = await call("collabs");
assert.equal(
  afterArchive.creators.some((c) => c.id === indexed.id),
  false,
);
assert.equal(
  afterArchive.archivedCreators.some((c) => c.id === indexed.id),
  true,
);
assert.equal(afterArchive.attribution.creators[0].creatorId, indexed.id);
assert.equal(
  (await call("collabs/links?days=7")).links.some((l) => l.id === indexed.id),
  false,
);
assert.equal(
  (await call("collabs/links?days=7&includeArchived=1")).links.find((l) => l.id === indexed.id)
    .total,
  1,
);
assert.equal((await fetch(site + "/r/qa-collabs", { redirect: "manual" })).status, 410);
await call("collabs/creators", { ...indexed, enabled: true }, 409);
const archivedReportCheck = await call("collabs/reconcile", { id: batch.id });
assert.equal(
  archivedReportCheck.findings.some((f) => f.code === "creator_unmapped"),
  false,
);
await call("collabs/restore", { id: indexed.id });
assert.equal((await call("collabs")).creators.find((c) => c.id === indexed.id).enabled, false);
assert.equal((await fetch(site + "/r/qa-collabs", { redirect: "manual" })).status, 410);
await call("collabs/creators", { ...indexed, enabled: true });
assert.equal((await fetch(site + "/r/qa-collabs", { redirect: "manual" })).status, 303);
checks += 3;
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
