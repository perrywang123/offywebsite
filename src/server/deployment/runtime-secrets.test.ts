// @vitest-environment node
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  statSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
const keys = ["KOL_INGRESS_SECRET", "KOL_SIGNING_SECRET", "KOL_WORKER_SECRET"];
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "offy-managed-auth-"));
  mkdirSync(join(dir, "bin"));
  writeFileSync(join(dir, ".env"), "# existing private config\n");
  const config = {
    services: { app: { environment: { SHOPIFY_STORE_DOMAIN: "shop.myshopify.com" } } },
  };
  writeFileSync(join(dir, "config.json"), JSON.stringify(config));
  writeFileSync(join(dir, "containers.json"), "[]");
  writeFileSync(
    join(dir, "bin", "docker"),
    `#!/usr/bin/env python3
import os,sys
if 'ps' in sys.argv:print('fixture-container')
elif 'inspect' in sys.argv:print(open(os.environ['CONTAINERS']).read())
`,
    { mode: 0o755 },
  );
  return {
    dir,
    config,
    run(check = false) {
      writeFileSync(join(dir, "config.json"), JSON.stringify(config));
      return spawnSync(
        "python3",
        [
          resolve("deploy/runtime-secrets.py"),
          join(dir, "config.json"),
          "--env-file",
          join(dir, ".env"),
          "--output",
          join(dir, "prepared.json"),
          "--root",
          dir,
          ...(check ? ["--check"] : []),
        ],
        {
          env: {
            ...process.env,
            PATH: `${join(dir, "bin")}:${process.env.PATH}`,
            CONTAINERS: join(dir, "containers.json"),
            OFFY_DEPLOY_LOCK_HELD: "0",
          },
          encoding: "utf8",
        },
      );
    },
    values: () => JSON.parse(readFileSync(join(dir, "prepared.json"), "utf8")),
  };
}
describe("automatically managed internal authentication", () => {
  it("creates distinct private values once and preserves runtime configuration", () => {
    const f = fixture();
    try {
      const r = f.run();
      expect(r.status, r.stderr).toBe(0);
      const values = f.values();
      expect(new Set(keys.map((k) => values[k])).size).toBe(3);
      for (const key of keys) {
        expect(values[key]).toMatch(/^[a-f0-9]{64}$/);
        expect(r.stdout + r.stderr).not.toContain(values[key]);
      }
      expect(statSync(join(f.dir, ".offy-runtime-secrets.json")).mode & 0o777).toBe(0o600);
      expect(statSync(join(f.dir, "prepared.json")).mode & 0o777).toBe(0o600);
      expect(readFileSync(join(f.dir, ".env"), "utf8")).toBe("# existing private config\n");
      expect(f.run().status).toBe(0);
      expect(f.values()).toEqual(values);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("check-only creates no persistent keys and preserves an existing private file", () => {
    const f = fixture();
    try {
      expect(f.run(true).status).toBe(0);
      expect(existsSync(join(f.dir, ".offy-runtime-secrets.json"))).toBe(false);
      expect(f.run().status).toBe(0);
      const before = readFileSync(join(f.dir, ".offy-runtime-secrets.json"), "utf8");
      expect(f.run(true).status).toBe(0);
      expect(readFileSync(join(f.dir, ".offy-runtime-secrets.json"), "utf8")).toBe(before);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("recovers configured running values instead of rotating existing referral signatures", () => {
    const f = fixture();
    try {
      const values = Object.fromEntries(keys.map((key, i) => [key, String(i + 1).repeat(64)]));
      writeFileSync(
        join(f.dir, "containers.json"),
        JSON.stringify([
          {
            State: { Running: true },
            Config: {
              Env: [
                "SHOPIFY_STORE_DOMAIN=shop.myshopify.com",
                ...keys.map((key) => `${key}=${values[key]}`),
              ],
            },
          },
        ]),
      );
      const r = f.run();
      expect(r.status, r.stderr).toBe(0);
      expect(f.values()).toEqual(values);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("refuses corrupt or conflicting persisted credentials without printing or replacing them", () => {
    const f = fixture();
    try {
      expect(f.run().status).toBe(0);
      const before = readFileSync(join(f.dir, ".offy-runtime-secrets.json"), "utf8");
      Object.assign(f.config.services.app.environment, {
        KOL_SIGNING_SECRET: "different-secret-".repeat(4),
      });
      const conflict = f.run();
      expect(conflict.status).not.toBe(0);
      expect(conflict.stderr).toContain("KOL_SIGNING_SECRET");
      expect(conflict.stderr).not.toContain("different-secret-");
      expect(readFileSync(join(f.dir, ".offy-runtime-secrets.json"), "utf8")).toBe(before);
      writeFileSync(join(f.dir, ".offy-runtime-secrets.json"), "invalid");
      expect(f.run().status).not.toBe(0);
      expect(readFileSync(join(f.dir, ".offy-runtime-secrets.json"), "utf8")).toBe("invalid");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
});
