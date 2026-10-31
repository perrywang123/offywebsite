// @vitest-environment node
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  rmSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { describe, it, expect } from "vitest";
function fixture(mode: string) {
  const dir = mkdtempSync(join(tmpdir(), "offy-nginx-install-"));
  mkdirSync(join(dir, "deploy"));
  mkdirSync(join(dir, "bin"));
  for (const f of ["install-nginx.sh", "check-ingress.sh", "compose-config.py"])
    copyFileSync(resolve("deploy", f), join(dir, "deploy", f));
  const target = join(dir, "offy.conf"),
    cert = join(dir, "test.pem"),
    config = join(dir, "config.json"),
    calls = join(dir, "calls");
  writeFileSync(target, "ORIGINAL\n");
  writeFileSync(cert, "fake path fixture");
  writeFileSync(
    config,
    JSON.stringify({
      services: {
        app: {
          environment: {
            NODE_ENV: "production",
            DATABASE_PROVIDER: "sqlite",
            DATABASE_URL: "/data/offy.db",
            SITE_URL: "https://shop.offy.test",
            SHOPIFY_STORE_DOMAIN: "shop.myshopify.com",
            SHOPIFY_STOREFRONT_TOKEN: "test",
            SHOPIFY_ADMIN_TOKEN: "test-admin",
            SHOPIFY_WEBHOOK_SECRET: "test-hook",
            KOL_ENABLED: "true",
            KOL_INGRESS_SECRET: "a".repeat(64),
            KOL_SIGNING_SECRET: "b".repeat(64),
            KOL_WORKER_SECRET: "c".repeat(64),
            ADMIN_ORIGIN: "https://admin.offy.test:8443",
          },
          ports: [{ host_ip: "127.0.0.1", target: 3000, published: "3000" }],
          volumes: [{ type: "volume", target: "/data" }],
        },
        "kol-worker": { environment: { KOL_WORKER_SECRET: "c".repeat(64) } },
      },
      "x-offy-deploy": {
        nginx_config: target,
        site_tls_certificate: cert,
        site_tls_key: cert,
        admin_tls_certificate: cert,
        admin_tls_key: cert,
      },
    }),
  );
  const resolved = JSON.parse(readFileSync(config, "utf8"));
  resolved.services.app.image = "offy-app:local";
  resolved.services.app.volumes[0].source = "offy-data";
  resolved.services.admin = {
    ...structuredClone(resolved.services.app),
    image: "offy-admin:local",
    ports: [{ host_ip: "127.0.0.1", target: 3000, published: "3001" }],
  };
  resolved.services["kol-worker"].image = "offy-admin:local";
  resolved.services["kol-worker"].environment.KOL_WORKER_URL = "http://admin:3000/api/kol/worker";
  writeFileSync(config, JSON.stringify(resolved));
  const bin = (name: string, text: string) =>
    writeFileSync(join(dir, "bin", name), text, { mode: 0o755 });
  bin("id", "#!/bin/sh\nprintf '0\\n'\n");
  bin(
    "nginx",
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$OFFY_TEST_CALLS"\nif [ "$1" = '-t' ] && [ "$OFFY_TEST_MODE" = 'syntax' ]; then exit 1; fi\nexit 0\n`,
  );
  bin(
    "curl",
    `#!/usr/bin/env python3\nimport sys,os\nif os.environ['OFFY_TEST_MODE']=='https':sys.exit(52)\nu=sys.argv[-1];print('404' if 'shop.offy.test' in u else ('401' if '/api/admin/' in u else '200'),end='')\n`,
  );
  return {
    dir,
    target,
    calls,
    run: () =>
      spawnSync("bash", [join(dir, "deploy/install-nginx.sh"), config], {
        env: {
          ...process.env,
          PATH: join(dir, "bin") + ":" + process.env.PATH,
          OFFY_TEST_CALLS: calls,
          OFFY_TEST_MODE: mode,
        },
        encoding: "utf8",
      }),
  };
}
describe("explicit Nginx installation", () => {
  it("restores a rejected candidate before any reload", () => {
    const f = fixture("syntax");
    try {
      const r = f.run();
      expect(r.status).not.toBe(0);
      expect(readFileSync(f.target, "utf8")).toBe("ORIGINAL\n");
      expect(readFileSync(f.calls, "utf8")).not.toContain("reload");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("restores the prior file and reloads it if HTTPS verification fails", () => {
    const f = fixture("https");
    try {
      const r = f.run();
      expect(r.status).not.toBe(0);
      expect(readFileSync(f.target, "utf8")).toBe("ORIGINAL\n");
      expect(readFileSync(f.calls, "utf8").match(/reload/g)).toHaveLength(2);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("retains a private backup and never prints the ingress marker", () => {
    const f = fixture("success");
    try {
      const r = f.run();
      expect(r.status, r.stderr).toBe(0);
      expect(readFileSync(f.target, "utf8")).toContain("listen 8443 ssl");
      expect(statSync(f.target).mode & 0o777).toBe(0o600);
      expect(readdirSync(f.dir).some((n) => n.startsWith("offy.conf.offy-backup-"))).toBe(true);
      expect(r.stdout + r.stderr).not.toContain("a".repeat(64));
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
});
