// End-to-end HTTP regression against scripts/kol-integration.ts only.
import assert from "node:assert/strict";
const site = "http://127.0.0.1:3901",
  admin = "http://127.0.0.1:3902",
  mock = "http://127.0.0.1:3903";
const fixture = await (await fetch(mock + "/test/state")).json();
assert.match(fixture.directory, /offy-kol-integration-/);
let cookie = "",
  checks = 0;
async function call(path, body) {
  const r = await fetch(admin + "/api/admin/kol/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { cookie, origin: admin, "x-offy-csrf": "1", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (path === "login") cookie = r.headers.get("set-cookie").split(";")[0];
  assert.equal(r.status, 200, JSON.stringify(data));
  return data;
}
await call("login", { email: "tester@example.com", password: "offy-local-test-only-2026" });
let state = await call("state"),
  p = state.partners.find((p) => p.alias === "maya");
assert.ok(p, "First run the browser scenario to create Maya");
const suffix = Date.now().toString(36).toUpperCase(),
  candidate = `MAYA-${suffix}`;
const job = await call("codes/generate", {
  kolId: p.id,
  campaignId: "gid://shopify/DiscountCodeNode/900",
  code: candidate,
});
assert.equal(
  (await call("state")).codes.some((c) => c.normalized === candidate),
  false,
);
checks++;
for (let n = 0; n < 25; n++) {
  await call("sync", {});
  state = await call("state");
  if (state.jobs.find((j) => j.id === job.id)?.status === "bound") break;
  await new Promise((r) => setTimeout(r, 1000));
}
state = await call("state");
assert.equal(state.codes.find((c) => c.normalized === candidate)?.status, "bound");
checks++;
const visit = await fetch(site + "/r/maya", { redirect: "manual" });
assert.equal(visit.status, 303);
const ticket = new URL(visit.headers.get("location")).searchParams.get("offy_visit");
const confirmed = await (
  await fetch(site + "/api/kol/visit", {
    method: "POST",
    headers: { origin: site, "Content-Type": "application/json" },
    body: JSON.stringify({ ticket }),
  })
).json();
assert.equal(confirmed.active, true);
checks++;
async function checkout(referralTicket) {
  const r = await fetch(site + "/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "shopify",
      locale: "en",
      items: [{ code: "integration-sample", quantity: 1 }],
      referralTicket,
    }),
  });
  assert.equal(r.status, 200);
  return (await r.json()).redirect.url;
}
const checkoutUrl = await checkout(ticket),
  frozenRate = p.rateBps;
await call("partners/" + p.id, { ...p.terms, rate: "12" });
checks++;
await fetch(checkoutUrl, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: "code=ELI-FANS",
  redirect: "manual",
});
for (let n = 0; n < 15; n++) {
  await call("sync", {});
  state = await call("state");
  if (
    state.orders.some(
      (o) =>
        o.intentId &&
        o.id !== fixture.orders.at(-1)?.id &&
        o.net === 9000 &&
        o.rateBps === frozenRate,
    )
  )
    break;
  await new Promise((r) => setTimeout(r, 500));
}
const provider = (await (await fetch(mock + "/test/state")).json()).orders.at(-1),
  o = state.orders.find((o) => o.id === provider.id);
assert.equal(o.status, "verified");
assert.equal(o.kolId, p.id);
assert.equal(o.rateBps, frozenRate);
checks += 3;
await call("partners/" + p.id, { ...p.terms }); // restore current terms, preserving history.
await fetch(mock + "/test/mature", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: o.id }),
});
await call("orders/reconcile", { id: o.id });
const month = new Date().toISOString().slice(0, 7),
  s = await call("settlements", { kolId: p.id, currency: "USD", month });
await call("settlements/lock", { id: s.id });
await call("settlements/pay", {
  id: s.id,
  reference: `HTTP-TEST-${suffix}`,
  reason: "Isolated simulated receipt only",
});
checks += 3;
const csvBefore = await (
  await fetch(admin + `/api/admin/kol/settlements/${s.id}/csv`, { headers: { cookie } })
).text();
assert.ok(csvBefore.includes(",90.00,"));
assert.ok(!csvBefore.includes("@example.com"));
checks += 2;
await fetch(mock + "/test/refund", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: o.id }),
});
await call("orders/reconcile", { id: o.id });
const csvAfter = await (
  await fetch(admin + `/api/admin/kol/settlements/${s.id}/csv`, { headers: { cookie } })
).text();
assert.equal(csvAfter, csvBefore);
checks++;
state = await call("state");
assert.equal(state.orders.find((x) => x.id === o.id).net, 6000);
assert.equal(state.settlements.find((x) => x.id === s.id).status, "paid");
checks += 2;
const standalone = await checkout(undefined);
await fetch(standalone, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: "code=ELI-FANS",
  redirect: "manual",
});
const noLink = (await (await fetch(mock + "/test/state")).json()).orders.at(-1);
await call("orders/reconcile", { id: noLink.id });
state = await call("state");
assert.equal(state.orders.find((x) => x.id === noLink.id).status, "unattributed");
assert.equal(state.orders.find((x) => x.id === noLink.id).commission, null);
checks += 2;
console.log(
  JSON.stringify({
    passed: checks,
    generatedCode: candidate,
    order: o.name,
    snapshotRate: frozenRate / 100,
    settlement: s.id,
    paidStatementUnchangedAfterRefund: true,
    couponOnlyUnattributed: true,
  }),
);
await call("logout", {});
