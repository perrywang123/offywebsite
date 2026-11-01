/** Local simulator only. No .env loading, real Shopify requests, orders or payments. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";

const site = "http://127.0.0.1:3901",
  admin = "http://127.0.0.1:3902",
  mock = "http://127.0.0.1:3903";
const items = [{ code: "integration-sample", quantity: 2 }];
const evidence = [];
async function post(url, body, headers = {}) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
async function mode(value) {
  assert.equal((await post(`${mock}/test/checkout-mode`, { mode: value })).status, 200);
}
const state = await (await fetch(`${mock}/test/state`)).json();
assert.ok(state.directory.startsWith(join(tmpdir(), "offy-kol-integration-")));
const login = await post(
  `${admin}/api/admin/kol/login`,
  { email: "tester@example.com", password: "offy-local-test-only-2026" },
  { origin: admin, "x-offy-csrf": "1" },
);
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie").split(";")[0];
const adminHeaders = { cookie, origin: admin, "x-offy-csrf": "1" };
async function detail(id) {
  const r = await fetch(`${admin}/api/admin/kol/checkouts/${id}`, { headers: adminHeaders });
  assert.equal(r.status, 200);
  return r.json();
}
async function checkout(modeName, expectedStatus, country = "US", registered = true) {
  await mode(modeName);
  const started = registered
    ? await (
        await post(
          `${site}/api/checkout/attempts`,
          { action: "start", items, locale: "en", pagePath: "/cart" },
          { origin: site, "cf-ipcountry": country },
        )
      ).json()
    : {};
  const response = await post(
    `${site}/api/payments/checkout`,
    { provider: "shopify", items, locale: "en", diagnosticReceipt: started.receipt },
    { "cf-ipcountry": country },
  );
  assert.equal(response.status, expectedStatus);
  const body = await response.json(),
    record = await detail(body.attemptId);
  assert.equal(record.country, country);
  if (registered) assert.equal(record.id, started.id);
  assert.deepEqual(record.items, items);
  assert.equal(record.status, expectedStatus === 200 ? "redirect_ready" : "failed");
  evidence.push({
    scenario: modeName + (registered ? "" : "-direct"),
    id: record.id,
    httpStatus: response.status,
    country,
    status: record.status,
    stages: record.events.map((e) => e.type),
  });
  return { record, body };
}
try {
  const { record, body } = await checkout("normal", 200, "GB");
  assert.ok(
    record.events.some(
      (e) =>
        e.type === "shopify_response" &&
        e.data.body.data.cartCreate.cart.buyerIdentity.countryCode === "GB",
    ),
  );
  assert.ok(!JSON.stringify(record).includes("test-secret"));
  const reveal = await post(
    `${admin}/api/admin/kol/checkouts/${record.id}/reveal`,
    {},
    adminHeaders,
  );
  assert.equal(reveal.status, 200);
  const original = await reveal.json();
  assert.equal(original.checkoutUrl, body.redirect.url);
  assert.ok(JSON.stringify(original.responses).includes("test-secret"));
  const warning = await checkout("warning", 200);
  assert.ok(JSON.stringify(warning.record).includes("PRODUCT_UNAVAILABLE_IN_BUYER_LOCATION"));
  await checkout("http_error", 502);
  await checkout("graphql_error", 502);
  await checkout("catalog_error", 503);
  await checkout("normal", 200, "US", false);
  const preflight = await (
    await post(`${site}/api/checkout/attempts`, {
      action: "start",
      items,
      locale: "en",
      pagePath: "/cart",
    })
  ).json();
  await post(`${site}/api/checkout/attempts`, {
    action: "observe",
    receipt: preflight.receipt,
    type: "client_verification_failed",
  });
  assert.equal((await detail(preflight.id)).status, "client_failed");
  evidence.push({ scenario: "client-preflight-failed", id: preflight.id, status: "client_failed" });
  const filtered = await (
    await fetch(`${admin}/api/admin/kol/checkouts?country=GB&query=${record.id.slice(0, 8)}`, {
      headers: adminHeaders,
    })
  ).json();
  assert.equal(filtered.total, 1);
  assert.equal((await fetch(`${site}/api/admin/kol/checkouts`)).status, 404);
  assert.equal((await fetch(`${admin}/api/admin/kol/checkouts`)).status, 401);
  assert.equal(
    (await post(`${admin}/api/admin/kol/checkouts/${record.id}/reveal`, {}, { cookie })).status,
    403,
  );
  const db = new Database(join(state.directory, "test.db"), { readonly: true });
  const stored =
    JSON.stringify(db.prepare("SELECT * FROM checkout_attempts").all()) +
    JSON.stringify(db.prepare("SELECT * FROM checkout_attempt_events").all());
  assert.ok(!stored.includes(body.redirect.url));
  assert.ok(!stored.includes("test-secret"));
  assert.ok(
    db.prepare("SELECT count(*) n FROM kol_audit WHERE action='checkout.reveal'").get().n > 0,
  );
  assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  db.close();
  const result = {
    verifiedAt: new Date().toISOString(),
    environment: "isolated-local-simulator",
    scenarios: evidence,
    checks: [
      "shared-db",
      "encrypted-links-and-cart-keys",
      "sensitive-read-audit",
      "pagination-filter",
      "public-ingress-hidden",
      "authentication",
      "csrf",
      "database-integrity",
    ],
    noRealShopifyRequests: true,
    noOrdersOrPayments: true,
  };
  writeFileSync(
    join(state.directory, "checkout-diagnostics-validation.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await mode("normal");
}
