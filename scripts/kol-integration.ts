/** Isolated local Shopify simulator + ingress proxies. Never uses the project .env. */
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID, createHmac, scryptSync } from "node:crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
async function main() {
  const collabs = process.env.OFFY_TEST_COLLABS === "true";
  const automaticAdmin = process.env.OFFY_TEST_ADMIN_AUTH === "automatic";
  let adminGrants = 0,
    adminRequests = 0,
    rejectNextAdmin = false;
  const directory = process.argv[2] ?? mkdtempSync(join(tmpdir(), "offy-kol-integration-"));
  if (!directory.startsWith(join(tmpdir(), "offy-kol-integration-")))
    throw new Error("Only isolated integration directories may be reused");
  const dbPath = join(directory, "test.db");
  const appPort = 3900,
    publicPort = 3901,
    adminPort = 3902,
    mockPort = 3903;
  const site = `http://127.0.0.1:${publicPort}`,
    admin = `http://127.0.0.1:${adminPort}`,
    mock = `http://127.0.0.1:${mockPort}`;
  const ingress = "integration-ingress-only-0000000000000000",
    signing = "integration-signing-only-0000000000000000",
    worker = "integration-worker-only-00000000000000000",
    webhook = "integration-webhook-only-000000000000000";
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode=WAL");
  sqlite.pragma("foreign_keys=ON");
  sqlite.pragma("busy_timeout=5000");
  migrate(drizzle(sqlite), { migrationsFolder: "db/migrations" });
  const password = "offy-local-test-only-2026",
    salt = "integration-only-salt",
    adminId = randomUUID();
  sqlite
    .prepare("INSERT OR IGNORE INTO kol_admins(id,email,password_hash,created_at) VALUES (?,?,?,?)")
    .run(
      adminId,
      "tester@example.com",
      `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
      Date.now(),
    );
  const bag = (amount: string, currencyCode = "USD") => ({
      presentmentMoney: { amount, currencyCode },
    }),
    pageInfo = { hasNextPage: false, endCursor: null };
  const product = {
    handle: "integration-sample",
    title: "OFFY Integration Sample",
    description: "Isolated mock Shopify product. No real purchase.",
    descriptionHtml: "<p>Isolated mock Shopify product. No real purchase.</p>",
    availableForSale: true,
    createdAt: "2026-01-01T00:00:00Z",
    featuredImage: { url: `${site}/assets/hero/hero-brand.jpg` },
    images: { nodes: [{ url: `${site}/assets/hero/hero-brand.jpg` }] },
    variants: {
      nodes: [
        {
          id: "gid://shopify/ProductVariant/999",
          sku: "TEST-ONLY",
          availableForSale: true,
          price: { amount: "100.00", currencyCode: "USD" },
        },
      ],
    },
    collections: { nodes: [{ handle: "frontpage" }], pageInfo },
  };
  const campaignId = "gid://shopify/DiscountCodeNode/900",
    discount = {
      __typename: "DiscountCodeBasic",
      title: "Integration Fan Campaign",
      status: "ACTIVE",
      summary: "模拟：10%优惠；共享活动，不连接真实店铺",
      startsAt: "2026-01-01T00:00:00Z",
      endsAt: null,
    };
  const codes = new Set(["MAYA-EXISTING", "ELI-FANS"]),
    jobs = new Map<string, { code: string; polls: number }>(),
    carts = new Map<
      string,
      { attributes: Array<{ key: string; value: string }>; quantity: number }
    >();
  // Minimal mock facts are intentionally confined to this test process.
  interface MockOrder {
    id: string;
    name: string;
    cartToken: string;
    customAttributes: Array<{ key: string; value: string }>;
    presentmentCurrencyCode: string;
    taxesIncluded: boolean;
    edited: boolean;
    cancelledAt: null;
    displayFinancialStatus: string;
    disputes: unknown[];
    totalPriceSet: ReturnType<typeof bag>;
    totalOutstandingSet: ReturnType<typeof bag>;
    transactions: Array<{
      id: string;
      kind: string;
      status: string;
      amountSet: ReturnType<typeof bag>;
      processedAt: string;
    }>;
    lineItems: {
      nodes: Array<{
        id: string;
        isGiftCard: boolean;
        quantity: number;
        originalTotalSet: ReturnType<typeof bag>;
        discountAllocations: Array<{ allocatedAmountSet: ReturnType<typeof bag> }>;
        taxLines: unknown[];
      }>;
      pageInfo: typeof pageInfo;
    };
    refunds: unknown[];
  }
  for (const row of sqlite.prepare("SELECT normalized FROM kol_codes").all() as {
    normalized: string;
  }[])
    codes.add(row.normalized);
  for (const row of sqlite
    .prepare("SELECT remote_id,candidate FROM kol_code_jobs WHERE remote_id IS NOT NULL")
    .all() as { remote_id: string; candidate: string }[])
    jobs.set(row.remote_id, { code: row.candidate, polls: 2 });
  const orders = new Map<string, MockOrder>();
  let checkoutMode = "normal";
  let eventCounter = 0;
  function send(res: ServerResponse, data: unknown, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(data));
  }
  async function body(req: IncomingMessage) {
    let s = "";
    for await (const chunk of req) {
      s += chunk;
      if (s.length > 1048576) throw new Error("body_too_large");
    }
    return s;
  }
  async function notify(order: MockOrder, topic = "orders/paid") {
    const raw = JSON.stringify({
        id: Number(order.id.split("/").pop()),
        admin_graphql_api_id: order.id,
      }),
      response = await fetch(`${site}/api/kol/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shopify-hmac-sha256": createHmac("sha256", webhook).update(raw).digest("base64"),
          "x-shopify-shop-domain": "offy-integration.myshopify.com",
          "x-shopify-topic": topic,
          "x-shopify-webhook-id": `integration-${++eventCounter}`,
        },
        body: raw,
      });
    if (!response.ok) throw new Error(`webhook_${response.status}`);
  }
  const mockServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", mock);
      if (url.pathname === "/test/admin-auth") {
        if (req.method === "POST")
          rejectNextAdmin = Boolean(JSON.parse(await body(req)).rejectNext);
        return send(res, { automaticAdmin, grants: adminGrants, requests: adminRequests });
      }
      if (url.pathname === "/admin/oauth/access_token") {
        const form = new URLSearchParams(await body(req));
        if (
          !automaticAdmin ||
          form.get("grant_type") !== "client_credentials" ||
          form.get("client_id") !== "integration-client" ||
          form.get("client_secret") !== "integration-secret" ||
          form.has("scope")
        )
          return send(res, { error: "invalid_client" }, 401);
        return send(res, { access_token: `integration-auto-${++adminGrants}`, expires_in: 12 });
      }
      if (url.pathname.startsWith("/admin/api/")) {
        adminRequests++;
        const expected = automaticAdmin ? `integration-auto-${adminGrants}` : "integration-dummy";
        if (rejectNextAdmin || req.headers["x-shopify-access-token"] !== expected) {
          rejectNextAdmin = false;
          return send(res, { error: "unauthorized" }, 401);
        }
      }
      if (url.pathname === "/test/checkout-mode" && req.method === "POST") {
        const { mode } = JSON.parse(await body(req));
        if (!["normal", "warning", "http_error", "graphql_error", "catalog_error"].includes(mode))
          throw new Error("invalid_mode");
        checkoutMode = mode;
        return send(res, { mode });
      }
      if (url.pathname === "/test/state")
        return send(res, { directory, orders: [...orders.values()], codes: [...codes] });
      if (url.pathname === "/test/mature" && req.method === "POST") {
        const { id } = JSON.parse(await body(req)),
          o = orders.get(id);
        if (!o) throw new Error("order_missing");
        const shift = 31 * 86400000;
        for (const t of o.transactions)
          t.processedAt = new Date(Date.parse(t.processedAt) - shift).toISOString();
        sqlite
          .prepare(
            "UPDATE kol_intents SET created_at=created_at-?, expires_at=expires_at-? WHERE cart_token=?",
          )
          .run(shift, shift, o.cartToken);
        sqlite
          .prepare("UPDATE kol_ledger SET available_at=available_at-? WHERE order_id=?")
          .run(shift, id);
        await notify(o, "orders/updated");
        return send(res, {
          ok: true,
          simulation: "31-day test time shift; isolated test database only",
        });
      }
      if (url.pathname === "/test/refund" && req.method === "POST") {
        const { id } = JSON.parse(await body(req)),
          o = orders.get(id);
        if (!o) throw new Error("order_missing");
        o.displayFinancialStatus = "PARTIALLY_REFUNDED";
        o.refunds = [
          {
            id: "gid://shopify/Refund/9001",
            totalRefundedSet: bag("30.00"),
            transactions: {
              nodes: [
                {
                  id: "refund-tx",
                  kind: "REFUND",
                  status: "SUCCESS",
                  processedAt: new Date().toISOString(),
                  amountSet: bag("30.00"),
                },
              ],
              pageInfo,
            },
            refundLineItems: {
              nodes: [
                {
                  lineItem: { id: "line-1", isGiftCard: false },
                  quantity: 1,
                  subtotalSet: bag("30.00"),
                  totalTaxSet: bag("0.00"),
                },
              ],
              pageInfo,
            },
            refundShippingLines: { nodes: [], pageInfo },
            orderAdjustments: { nodes: [], pageInfo },
          },
        ];
        await notify(o, "orders/updated");
        return send(res, { ok: true });
      }
      if (url.pathname.startsWith("/checkout/")) {
        const token = url.pathname.split("/").pop()!,
          cart = carts.get(token);
        if (!cart) throw new Error("cart_missing");
        if (req.method === "GET") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Isolated Shopify checkout</title><body style="font:16px system-ui;background:#efefef;padding:6vh 8vw;color:#1d1915"><p>OFFY / ISOLATED INTEGRATION</p><h1>Mock Shopify checkout</h1><p>No real charge. No production Shopify requests.</p><p>OFFY Integration Sample × ${cart.quantity} · USD ${(cart.quantity * 100).toFixed(2)}</p><form method="POST"><label>Discount code <input name="code" value="ELI-FANS" style="padding:12px;font:inherit"></label><p>Any valid fan code applies 10%; coupon ownership does not change link attribution.</p><button style="padding:14px 28px;font:inherit" type="submit">Pay test order</button></form></body></html>`,
          );
          return;
        }
        const form = new URLSearchParams(await body(req)),
          code = (form.get("code") ?? "").toUpperCase();
        if (code && !codes.has(code)) return send(res, { error: "invalid_code" }, 400);
        const amount = cart.quantity * (code ? 90 : 100),
          id = `gid://shopify/Order/${1000 + orders.size}`;
        const o: MockOrder = {
          id,
          name: `#TEST-${1000 + orders.size}`,
          cartToken: token,
          customAttributes: cart.attributes,
          presentmentCurrencyCode: "USD",
          taxesIncluded: false,
          edited: false,
          cancelledAt: null,
          displayFinancialStatus: "PAID",
          disputes: [],
          totalPriceSet: bag(amount.toFixed(2)),
          totalOutstandingSet: bag("0.00"),
          transactions: [
            {
              id: `tx-${id}`,
              kind: "SALE",
              status: "SUCCESS",
              processedAt: new Date().toISOString(),
              amountSet: bag(amount.toFixed(2)),
            },
          ],
          lineItems: {
            nodes: [
              {
                id: "line-1",
                isGiftCard: false,
                quantity: cart.quantity,
                originalTotalSet: bag((cart.quantity * 100).toFixed(2)),
                discountAllocations: code
                  ? [{ allocatedAmountSet: bag((cart.quantity * 10).toFixed(2)) }]
                  : [],
                taxLines: [],
              },
            ],
            pageInfo,
          },
          refunds: [],
        };
        orders.set(id, o);
        await notify(o);
        res.writeHead(303, { Location: `${site}/checkout/return?provider=shopify` });
        res.end();
        return;
      }
      const { query: q = "", variables: v = {} } = JSON.parse(await body(req));
      if (checkoutMode === "catalog_error" && !q.includes("Offy"))
        return send(res, { errors: [{ message: "Isolated catalog failure" }] }, 503);
      let data: unknown;
      if (q.includes("OffyScopes"))
        data = {
          currentAppInstallation: {
            accessScopes: [
              { handle: "read_orders" },
              { handle: "read_discounts" },
              ...(automaticAdmin ? [] : [{ handle: "write_discounts" }]),
            ],
          },
        };
      else if (q.includes("OffyCampaigns"))
        data = {
          codeDiscountNodes: { nodes: [{ id: campaignId, codeDiscount: discount }], pageInfo },
        };
      else if (q.includes("OffyCampaign("))
        data = {
          codeDiscountNode: v.id === campaignId ? { id: campaignId, codeDiscount: discount } : null,
        };
      else if (q.includes("OffyCode("))
        data = {
          codeDiscountNodeByCode: codes.has(v.code)
            ? { id: campaignId, codeDiscount: discount }
            : null,
        };
      else if (q.includes("OffyAddCode")) {
        const id = `gid://shopify/DiscountRedeemCodeBulkCreation/${jobs.size + 1}`;
        jobs.set(id, { code: v.codes[0].code, polls: 0 });
        data = { discountRedeemCodeBulkAdd: { bulkCreation: { id }, userErrors: [] } };
      } else if (q.includes("OffyCodeJob")) {
        const j = jobs.get(v.id)!;
        j.polls++;
        if (j.polls >= 2) codes.add(j.code);
        data = {
          discountRedeemCodeBulkCreation: {
            done: j.polls >= 2,
            failedCount: 0,
            codes: { nodes: j.polls >= 2 ? [{ code: j.code, errors: [] }] : [] },
          },
        };
      } else if (q.includes("OffyOrders"))
        data = { orders: { nodes: [...orders.keys()].map((id) => ({ id })), pageInfo } };
      else if (q.includes("OffyOrder(")) data = { order: orders.get(v.id) ?? null };
      else if (q.includes("CollabsOrderName"))
        data = {
          orders: {
            nodes: [...orders.values()]
              .filter((o) => v.query.includes(o.name))
              .map((o) => ({
                ...o,
                currentTotalPriceSet: o.totalPriceSet,
                totalRefundedSet: bag(o.refunds.length ? "30.00" : "0.00"),
              })),
          },
        };
      else if (q.includes("CollabsOrder(")) {
        const o = orders.get(v.id);
        data = {
          order: o
            ? {
                ...o,
                currentTotalPriceSet: o.totalPriceSet,
                totalRefundedSet: bag(o.refunds.length ? "30.00" : "0.00"),
              }
            : null,
        };
      } else if (q.includes("CartCreate")) {
        if (checkoutMode === "http_error")
          return send(res, { errors: [{ message: "Isolated rate limit" }] }, 429);
        if (checkoutMode === "graphql_error")
          return send(res, { errors: [{ message: "Isolated GraphQL failure" }] });
        const token = randomUUID();
        carts.set(token, {
          attributes: v.attributes ?? [],
          quantity: v.lines.reduce((n: number, l: { quantity: number }) => n + l.quantity, 0),
        });
        data = {
          cartCreate: {
            cart: {
              id: `gid://shopify/Cart/${token}?key=test-secret`,
              checkoutUrl: `${mock}/checkout/${token}`,
              buyerIdentity: {
                countryCode:
                  q.match(/buyerIdentity:\s*\{\s*countryCode:\s*([A-Z]{2})/)?.[1] ?? "US",
              },
              totalQuantity:
                checkoutMode === "warning"
                  ? 0
                  : v.lines.reduce((n: number, l: { quantity: number }) => n + l.quantity, 0),
              lines: {
                nodes:
                  checkoutMode === "warning"
                    ? []
                    : v.lines.map((l: { merchandiseId: string; quantity: number }, i: number) => ({
                        id: `gid://shopify/CartLine/${i}`,
                        quantity: l.quantity,
                        merchandise: {
                          id: l.merchandiseId,
                          title: "Default Title",
                          sku: "TEST-ONLY",
                          product: { handle: product.handle, title: product.title },
                        },
                        cost: {
                          amountPerQuantity: { amount: "100.00", currencyCode: "USD" },
                          totalAmount: {
                            amount: (l.quantity * 100).toFixed(2),
                            currencyCode: "USD",
                          },
                        },
                      })),
                pageInfo,
              },
              cost: {
                subtotalAmount: { amount: "100.00", currencyCode: "USD" },
                totalAmount: { amount: "100.00", currencyCode: "USD" },
              },
            },
            userErrors: [],
            warnings:
              checkoutMode === "warning"
                ? [
                    {
                      code: "PRODUCT_UNAVAILABLE_IN_BUYER_LOCATION",
                      message: "Isolated unavailable-location warning",
                      target: "cart",
                    },
                  ]
                : [],
          },
        };
        res.setHeader("x-request-id", `integration-cart-${token}`);
      } else if (q.includes("ProductEnrich"))
        data = { product: v.handle === product.handle ? product : null };
      else if (q.includes("CollectionProducts"))
        data = {
          collectionByHandle: {
            products: { nodes: v.handle === "frontpage" ? [product] : [], pageInfo },
          },
        };
      else if (q.includes("query Collections"))
        data = {
          collections: {
            nodes: [
              {
                handle: "frontpage",
                title: "Integration Collection",
                description: "Local mock only",
              },
            ],
            pageInfo,
          },
        };
      else if (q.includes("ProductsOutsideCollections") || q.includes("ProductList"))
        data = { products: { nodes: [product], pageInfo } };
      else return send(res, { errors: [{ message: "Unsupported integration query" }] }, 400);
      send(res, { data });
    } catch (e) {
      send(res, { error: (e as Error).message }, 500);
    }
  });
  function proxy(isAdmin: boolean) {
    return createServer((req, res) => {
      if (req.headers.host !== `127.0.0.1:${isAdmin ? adminPort : publicPort}`) {
        res.writeHead(404).end();
        return;
      }
      const path = new URL(req.url ?? "/", site).pathname;
      let normalized: string;
      try {
        normalized = decodeURIComponent(path).replace(/\/+/g, "/");
      } catch {
        res.writeHead(400).end();
        return;
      }
      if (
        isAdmin
          ? !/^\/(admin(?:\/|$)|api\/admin\/kol(?:\/|$)|_next\/)/.test(normalized)
          : /^\/(?:[a-z]{2}\/)?(?:admin|api\/admin)(?:\/|$)/i.test(normalized) ||
            normalized === "/api/kol/worker"
      ) {
        res.writeHead(404).end();
        return;
      }
      const headers = {
        ...req.headers,
        "x-offy-admin-ingress": isAdmin ? ingress : "",
        "x-middleware-subrequest": "",
        "x-real-ip": "127.0.0.1",
        "x-forwarded-proto": "http",
        "x-country-code": "US",
      };
      const forwarded = httpRequest(
        { hostname: "localhost", port: appPort, path: req.url, method: req.method, headers },
        (up) => {
          res.writeHead(up.statusCode ?? 502, up.headers);
          up.pipe(res);
        },
      );
      forwarded.on("error", () => {
        res.writeHead(502).end();
      });
      req.pipe(forwarded);
    });
  }
  const publicServer = proxy(false),
    adminServer = proxy(true);
  for (const [server, port] of [
    [mockServer, mockPort],
    [publicServer, publicPort],
    [adminServer, adminPort],
  ] as const)
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => resolve());
    });
  const child = spawn(
    "pnpm",
    ["exec", "next", "dev", "--turbopack", "--hostname", "localhost", "--port", String(appPort)],
    {
      env: {
        ...process.env,
        NODE_ENV: "development",
        DATABASE_URL: dbPath,
        DATABASE_PROVIDER: "sqlite",
        SITE_URL: site,
        SHOPIFY_STORE_DOMAIN: "offy-integration.myshopify.com",
        SHOPIFY_STOREFRONT_TOKEN: "integration-dummy",
        SHOPIFY_ADMIN_TOKEN: automaticAdmin ? "" : "integration-dummy",
        SHOPIFY_ADMIN_CLIENT_ID: automaticAdmin ? "integration-client" : "",
        SHOPIFY_ADMIN_CLIENT_SECRET: automaticAdmin ? "integration-secret" : "",
        SHOPIFY_WEBHOOK_SECRET: webhook,
        SHOPIFY_TEST_ORIGIN: mock,
        SHOPIFY_API_VERSION: "2026-07",
        SHOPIFY_MARKET_COUNTRY: "US",
        STRIPE_SECRET_KEY: "",
        STRIPE_WEBHOOK_SECRET: "",
        PAYPAL_CLIENT_ID: "",
        PAYPAL_CLIENT_SECRET: "",
        KOL_ACCOUNTING_MODE: collabs ? "collabs" : "offy",
        SHOPIFY_ANALYTICS_SHOP_ID: "",
        SHOPIFY_STOREFRONT_ID: "",
        KOL_ENABLED: "true",
        KOL_SETTLEMENTS_ENABLED: "true",
        KOL_INGRESS_SECRET: ingress,
        KOL_SIGNING_SECRET: signing,
        KOL_WORKER_SECRET: worker,
        ADMIN_ORIGIN: admin,
        OFFY_INTEGRATION_TEST: "true",
        NEXT_PUBLIC_OFFY_INTEGRATION_TEST: "true",
      },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const log = createWriteStream(join(directory, "next.log"));
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  const lifecycle: { timer?: ReturnType<typeof setInterval> } = {};
  function stop() {
    if (lifecycle.timer) clearInterval(lifecycle.timer);
    if (child.pid) process.kill(-child.pid, "SIGTERM");
    for (const s of [mockServer, publicServer, adminServer]) s.close();
    sqlite.close();
  }
  process.on("SIGINT", () => {
    stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stop();
    process.exit(0);
  });
  child.on("exit", (code) => {
    console.log(`Integration app exited ${code}`);
  });
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${site}/api/health`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) {
    stop();
    throw new Error(`Integration app unavailable. Inspect ${join(directory, "next.log")}`);
  }
  lifecycle.timer = setInterval(() => {
    void fetch(`http://localhost:${appPort}/api/kol/worker`, {
      method: "POST",
      headers: { authorization: `Bearer ${worker}` },
    }).catch(() => {});
  }, 5000);
  console.log(
    JSON.stringify(
      {
        public: site,
        admin: `${admin}/admin`,
        mock,
        database: dbPath,
        log: join(directory, "next.log"),
        testLogin: { email: "tester@example.com", password },
        notice: "Isolated test data only; no production Shopify or database access",
      },
      null,
      2,
    ),
  );
}
void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
