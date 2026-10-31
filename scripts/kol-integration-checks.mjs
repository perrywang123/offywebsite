// HTTP boundary checks only. UI purchase steps are tested in the real browser.
import assert from "node:assert/strict";
const site = "http://127.0.0.1:3901",
  admin = "http://127.0.0.1:3902";
let checks = 0;
for (const path of [
  "/admin",
  "/admin/partners",
  "/api/admin/kol/state",
  "/en/admin",
  "/%61dmin",
  "/admin/",
  "/api/kol/worker",
]) {
  const r = await fetch(site + path, {
    headers: { "x-offy-admin-ingress": "integration-ingress-only-0000000000000000" },
    redirect: "manual",
  });
  assert.ok([404, 308].includes(r.status), `${path}: ${r.status}`);
  checks++;
}
assert.equal((await fetch("http://localhost:3900/api/admin/kol/state")).status, 404);
checks++;
assert.equal((await fetch(admin + "/api/admin/kol/state")).status, 401);
checks++;
assert.equal(
  (
    await fetch(admin + "/api/admin/kol/login", {
      method: "POST",
      headers: {
        origin: "https://evil.test",
        "x-offy-csrf": "1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "tester@example.com", password: "offy-local-test-only-2026" }),
    })
  ).status,
  403,
);
checks++;
const r = await fetch(admin + "/api/admin/kol/login", {
  method: "POST",
  headers: { origin: admin, "x-offy-csrf": "1", "Content-Type": "application/json" },
  body: JSON.stringify({ email: "tester@example.com", password: "offy-local-test-only-2026" }),
});
assert.equal(r.status, 200);
const cookie = r.headers.get("set-cookie").split(";")[0];
checks++;
assert.match(r.headers.get("set-cookie"), /HttpOnly/i);
assert.match(r.headers.get("set-cookie"), /SameSite=strict/i);
checks += 2;
const state = await fetch(admin + "/api/admin/kol/state", { headers: { cookie } });
assert.equal(state.status, 200);
assert.match(state.headers.get("cache-control"), /no-store/);
checks += 2;
assert.equal(
  (
    await fetch(site + "/api/admin/kol/state", {
      headers: { cookie, "x-offy-admin-ingress": "integration-ingress-only-0000000000000000" },
    })
  ).status,
  404,
);
checks++;
const data = await state.json(),
  p = data.partners.find((p) => p.alias === "maya");
if (p) {
  const count = p.requests;
  assert.equal((await fetch(site + "/r/maya", { method: "HEAD" })).status, 204);
  assert.equal(
    (await fetch(site + "/r/maya", { headers: { "user-agent": "Slackbot preview" } })).status,
    204,
  );
  const after = await (await fetch(admin + "/api/admin/kol/state", { headers: { cookie } })).json();
  assert.equal(after.partners.find((x) => x.id === p.id).requests, count);
  checks += 3;
}
assert.equal(
  (
    await fetch(site + "/api/kol/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shopify-shop-domain": "offy-integration.myshopify.com",
        "x-shopify-topic": "orders/paid",
        "x-shopify-webhook-id": "invalid-signature",
      },
      body: '{"id":1}',
    })
  ).status,
  401,
);
checks++;
const logout = await fetch(admin + "/api/admin/kol/logout", {
  method: "POST",
  headers: { cookie, origin: admin, "x-offy-csrf": "1" },
  body: "{}",
});
assert.equal(logout.status, 200);
assert.equal((await fetch(admin + "/api/admin/kol/state", { headers: { cookie } })).status, 401);
checks += 2;
console.log(`Isolated HTTP boundary checks passed: ${checks}`);
