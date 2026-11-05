// Local simulator only; never reads .env or contacts a real Shopify shop.
import assert from "node:assert/strict";
const admin = "http://127.0.0.1:3902",
  mock = "http://127.0.0.1:3903",
  site = "http://127.0.0.1:3901";
const authState = async () => (await fetch(`${mock}/test/admin-auth`)).json();
assert.equal(
  (await authState()).automaticAdmin,
  true,
  "Start with OFFY_TEST_ADMIN_AUTH=automatic pnpm kol:integration",
);
let cookie = "";
async function call(path, body) {
  const r = await fetch(`${admin}/api/admin/kol/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { cookie, origin: admin, "x-offy-csrf": "1", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (path === "login") cookie = r.headers.get("set-cookie").split(";")[0];
  const data = await r.json();
  assert.equal(r.status, 200, JSON.stringify(data));
  assert.doesNotMatch(JSON.stringify(data), /integration-(auto-\d+|secret|client)/);
  return data;
}
await call("login", { email: "tester@example.com", password: "offy-local-test-only-2026" });
assert.deepEqual((await call("connection")).scopes, ["read_orders", "read_discounts"]);
const start = (await authState()).grants;
await Promise.all(Array.from({ length: 6 }, () => call("connection")));
assert.equal(
  (await authState()).grants,
  start,
  "cached token shared by concurrent remote operations",
);
await new Promise((r) => setTimeout(r, 12500));
await call("connection");
assert.ok((await authState()).grants > start, "token renewed without environment edits/restart");
const beforeReject = (await authState()).grants;
await fetch(`${mock}/test/admin-auth`, {
  method: "POST",
  body: JSON.stringify({ rejectNext: true }),
});
await call("connection");
assert.equal((await authState()).grants, beforeReject + 1, "one fresh grant recovers HTTP 401");
await call("sync", {});
assert.equal((await call("state")).health.shopifyAdminConfigured, true);
// Storefront still uses its separate Storefront token; checkout records remain accessible.
const checkout = await fetch(`${site}/api/payments/checkout`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-country-code": "US" },
  body: JSON.stringify({
    provider: "shopify",
    locale: "en",
    items: [{ code: "integration-sample", quantity: 1 }],
  }),
});
assert.equal(checkout.status, 200);
const result = await checkout.json();
assert.ok(String(result.redirect.url).startsWith(`${mock}/checkout/`));
await call("checkouts");
console.log(
  JSON.stringify({
    simulator: true,
    automatic: true,
    concurrentCache: true,
    expiryRenewal: true,
    unauthorizedRecovery: true,
    workerSync: true,
    storefrontCheckout: true,
    privateResponses: true,
  }),
);
