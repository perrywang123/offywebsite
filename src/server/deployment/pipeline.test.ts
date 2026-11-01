// @vitest-environment node
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  renameSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { describe, it, expect } from "vitest";
function setup(kol = true) {
  const dir = mkdtempSync(join(tmpdir(), "offy-release-test-"));
  mkdirSync(join(dir, "deploy"));
  mkdirSync(join(dir, "bin"));
  writeFileSync(join(dir, ".env"), "# fake runtime only\n");
  writeFileSync(join(dir, "docker-compose.prod.yml"), "# docker mocked\n");
  for (const name of [
    "update.sh",
    "update-admin.sh",
    "compose-config.py",
    "runtime-secrets.py",
    "build-limits.py",
    "buildkitd.toml",
    "backup-db.mjs",
    "check-ingress.sh",
    "install-nginx.sh",
    "upload-env.sh",
  ])
    try {
      copyFileSync(resolve("deploy", name), join(dir, "deploy", name));
    } catch {}
  const config = {
    services: {
      app: {
        image: "offy-app:local",
        environment: {
          NODE_ENV: "production",
          DATABASE_PROVIDER: "sqlite",
          DATABASE_URL: "/data/offy.db",
          SITE_URL: "https://shop.offy.test",
          SHOPIFY_STORE_DOMAIN: "shop.myshopify.com",
          SHOPIFY_STOREFRONT_TOKEN: "test-token",
          SHOPIFY_ADMIN_TOKEN: "admin-token",
          SHOPIFY_WEBHOOK_SECRET: "hook-token",
          KOL_ENABLED: String(kol),
          KOL_SETTLEMENTS_ENABLED: "false",
          KOL_INGRESS_SECRET: "a".repeat(64),
          KOL_SIGNING_SECRET: "b".repeat(64),
          KOL_WORKER_SECRET: "c".repeat(64),
          ADMIN_ORIGIN: "https://admin.offy.test:8443",
        },
        ports: [{ host_ip: "127.0.0.1", published: "3000", target: 3000 }],
        volumes: [{ type: "volume", source: "offy-data", target: "/data" }],
      },
      "kol-worker": { image: "offy-app:local", environment: { KOL_WORKER_SECRET: "c".repeat(64) } },
    },
    volumes: { "offy-data": { name: "offy_offy-data" } },
    "x-offy-deploy": {},
  };
  Object.assign(config.services, {
    admin: {
      ...structuredClone(config.services.app),
      image: "offy-admin:local",
      ports: [{ host_ip: "127.0.0.1", target: 3000, published: "3001" }],
    },
  });
  config.services["kol-worker"].image = "offy-admin:local";
  Object.assign(config.services["kol-worker"].environment, {
    KOL_WORKER_URL: "http://admin:3000/api/kol/worker",
  });
  writeFileSync(join(dir, "config.json"), JSON.stringify(config));
  function bin(name: string, code: string) {
    writeFileSync(join(dir, "bin", name), code, { mode: 0o755 });
  }
  bin(
    "docker",
    `#!/usr/bin/env python3
import sys,os,json
from pathlib import Path
a=sys.argv[1:]
with open(os.environ['CALLS'],'a') as f:f.write(json.dumps(a)+'\\n')
c=json.load(open(os.environ['CONFIG']))
if '--env-file' in a:
 path=a[a.index('--env-file')+1]
 for line in Path(path).read_text().splitlines():
  if line.startswith('KOL_ENABLED='):
   for name in ('app','admin'):c['services'][name]['environment']['KOL_ENABLED']=line.split('=',1)[1]
 if os.environ.get('KOL_ENABLED'):
  for name in ('app','admin'):c['services'][name]['environment']['KOL_ENABLED']=os.environ['KOL_ENABLED']
 for key in ('KOL_INGRESS_SECRET','KOL_SIGNING_SECRET','KOL_WORKER_SECRET'):
  if os.environ.get(key):
   for name in ('app','admin'):c['services'][name]['environment'][key]=os.environ[key]
   if key=='KOL_WORKER_SECRET':c['services']['kol-worker']['environment'][key]=os.environ[key]
 with open(os.environ['KOL_OBSERVATIONS'],'a') as f:f.write(json.dumps({'args':a,'kol':c['services']['app']['environment']['KOL_ENABLED'],'adminKol':c['services']['admin']['environment']['KOL_ENABLED'],'settlements':c['services']['app']['environment']['KOL_SETTLEMENTS_ENABLED'],'file':path})+'\\n')
if 'config' in a and '--format' in a:print(json.dumps(c))
if a[:2]==['buildx','version']:print('github.com/docker/buildx v0.38.0')
if a[:2]==['compose','build'] and '--help' in a:print('--builder string')
if a and a[0]=='info' and '--format' in a:print(json.dumps({'CpuCfsQuota':True,'CpuCfsPeriod':True}))
if a[:2]==['context','show']:print('isolated-test')
state=Path(os.environ['CONFIG']).with_name('build-builder.json')
if a[:2]==['buildx','create']:
 name=a[a.index('--name')+1];opts=dict(a[i+1].split('=',1) for i,v in enumerate(a) if v=='--driver-opt');state.write_text(json.dumps({'name':name,'opts':opts,'config':a[a.index('--buildkitd-config')+1]}));print(name)
if a[:2]==['buildx','inspect']:
 if not state.exists():print('no builder "fixture" found',file=sys.stderr);sys.exit(1)
 s=json.loads(state.read_text());print('Name: '+s['name']+'\\nDriver: docker-container\\nNodes:\\nName: '+s['name']+'0\\nDriver Options: '+' '.join(k+'="'+v+'"' for k,v in s['opts'].items())+'\\nFile#buildkitd.toml:\\n'+''.join('> '+line+'\\n' for line in Path(s['config']).read_text().splitlines()))
if 'run' in a:
 sys.stdin.read()
 if os.environ.get('FAIL_BACKUP')=='1':sys.exit(2)
if 'exec' in a and 'admin' in a and os.environ.get('FAIL_WORKER')=='1':sys.exit(3)
if a and a[0]=='exec' and any(v.startswith('buildx_buildkit_') for v in a):print(Path(json.loads(state.read_text())['config']).read_text())
if 'ps' in a and '-q' in a:print('test-container')
if a and a[0]=='inspect':
 if '--format' in a:print('true')
 elif any(v.startswith('buildx_buildkit_') for v in a):print(json.dumps([{'State':{'Running':True},'HostConfig':{'CpuPeriod':100000,'CpuQuota':200000 if os.environ.get('FAIL_BUILD_QUOTA') else 100000}}]))
 else:
  e=c['services']['app']['environment'].copy()
  if os.environ.get('FAIL_STOREFRONT')=='1':e['KOL_SIGNING_SECRET']='drift'
  print(json.dumps([{'State':{'Running':True,'Health':{'Status':'healthy'}},'Config':{'Env':[k+'='+v for k,v in e.items()]},'Mounts':[{'Type':'volume','Name':'offy_offy-data','Destination':'/data','RW':True}]}]))
`,
  );
  bin(
    "curl",
    `#!/usr/bin/env python3\nimport sys\na=sys.argv[1:]\nif '--write-out' in a:\n u=a[-1];print('404' if 'shop.offy.test' in u else ('401' if '/api/admin/' in u else '200'),end='')\n`,
  );
  bin("flock", "#!/bin/sh\nexit 0\n");
  bin("systemctl", "#!/bin/sh\nexit 1\n");
  const env = {
    ...process.env,
    PATH: join(dir, "bin") + ":" + process.env.PATH,
    CALLS: join(dir, "calls"),
    CONFIG: join(dir, "config.json"),
    KOL_OBSERVATIONS: join(dir, "kol-observations"),
    KOL_ENABLED: undefined,
    DEPLOY_WAIT_ATTEMPTS: "1",
    DEPLOY_WAIT_SECONDS: "0",
  };
  return {
    dir,
    env,
    calls: () => {
      try {
        return readFileSync(join(dir, "calls"), "utf8")
          .trim()
          .split("\n")
          .map((x) => JSON.parse(x) as string[]);
      } catch {
        return [];
      }
    },
    run: (args: string[] = [], extra: Record<string, string> = {}) =>
      spawnSync("bash", [join(dir, "deploy/update.sh"), "--skip-pull", ...args], {
        env: { ...env, ...extra },
        encoding: "utf8",
      }),
  };
}
const isImageBuild = (args: string[]) => args.includes("build") && !args.includes("--help");
describe("unified server deployment", () => {
  it("selects one capped builder for both service images and fails before builds if quota verification fails", () => {
    const f = setup();
    try {
      const r = f.run(["--kol"]);
      expect(r.status, r.stderr + r.stdout).toBe(0);
      const build = f.calls().find(isImageBuild)!;
      expect(build).toContain("--builder");
      expect(build).toContain("app");
      expect(build).toContain("admin");
      expect(f.calls().find((c) => c.includes("create"))).toContain("cpu-quota=100000");
      const count = f.calls().filter(isImageBuild).length;
      const failed = f.run(["--kol"], { FAIL_BUILD_QUOTA: "1" });
      expect(failed.status).not.toBe(0);
      expect(f.calls().filter(isImageBuild)).toHaveLength(count);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  }, 15_000);
  it.each(["KOL_ENABLED=false\n", "# switch absent\n"])(
    "explicit KOL enables every Compose phase without editing private config: %s",
    (runtime) => {
      const f = setup(false);
      try {
        const path = join(f.dir, ".env");
        writeFileSync(path, runtime);
        const r = f.run(["--kol"], { KOL_ENABLED: "false" });
        expect(r.status, r.stderr + r.stdout).toBe(0);
        const observations = readFileSync(f.env.KOL_OBSERVATIONS, "utf8")
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        expect(observations.length).toBeGreaterThan(5);
        expect(observations.every((o) => o.kol === "true" && o.adminKol === "true")).toBe(true);
        expect(observations.every((o) => o.settlements === "false")).toBe(true);
        expect(readFileSync(path, "utf8")).toBe(runtime);
      } finally {
        rmSync(f.dir, { recursive: true });
      }
    },
  );
  it("explicit check-only accepts a false switch but leaves files and services untouched", () => {
    const f = setup(false);
    try {
      const path = join(f.dir, ".env"),
        runtime = "KOL_ENABLED=false\n";
      writeFileSync(path, runtime);
      const r = f.run(["--kol", "--check"]);
      expect(r.status, r.stderr + r.stdout).toBe(0);
      expect(readFileSync(path, "utf8")).toBe(runtime);
      expect(f.calls().filter(isImageBuild)).toHaveLength(0);
      expect(f.calls().flat()).not.toContain("up");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("selects explicit env, then .env, then .env.production and never falls back from a missing explicit file", () => {
    const f = setup();
    try {
      const primary = join(f.dir, ".env"),
        production = join(f.dir, ".env.production");
      renameSync(primary, production);
      const fallback = f.run(["--check"]);
      expect(fallback.status, fallback.stderr).toBe(0);
      expect(fallback.stdout).toContain(production);
      expect(f.calls().find((c) => c.includes("config"))).toContain(production);
      writeFileSync(primary, "KOL_ENABLED=false\n");
      const preferred = f.run(["--check"]);
      expect(preferred.status, preferred.stderr).toBe(0);
      expect(preferred.stdout).toContain(primary);
      expect(preferred.stdout).toContain("Configuration valid: storefront");
      const explicit = f.run(["--check", "--env-file", ".env.production"]);
      expect(explicit.status, explicit.stderr).toBe(0);
      expect(explicit.stdout).toContain(production);
      expect(explicit.stdout).toContain("Configuration valid: storefront + KOL");
      const count = f.calls().length;
      const missing = f.run(["--check", "--env-file", "missing.env"]);
      expect(missing.status).not.toBe(0);
      expect(missing.stderr).toContain("missing.env");
      expect(f.calls()).toHaveLength(count);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("explicit mode still rejects missing KOL credentials before service changes with private-file guidance", () => {
    const f = setup(false);
    try {
      const c = JSON.parse(readFileSync(f.env.CONFIG, "utf8"));
      for (const name of ["app", "admin"])
        for (const key of ["SHOPIFY_ADMIN_TOKEN", "SHOPIFY_WEBHOOK_SECRET"])
          c.services[name].environment[key] = "";
      writeFileSync(f.env.CONFIG, JSON.stringify(c));
      const r = f.run(["--kol"]);
      expect(r.status).not.toBe(0);
      for (const key of ["SHOPIFY_ADMIN_TOKEN"]) expect(r.stderr).toContain(key);
      expect(r.stderr).toContain(join(f.dir, ".env"));
      expect(r.stdout + r.stderr).not.toContain("test-token");
      expect(f.calls().filter(isImageBuild)).toHaveLength(0);
      expect(f.calls().flat()).not.toContain("up");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("builds then backs up before starting app + worker, with no git or volume deletion", () => {
    const f = setup();
    try {
      const r = f.run(["--kol"]);
      expect(r.status, r.stderr + r.stdout).toBe(0);
      const a = f.calls();
      expect(a.findIndex(isImageBuild)).toBeLessThan(a.findIndex((c) => c.includes("run")));
      expect(a.findIndex((c) => c.includes("run"))).toBeLessThan(
        a.findIndex((c) => c.includes("up")),
      );
      expect(a.filter((c) => c.includes("up")).flat()).toContain("kol-worker");
      expect(a.find((c) => c.includes("up") && c.includes("admin"))).toContain("--profile");
      expect(a.flat()).not.toContain("down");
      expect(a.flat()).not.toContain("prune");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("check-only does not build, back up, start or execute in containers", () => {
    const f = setup();
    try {
      const r = f.run(["--check", "--kol"]);
      expect(r.status, r.stderr + r.stdout).toBe(0);
      expect(
        f
          .calls()
          .filter((c) => !c.includes("--help"))
          .flat()
          .filter((c) => ["build", "run", "up", "exec", "stop"].includes(c)),
      ).toEqual([]);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it.each(["FAIL_BACKUP", "FAIL_WORKER"])(
    "readiness failures cannot report success: %s",
    (flag) => {
      const f = setup();
      try {
        const r = f.run(["--kol"], { [flag]: "1" });
        expect(r.status).not.toBe(0);
        if (flag === "FAIL_BACKUP") expect(f.calls().some((c) => c.includes("up"))).toBe(false);
      } finally {
        rmSync(f.dir, { recursive: true });
      }
    },
  );
  it.each([true, false])("ordinary deploy follows the configured KOL switch: %s", (kol) => {
    const f = setup(kol);
    try {
      const r = f.run();
      expect(r.status, r.stderr + r.stdout).toBe(0);
      const up = f
        .calls()
        .filter((c) => c.includes("up"))
        .flat();
      expect(up.includes("kol-worker")).toBe(kol);
      if (!kol)
        expect(f.calls().some((c) => c.includes("stop") && c.includes("kol-worker"))).toBe(true);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
});

describe("private environment installation", () => {
  it("keeps the old file on invalid configuration and atomically installs a valid candidate", () => {
    const f = setup();
    try {
      const script = join(f.dir, "deploy/upload-env.sh"),
        candidate = "PRIVATE_TOKEN=candidate-only\n";
      const config = JSON.parse(readFileSync(f.env.CONFIG, "utf8"));
      config.services.app.environment.KOL_INGRESS_SECRET = "short";
      writeFileSync(f.env.CONFIG, JSON.stringify(config));
      const bad = spawnSync("bash", [script, "--kol"], {
        env: f.env,
        input: candidate,
        encoding: "utf8",
      });
      expect(bad.status).not.toBe(0);
      expect(readFileSync(join(f.dir, ".env"), "utf8")).toBe("# fake runtime only\n");
      config.services.app.environment.KOL_INGRESS_SECRET = "a".repeat(64);
      writeFileSync(f.env.CONFIG, JSON.stringify(config));
      const good = spawnSync("bash", [script, "--kol"], {
        env: f.env,
        input: candidate,
        encoding: "utf8",
      });
      expect(good.status, good.stderr).toBe(0);
      expect(readFileSync(join(f.dir, ".env"), "utf8")).toBe(candidate);
      expect(good.stdout + good.stderr).not.toContain("candidate-only");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
});

describe("independent server admin deployment", () => {
  it("explicit admin mode does not enable a disabled storefront or bypass its configuration check", () => {
    const f = setup(false);
    try {
      writeFileSync(join(f.dir, ".env"), "KOL_ENABLED=false\n");
      const r = spawnSync("bash", [join(f.dir, "deploy/update-admin.sh"), "--skip-pull"], {
        env: f.env,
        encoding: "utf8",
      });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain("running storefront configuration differs: KOL_ENABLED");
      expect(f.calls().filter(isImageBuild)).toHaveLength(0);
      expect(f.calls().flat()).not.toContain("up");
      expect(readFileSync(join(f.dir, ".env"), "utf8")).toBe("KOL_ENABLED=false\n");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("builds and replaces only admin + worker, backing up the shared DB first", () => {
    const f = setup();
    try {
      const r = spawnSync("bash", [join(f.dir, "deploy/update-admin.sh"), "--skip-pull"], {
        env: f.env,
        encoding: "utf8",
      });
      expect(r.status, r.stderr + r.stdout).toBe(0);
      const calls = f.calls();
      const mutations = calls.filter(
        (c) =>
          !c.includes("--help") &&
          ["build", "run", "up", "stop", "restart"].some((x) => c.includes(x)),
      );
      expect(mutations.flat()).not.toContain("app");
      expect(calls.find(isImageBuild)?.slice(-1)).toEqual(["admin"]);
      expect(calls.find((c) => c.includes("run"))).toContain("admin");
      expect(calls.findIndex((c) => c.includes("run"))).toBeLessThan(
        calls.findIndex((c) => c.includes("up")),
      );
      expect(calls.filter((c) => c.includes("up")).flat()).toContain("--no-deps");
      expect(calls.find((c) => c.includes("exec") && c.includes("admin"))).toContain("admin");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("rejects drift in the already running storefront before building admin", () => {
    const f = setup();
    try {
      const r = spawnSync("bash", [join(f.dir, "deploy/update-admin.sh"), "--skip-pull"], {
        env: { ...f.env, FAIL_STOREFRONT: "1" },
        encoding: "utf8",
      });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain("KOL_SIGNING_SECRET");
      expect(r.stderr).not.toContain("drift");
      expect(f.calls().filter(isImageBuild)).toHaveLength(0);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("requires Git by default but check-only never pulls or changes services", () => {
    const f = setup();
    try {
      const script = join(f.dir, "deploy/update-admin.sh");
      const r = spawnSync("bash", [script], { env: f.env, encoding: "utf8" });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain("Git checkout");
      expect(f.calls().filter(isImageBuild)).toHaveLength(0);
      const check = spawnSync("bash", [script, "--check"], { env: f.env, encoding: "utf8" });
      expect(check.status, check.stderr).toBe(0);
      expect(f.calls().flat()).not.toContain("up");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("pulls a local upstream and re-executes new code without losing admin-only mode", () => {
    const f = setup();
    const remote = mkdtempSync(join(tmpdir(), "offy-local-upstream-"));
    const git = (cwd: string, args: string[]) => {
      const r = spawnSync("git", args, { cwd, encoding: "utf8" });
      expect(r.status, r.stderr).toBe(0);
      return r.stdout.trim();
    };
    try {
      git(remote, ["init", "--bare"]);
      git(f.dir, ["init"]);
      git(f.dir, ["config", "user.email", "fixture@example.test"]);
      git(f.dir, ["config", "user.name", "Fixture"]);
      git(f.dir, ["add", "deploy", "docker-compose.prod.yml"]);
      git(f.dir, ["commit", "-m", "fixture"]);
      git(f.dir, ["remote", "add", "origin", remote]);
      git(f.dir, ["push", "-u", "origin", "HEAD"]);
      const writer = join(remote, "writer");
      git(remote, ["clone", remote, writer]);
      git(writer, ["config", "user.email", "fixture@example.test"]);
      git(writer, ["config", "user.name", "Fixture"]);
      const update = join(writer, "deploy/update.sh");
      writeFileSync(
        update,
        readFileSync(update, "utf8").replace(
          "set -euo pipefail",
          "set -euo pipefail\nprintf 'UPDATED_DEPLOYMENT_CODE\\n'",
        ),
      );
      const runtimePath = join(f.dir, ".env.production");
      renameSync(join(f.dir, ".env"), runtimePath);
      writeFileSync(runtimePath, "KOL_ENABLED=false\n");
      git(writer, ["add", "deploy/update.sh"]);
      git(writer, ["commit", "-m", "updated deployment"]);
      git(writer, ["push"]);
      const result = spawnSync("bash", [join(f.dir, "deploy/update-admin.sh")], {
        env: f.env,
        encoding: "utf8",
      });
      expect(result.status, result.stdout + result.stderr).toBe(0);
      expect(result.stdout).toContain("UPDATED_DEPLOYMENT_CODE");
      expect(readFileSync(runtimePath, "utf8")).toBe("KOL_ENABLED=false\n");
      expect(
        f
          .calls()
          .filter((c) => c.includes("config"))
          .every((c) => c.includes(runtimePath)),
      ).toBe(true);
      expect(
        f
          .calls()
          .filter((c) => c.includes("up") || isImageBuild(c))
          .flat(),
      ).not.toContain("app");
      expect(git(f.dir, ["rev-parse", "HEAD"])).toBe(git(writer, ["rev-parse", "HEAD"]));
      git(f.dir, ["remote", "set-url", "origin", join(remote, "missing")]);
      const before = f.calls().filter(isImageBuild).length;
      const failed = spawnSync("bash", [join(f.dir, "deploy/update-admin.sh")], {
        env: f.env,
        encoding: "utf8",
      });
      expect(failed.status).not.toBe(0);
      expect(f.calls().filter(isImageBuild)).toHaveLength(before);
      writeFileSync(
        join(f.dir, "deploy/update.sh"),
        readFileSync(join(f.dir, "deploy/update.sh"), "utf8") + "\n# tracked dirty change\n",
      );
      const dirty = spawnSync("bash", [join(f.dir, "deploy/update-admin.sh")], {
        env: f.env,
        encoding: "utf8",
      });
      expect(dirty.status).not.toBe(0);
    } finally {
      rmSync(f.dir, { recursive: true });
      rmSync(remote, { recursive: true });
    }
  }, 60_000);
});
