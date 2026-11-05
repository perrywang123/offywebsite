// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { adminAuthMode, createAdminClient, type AdminClientConfig } from "./shopify-auth";

function setup() {
  let time = 0;
  const config: AdminClientConfig = {
    shop: "offy-test.myshopify.com",
    origin: "https://offy-test.myshopify.com",
    apiVersion: "2026-07",
    clientId: "dummy-client",
    clientSecret: "dummy-secret",
    manualToken: "old-manual",
  };
  let grants = 0;
  const network = vi.fn<typeof fetch>(async (url) =>
    String(url).endsWith("/access_token")
      ? Response.json({ access_token: `automatic-${++grants}`, expires_in: 100 })
      : Response.json({ data: { ok: true } }),
  );
  return {
    config,
    network,
    client: createAdminClient(
      () => config,
      () => time,
    ),
    tick: (value: number) => (time = value),
    grants: () => grants,
  };
}
const query = "query { shop { id } }";
const calls = (s: ReturnType<typeof setup>, suffix: string) =>
  s.network.mock.calls.filter(([url]) => String(url).endsWith(suffix));
describe("server-only automatic Admin authentication", () => {
  it("prefers complete application credentials, caches and renews using the returned expiry", async () => {
    const s = setup();
    await s.client.request(query, {}, s.network);
    const grant = calls(s, "/access_token")[0];
    expect(grant[0]).toBe(`${s.config.origin}/admin/oauth/access_token`);
    expect(grant[1]).toMatchObject({ method: "POST", cache: "no-store", redirect: "error" });
    expect(new URLSearchParams(String(grant[1]?.body))).toEqual(
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: "dummy-client",
        client_secret: "dummy-secret",
      }),
    );
    s.tick(89000);
    await s.client.request(query, {}, s.network);
    expect(s.grants()).toBe(1);
    s.tick(90000);
    await s.client.request(query, {}, s.network);
    expect(s.grants()).toBe(2);
    expect(calls(s, "/graphql.json").map(([, init]) => init?.headers)).toEqual([
      expect.objectContaining({ "X-Shopify-Access-Token": "automatic-1" }),
      expect.objectContaining({ "X-Shopify-Access-Token": "automatic-1" }),
      expect.objectContaining({ "X-Shopify-Access-Token": "automatic-2" }),
    ]);
  });
  it("shares one acquisition and one renewal among concurrent operations", async () => {
    const s = setup();
    await Promise.all(Array.from({ length: 12 }, () => s.client.request(query, {}, s.network)));
    expect(s.grants()).toBe(1);
    s.tick(95000);
    await Promise.all(Array.from({ length: 12 }, () => s.client.request(query, {}, s.network)));
    expect(s.grants()).toBe(2);
  });
  it("renews a normal 24-hour token five minutes early", async () => {
    const s = setup();
    s.network.mockImplementation(async (url) =>
      String(url).endsWith("/access_token")
        ? Response.json({ access_token: "dummy-day-token", expires_in: 86399 })
        : Response.json({ data: { ok: true } }),
    );
    await s.client.request(query, {}, s.network);
    s.tick(86399000 - 300001);
    await s.client.request(query, {}, s.network);
    expect(calls(s, "/access_token")).toHaveLength(1);
    s.tick(86399000 - 300000);
    await s.client.request(query, {}, s.network);
    expect(calls(s, "/access_token")).toHaveLength(2);
  });
  it("reacquires after process restart or a configuration change", async () => {
    const s = setup();
    await s.client.request(query, {}, s.network);
    s.config.clientSecret = "replacement-dummy-secret";
    await s.client.request(query, {}, s.network);
    await createAdminClient(() => s.config).request(query, {}, s.network);
    expect(s.grants()).toBe(3);
  });
  it("retains manual and unconfigured modes and rejects a partial pair without networking", async () => {
    const s = setup();
    s.config.clientId = s.config.clientSecret = "";
    expect(adminAuthMode(s.config)).toBe("manual");
    await s.client.request(query, {}, s.network);
    expect(s.grants()).toBe(0);
    expect(calls(s, "/graphql.json")[0][1]?.headers).toMatchObject({
      "X-Shopify-Access-Token": "old-manual",
    });
    s.config.manualToken = " ";
    expect(adminAuthMode(s.config)).toBe("unconfigured");
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
      "shopify_admin_not_configured",
    );
    s.config.clientId = "dummy-client";
    s.config.manualToken = "old-manual";
    expect(adminAuthMode(s.config)).toBe("incomplete");
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
      "shopify_admin_credentials_incomplete",
    );
    expect(s.network).toHaveBeenCalledTimes(1);
  });
  it("merges concurrent 401 recovery and retries each operation only once", async () => {
    const s = setup();
    await s.client.request(query, {}, s.network);
    const original = s.network.getMockImplementation()!;
    s.network.mockImplementation(async (url, init) => {
      if (new Headers(init?.headers).get("X-Shopify-Access-Token") === "automatic-1")
        return new Response(null, { status: 401 });
      return original(url, init);
    });
    await Promise.all(Array.from({ length: 8 }, () => s.client.request(query, {}, s.network)));
    expect(s.grants()).toBe(2);
    s.network.mockImplementation(async (url, init) =>
      String(url).endsWith("/access_token")
        ? original(url, init)
        : new Response(null, { status: 401 }),
    );
    const before = s.network.mock.calls.length;
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow("shopify_admin_http_401");
    expect(s.network.mock.calls.length - before).toBe(3);
    const after = s.network.mock.calls.length;
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow("shopify_admin_http_401");
    expect(s.network).toHaveBeenCalledTimes(after);
  });
  it.each([403, 429, 500])("does not replay a mutation on HTTP %s", async (status) => {
    const s = setup();
    s.network.mockImplementation(async (url) =>
      String(url).endsWith("/access_token")
        ? Response.json({ access_token: "automatic", expires_in: 100 })
        : new Response(null, { status }),
    );
    await expect(s.client.request("mutation { dummy }", {}, s.network)).rejects.toThrow(
      `shopify_admin_http_${status}`,
    );
    expect(calls(s, "/graphql.json")).toHaveLength(1);
    expect(calls(s, "/access_token")).toHaveLength(1);
  });
  it("does not replay a GraphQL permission failure, network failure, or manual 401", async () => {
    const s = setup();
    await s.client.request(query, {}, s.network);
    s.network.mockResolvedValue(Response.json({ errors: [{ message: "secret raw response" }] }));
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
      "shopify_admin_graphql_error",
    );
    s.network.mockRejectedValue(new Error("secret network response"));
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
      "shopify_admin_network_error",
    );
    s.config.clientId = s.config.clientSecret = "";
    s.network.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow("shopify_admin_http_401");
    expect(s.network).toHaveBeenCalledTimes(5);
  });
  it("uses an unexpired token during a renewal outage, backs off, and refuses it after hard expiry", async () => {
    const s = setup();
    await s.client.request(query, {}, s.network);
    const original = s.network.getMockImplementation()!;
    s.network.mockImplementation(async (url, init) =>
      String(url).endsWith("/access_token")
        ? new Response("dummy-secret must never escape", { status: 500 })
        : original(url, init),
    );
    s.tick(90000);
    await s.client.request(query, {}, s.network);
    s.tick(95000);
    await s.client.request(query, {}, s.network);
    s.tick(100000);
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
      "shopify_admin_auth_http_500",
    );
    expect(calls(s, "/access_token")).toHaveLength(2);
    expect(calls(s, "/graphql.json")).toHaveLength(3);
    s.tick(120000);
    s.network.mockImplementation(original);
    await s.client.request(query, {}, s.network);
    expect(s.grants()).toBe(2);
  });
  it("never falls back to a 401-rejected token during an acquisition outage", async () => {
    const s = setup();
    await s.client.request(query, {}, s.network);
    s.network.mockImplementation(async (url) =>
      String(url).endsWith("/access_token")
        ? new Response(null, { status: 503 })
        : new Response(null, { status: 401 }),
    );
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
      "shopify_admin_auth_http_503",
    );
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
      "shopify_admin_auth_http_503",
    );
    expect(calls(s, "/graphql.json")).toHaveLength(2);
    expect(calls(s, "/access_token")).toHaveLength(2);
  });
  it.each([
    {},
    { access_token: "", expires_in: 100 },
    { access_token: "dummy", expires_in: 0 },
    { access_token: "dummy", expires_in: "100" },
    { access_token: "dummy", expires_in: -1 },
  ])("rejects malformed grant response %j and suppresses a retry storm", async (body) => {
    const s = setup();
    s.network.mockResolvedValue(Response.json(body));
    for (let i = 0; i < 3; i++)
      await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
        "shopify_admin_auth_invalid_response",
      );
    expect(s.network).toHaveBeenCalledTimes(1);
  });
  it("calculates expiry from request start and never sends a token already expired in transit", async () => {
    const s = setup();
    s.network.mockImplementation(async () => {
      s.tick(101000);
      return Response.json({ access_token: "dummy", expires_in: 100 });
    });
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
      "shopify_admin_auth_invalid_response",
    );
    expect(s.network).toHaveBeenCalledTimes(1);
  });
  it.each([
    "https://attacker.test",
    "http://offy-test.myshopify.com",
    "https://offy-test.myshopify.com:8443",
    "https://offy-test.myshopify.com/other",
    "http://127.0.0.1:3903",
  ])("refuses credential exchange to %s", async (origin) => {
    const s = setup();
    s.config.origin = origin;
    await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
      "shopify_admin_auth_unsafe_origin",
    );
    expect(s.network).not.toHaveBeenCalled();
  });
  it("permits only an explicitly guarded loopback simulator", async () => {
    const s = setup();
    s.config.origin = "http://127.0.0.1:3903";
    s.config.allowLoopback = true;
    await s.client.request(query, {}, s.network);
    expect(s.grants()).toBe(1);
  });
  it("sanitizes token endpoint network and JSON errors", async () => {
    for (const response of [
      () => Promise.reject(new Error("dummy-secret")),
      () => Promise.resolve(new Response("dummy-secret")),
    ]) {
      const s = setup();
      s.network.mockImplementation(response);
      await expect(s.client.request(query, {}, s.network)).rejects.toThrow(
        /^shopify_admin_auth_(network_error|invalid_response)$/,
      );
    }
  });
});
