/** Read only proof from the explicit loopback simulator; never loads .env. */
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import Database from "better-sqlite3";
const state = await (await fetch("http://127.0.0.1:4513/test/state")).json();
assert.ok(state.directory.startsWith(join(tmpdir(), "offy-kol-integration-")));
assert.equal(state.orders.length, 0, "browser verification must not pay an order");
const { metaReceived, pixelReceived } = await (
  await fetch("http://127.0.0.1:4513/test/meta-state")
).json();
const transport = await (await fetch("http://127.0.0.1:4513/test/meta-ingestion")).json();
assert.ok(
  transport.failedMetaEventIds.length > 0,
  "arm one loopback ingestion failure before adding to cart",
);
const db = new Database(join(state.directory, "test.db"), { readonly: true });
const rows = db
  .prepare(
    "SELECT id,name,status,attempt_id,source_json,data_json,payload FROM meta_events ORDER BY created_at",
  )
  .all();
const internal = (row) => {
  const source = JSON.parse(row.source_json);
  return (
    source.utm_source?.toLowerCase() === "offy_validation" ||
    source.utm_medium?.toLowerCase() === "internal_test"
  );
};
const normal = rows.filter((r) => !internal(r));
assert.ok(normal.some((r) => r.name === "PageView"));
assert.ok(normal.some((r) => r.name === "ViewContent"));
assert.ok(!rows.some((r) => r.name === "Purchase"));
assert.ok(!metaReceived.some((r) => ["InitiateCheckout", "Purchase"].includes(r.event_name)));
assert.ok(!pixelReceived.some((r) => ["InitiateCheckout", "Purchase"].includes(r[2])));
const checks = [];
for (const id of transport.failedMetaEventIds) {
  assert.equal(
    rows.filter((r) => r.id === id).length,
    1,
    "failed request must retry into exactly one database row",
  );
  assert.equal(
    pixelReceived.filter((r) => r[4]?.eventID === id).length,
    1,
    "retry must not replay Pixel",
  );
}
for (const name of ["AddToCart"]) {
  const server = metaReceived.findLast((r) => r.event_name === name);
  assert.ok(server);
  const browser = pixelReceived.filter((r) => r[2] === name && r[4].eventID === server.event_id);
  assert.equal(browser.length, 1, "browser and server event IDs must match without Pixel replay");
  assert.deepEqual(browser[0][3], server.custom_data);
  const row = rows.find((r) => r.id === server.event_id);
  assert.equal(row.status, "sent");
  assert.equal(row.payload, null, "sensitive matching payload is discarded after success");
  assert.equal(JSON.parse(row.source_json).utm_source, "meta");
  assert.equal(JSON.parse(row.source_json).ad_id, "123456789");
  assert.equal(server.custom_data.currency, "USD");
  assert.equal(server.custom_data.value, server.custom_data.num_items * 100);
  checks.push({
    name,
    eventId: row.id,
    browserServerIdMatch: true,
    status: row.status,
    value: server.custom_data.value,
    currency: server.custom_data.currency,
    checkoutLinked: !!row.attempt_id,
  });
}
const ready = normal.filter((r) => r.name === "CheckoutReady");
assert.ok(ready.length >= 2, "verify shopping bag and Buy Now independently");
for (const row of ready) {
  assert.ok(row.attempt_id);
  assert.equal(row.status, "observed");
  assert.equal(row.payload, null);
  assert.equal(
    db.prepare("SELECT status FROM checkout_attempts WHERE id=?").get(row.attempt_id).status,
    "redirect_ready",
  );
}
const tests = rows.filter(internal);
assert.ok(tests.some((r) => r.name === "PageView"));
assert.ok(tests.some((r) => r.name === "ViewContent"));
assert.ok(tests.some((r) => r.name === "AddToCart"));
for (const row of tests) {
  assert.equal(row.payload, null);
  if (row.name === "AddToCart") assert.equal(row.status, "suppressed");
  assert.ok(!metaReceived.some((r) => r.event_id === row.id));
  assert.ok(!pixelReceived.some((r) => r[4]?.eventID === row.id));
}
db.close();
const proof = {
  checkedAt: new Date().toISOString(),
  simulatorOnly: true,
  realOrdersCreated: 0,
  realMetaRequests: 0,
  checks,
  localCheckoutReady: ready.length,
  offyMetaCheckoutOrPurchase: 0,
  internalObservations: tests.length,
  internalPixelOrCapi: 0,
  recoveredIngestionFailures: transport.failedMetaEventIds.length,
};
mkdirSync("docs/design/meta-reliability", { recursive: true });
writeFileSync(
  "docs/design/meta-reliability/protocol-proof.json",
  JSON.stringify(proof, null, 2) + "\n",
);
console.log(JSON.stringify(proof, null, 2));
