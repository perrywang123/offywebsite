/** Read only proof from the explicit loopback simulator; never loads .env. */
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import Database from "better-sqlite3";
const state = await (await fetch("http://127.0.0.1:4513/test/state")).json();
assert.ok(state.directory.startsWith(join(tmpdir(), "offy-kol-integration-")));
assert.equal(state.orders.length, 0, "browser verification must not pay an order");
const { metaReceived, pixelReceived } = await (
  await fetch("http://127.0.0.1:4513/test/meta-state")
).json();
const db = new Database(join(state.directory, "test.db"), { readonly: true });
const rows = db
  .prepare(
    "SELECT id,name,status,attempt_id,source_json,data_json,payload FROM meta_events ORDER BY created_at",
  )
  .all();
assert.ok(rows.some((r) => r.name === "PageView"));
assert.ok(rows.some((r) => r.name === "ViewContent"));
assert.ok(!rows.some((r) => r.name === "Purchase"));
const checks = [];
for (const name of ["AddToCart", "InitiateCheckout"]) {
  const server = metaReceived.findLast((r) => r.event_name === name);
  assert.ok(server);
  const browser = pixelReceived.find((r) => r[2] === name && r[4].eventID === server.event_id);
  assert.ok(browser, "browser and server event IDs must match");
  assert.deepEqual(browser[3], server.custom_data);
  const row = rows.find((r) => r.id === server.event_id);
  assert.equal(row.status, "sent");
  assert.equal(row.payload, null, "sensitive matching payload is discarded after success");
  assert.equal(JSON.parse(row.source_json).utm_source, "meta");
  assert.equal(server.custom_data.currency, "USD");
  assert.equal(server.custom_data.value, server.custom_data.num_items * 100);
  if (name === "InitiateCheckout") {
    assert.ok(row.attempt_id);
    assert.equal(
      db.prepare("SELECT status FROM checkout_attempts WHERE id=?").get(row.attempt_id).status,
      "redirect_ready",
    );
  }
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
db.close();
const proof = { simulatorOnly: true, realOrdersCreated: 0, realMetaRequests: 0, checks };
writeFileSync("docs/design/meta-funnel/protocol-proof.json", JSON.stringify(proof, null, 2) + "\n");
console.log(JSON.stringify(proof, null, 2));
