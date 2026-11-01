// @vitest-environment node
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { describe, it, expect } from "vitest";
function fixture(kol = true) {
  const config = {
    name: "offy",
    services: {
      app: {
        environment: {
          NODE_ENV: "production",
          DATABASE_PROVIDER: "sqlite",
          DATABASE_URL: "/data/offy.db",
          SITE_URL: "https://shop.offy.test",
          SHOPIFY_STORE_DOMAIN: "shop.myshopify.com",
          SHOPIFY_STOREFRONT_TOKEN: "test-storefront",
          SHOPIFY_ADMIN_TOKEN: "test-admin",
          SHOPIFY_WEBHOOK_SECRET: "test-webhook",
          KOL_ENABLED: String(kol),
          KOL_SETTLEMENTS_ENABLED: "false",
          KOL_INGRESS_SECRET: "a".repeat(64),
          KOL_SIGNING_SECRET: "b".repeat(64),
          KOL_WORKER_SECRET: "c".repeat(64),
          ADMIN_ORIGIN: "https://127.0.0.1:8443",
        },
        ports: [{ host_ip: "127.0.0.1", published: "3000", target: 3000 }],
        volumes: [{ type: "volume", source: "offy-data", target: "/data" }],
      },
      "kol-worker": { environment: { KOL_WORKER_SECRET: "c".repeat(64) }, image: "offy-app:local" },
    },
    "x-offy-deploy": {},
  };
  const admin = {
    ...structuredClone(config.services.app),
    image: "offy-admin:local",
    ports: [{ host_ip: "127.0.0.1", target: 3000, published: "3001" }],
  };
  return {
    ...config,
    services: {
      ...config.services,
      admin,
      "kol-worker": {
        ...config.services["kol-worker"],
        image: "offy-admin:local",
        environment: {
          ...config.services["kol-worker"].environment,
          KOL_WORKER_URL: "http://admin:3000/api/kol/worker",
        },
      },
    },
  };
}
function validate(config: unknown, args: string[] = []) {
  return spawnSync("python3", ["deploy/compose-config.py", "validate", ...args], {
    input: JSON.stringify(config),
    encoding: "utf8",
  });
}
describe("deployment preflight", () => {
  it("permits management and scheduled reconciliation without Shopify webhook configuration", () => {
    const c = fixture();
    c.services.app.environment.SHOPIFY_WEBHOOK_SECRET = "";
    c.services.admin.environment.SHOPIFY_WEBHOOK_SECRET = "";
    expect(validate(c, ["--kol"]).status).toBe(0);
  });
  it("rejects independent admin database, signing key, public port or image drift", () => {
    for (const key of ["DATABASE_URL", "KOL_SIGNING_SECRET", "SHOPIFY_STORE_DOMAIN"] as const) {
      const c = fixture();
      c.services.admin.environment[key] = "different";
      expect(validate(c).status, key).not.toBe(0);
    }
    const c = fixture();
    c.services.admin.volumes[0].source = "different-volume";
    expect(validate(c).status).not.toBe(0);
    const d = fixture();
    d.services.admin.ports[0].host_ip = "0.0.0.0";
    expect(validate(d).status).not.toBe(0);
    const e = fixture();
    e.services.admin.image = "offy-app:local";
    expect(validate(e).status).not.toBe(0);
  });
  it("accepts isolated KOL runtime config and rejects missing secrets without echoing values", () => {
    expect(validate(fixture(), ["--kol"]).status).toBe(0);
    const c = fixture();
    c.services.app.environment.KOL_INGRESS_SECRET = "top-secret";
    const result = validate(c, ["--kol"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("KOL_INGRESS_SECRET");
    expect(result.stderr).not.toContain("top-secret");
  });
  it("rejects explicit KOL deployment when disabled and nonpersistent DB paths", () => {
    expect(validate(fixture(false), ["--kol"]).status).not.toBe(0);
    const c = fixture();
    c.services.app.environment.DATABASE_URL = "./data/offy.db";
    expect(validate(c).status).not.toBe(0);
  });
  it("rejects public source ports, same-port admin and mismatched worker credentials", () => {
    const c = fixture();
    c.services.app.ports[0].host_ip = "0.0.0.0";
    expect(validate(c).status).not.toBe(0);
    const d = fixture();
    d.services.app.environment.ADMIN_ORIGIN = "https://shop.offy.test";
    expect(validate(d).status).not.toBe(0);
    const e = fixture();
    e.services["kol-worker"].environment.KOL_WORKER_SECRET = "wrong";
    expect(validate(e).status).not.toBe(0);
  });
});
describe("running management compatibility", () => {
  it.each([
    "matching",
    "legacy-disabled",
    "database",
    "legacy-database",
    "volume",
    "legacy-shop",
    "signing",
    "disable-active",
  ])("checks the actual peer before a storefront-only release: %s", (scenario) => {
    const dir = mkdtempSync(join(tmpdir(), "offy-peer-check-"));
    try {
      const config = {
        ...fixture(scenario !== "disable-active"),
        volumes: { "offy-data": { name: "original-data" } },
      };
      const environment: Record<string, string> = { ...config.services.admin.environment };
      let volume = "original-data";
      if (scenario.startsWith("legacy")) environment.KOL_ENABLED = "false";
      if (scenario.includes("database")) environment.DATABASE_URL = "/data/peer-private-value.db";
      if (scenario === "volume") volume = "other-data";
      if (scenario === "legacy-shop") environment.SHOPIFY_STORE_DOMAIN = "other.myshopify.com";
      if (scenario === "signing") environment.KOL_SIGNING_SECRET = "peer-private-value";
      if (scenario === "disable-active") environment.KOL_ENABLED = "true";
      const file = join(dir, "config.json");
      writeFileSync(file, JSON.stringify(config));
      const r = spawnSync("python3", ["deploy/compose-config.py", "running-admin", file], {
        input: JSON.stringify([
          {
            State: { Running: true },
            Config: { Env: Object.entries(environment).map(([k, v]) => `${k}=${v}`) },
            Mounts: [{ Type: "volume", Name: volume, Destination: "/data", RW: true }],
          },
        ]),
        encoding: "utf8",
      });
      expect(r.status, r.stderr).toBe(["matching", "legacy-disabled"].includes(scenario) ? 0 : 1);
      expect(r.stdout + r.stderr).not.toContain("peer-private-value");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe("source deployment archive", () => {
  it("excludes private env, database sidecars and caches while retaining Docker and admin tools", () => {
    const dir = mkdtempSync(join(tmpdir(), "offy-package-test-"));
    try {
      for (const folder of [
        "scripts",
        "deploy",
        "public",
        ".next-kol-integration",
        "resources",
        ".deploy-logs",
      ])
        mkdirSync(join(dir, folder), { recursive: true });
      for (const file of [
        "package.json",
        "Dockerfile",
        "docker-compose.prod.yml",
        ".env",
        ".env.production",
        ".env.example",
        ".env.production.example",
        ".offy-runtime-secrets.json",
        ".offy-runtime-temporary.local",
        "root.db",
        "root.db-wal",
        "scripts/kol-admin-bootstrap.mjs",
        "public/asset.txt",
        ".next-kol-integration/private.txt",
        "resources/large.psd",
        ".deploy-logs/private-output",
      ])
        writeFileSync(
          join(dir, file),
          file === ".env.production" ? "PRIVATE_TEST_SECRET=value" : "test",
        );
      const result = spawnSync(
        "bash",
        [
          resolve("scripts/package-source.sh"),
          "--source",
          dir,
          "--output",
          join(dir, "bundle.tar.gz"),
        ],
        { encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);
      const list = spawnSync("tar", ["-tzf", join(dir, "bundle.tar.gz")], {
        encoding: "utf8",
      }).stdout;
      expect(list).toContain("./Dockerfile");
      expect(list).toContain("./scripts/kol-admin-bootstrap.mjs");
      expect(list).toContain("./.env.production.example");
      expect(list).not.toMatch(/\.\/\.env(?:\n|\.production\n)/);
      expect(list).not.toContain("root.db");
      expect(list).not.toContain(".next-kol");
      expect(list).not.toContain("large.psd");
      expect(list).not.toContain(".offy-runtime-");
      expect(list).not.toContain(".deploy-logs");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe("private Nginx rendering", () => {
  it("renders both entrypoints with an exact ingress marker into a mode-600 file", () => {
    const dir = mkdtempSync(join(tmpdir(), "offy-render-test-"));
    try {
      const cert = join(dir, "cert.pem");
      writeFileSync(cert, "test certificate path only");
      const c = fixture() as ReturnType<typeof fixture> & {
        "x-offy-deploy": Record<string, string>;
      };
      c["x-offy-deploy"] = {
        nginx_config: join(dir, "offy.conf"),
        site_tls_certificate: cert,
        site_tls_key: cert,
        admin_tls_certificate: cert,
        admin_tls_key: cert,
      };
      const output = join(dir, "rendered.conf");
      const result = spawnSync(
        "python3",
        ["deploy/compose-config.py", "render-nginx", "--output", output],
        { input: JSON.stringify(c), encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);
      const text = readFileSync(output, "utf8");
      expect(text).toContain("listen 8443 ssl");
      expect(text.slice(text.indexOf("listen 8443 ssl"))).toContain(
        "proxy_pass http://127.0.0.1:3001;",
      );
      expect(text).toContain('X-Offy-Admin-Ingress ""');
      expect(text).toContain(c.services.app.environment.KOL_INGRESS_SECRET);
      expect(result.stdout + result.stderr).not.toContain(
        c.services.app.environment.KOL_INGRESS_SECRET,
      );
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
