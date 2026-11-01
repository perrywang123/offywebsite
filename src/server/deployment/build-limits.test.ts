// @vitest-environment node
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "offy-build-limits-"));
  mkdirSync(join(dir, "deploy"));
  mkdirSync(join(dir, "bin"));
  if (existsSync("deploy/buildkitd.toml"))
    copyFileSync("deploy/buildkitd.toml", join(dir, "deploy/buildkitd.toml"));
  writeFileSync(join(dir, "config.json"), JSON.stringify({ "x-offy-deploy": { build_cpus: "1" } }));
  writeFileSync(
    join(dir, "bin/docker"),
    `#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
a=sys.argv[1:];root=Path(os.environ['BUILD_FIXTURE']);state=root/'builder.json'
with (root/'calls').open('a') as f:f.write(json.dumps(a)+'\\n')
if a[:2]==['buildx','version']:print('github.com/docker/buildx v'+('0.13.0' if os.environ.get('OLD_BUILDX') else '0.38.0'))
elif a[:2]==['context','show']:print('isolated-test')
elif a and a[0]=='info':print(json.dumps({'CpuCfsPeriod':True,'CpuCfsQuota':not bool(os.environ.get('NO_QUOTA'))}))
elif a[:2]==['compose','build'] and '--help' in a:print('build options '+('' if os.environ.get('OLD_COMPOSE') else '--builder string'))
elif a[:2]==['buildx','create']:
 name=a[a.index('--name')+1];opts=[a[i+1] for i,v in enumerate(a) if v=='--driver-opt']
 state.write_text(json.dumps({'name':name,'opts':dict(v.split('=',1) for v in opts),'config':a[a.index('--buildkitd-config')+1]}));print(name)
elif a[:2]==['buildx','inspect']:
 if not state.exists():print('no builder "fixture" found',file=sys.stderr);sys.exit(1)
 s=json.loads(state.read_text());driver='docker' if os.environ.get('DRIFT_DRIVER') else 'docker-container'
 print('Name: '+s['name']+'\\nDriver: '+driver+'\\nNodes:\\nName: '+s['name']+'0\\nDriver Options: '+' '.join(k+'="'+v+'"' for k,v in s['opts'].items())+'\\nFile#buildkitd.toml:\\n'+''.join('> '+line+'\\n' for line in Path(s['config']).read_text().splitlines()))
elif a and a[0]=='inspect':
 s=json.loads(state.read_text());q=int(s['opts']['cpu-quota'])+(1 if os.environ.get('DRIFT_QUOTA') else 0)
 print(json.dumps([{'State':{'Running':True},'HostConfig':{'CpuPeriod':100000,'CpuQuota':q}}]))
elif a and a[0]=='exec':
 s=json.loads(state.read_text());print('[worker.oci]\\nmax-parallelism = 2' if os.environ.get('DRIFT_PARALLELISM') else Path(s['config']).read_text())
else:sys.exit('unexpected isolated Docker invocation')
`,
    { mode: 0o755 },
  );
  return {
    dir,
    calls: () =>
      existsSync(join(dir, "calls"))
        ? readFileSync(join(dir, "calls"), "utf8")
            .trim()
            .split("\n")
            .map((l) => JSON.parse(l) as string[])
        : [],
    run: (check = false, extra: Record<string, string> = {}) =>
      spawnSync(
        "python3",
        [
          resolve("deploy/build-limits.py"),
          join(dir, "config.json"),
          "--root",
          dir,
          "--output",
          join(dir, "result.json"),
          ...(check ? ["--check"] : []),
        ],
        {
          env: {
            ...process.env,
            PATH: `${join(dir, "bin")}:${process.env.PATH}`,
            BUILD_FIXTURE: dir,
            ...extra,
          },
          encoding: "utf8",
        },
      ),
    result: () => JSON.parse(readFileSync(join(dir, "result.json"), "utf8")),
  };
}
describe("isolated build CPU budget", () => {
  it("check-only validates capabilities and plans one CPU without creating or bootstrapping a builder", () => {
    const f = fixture();
    try {
      const r = f.run(true);
      expect(r.status, r.stderr).toBe(0);
      expect(f.result()).toMatchObject({ cpus: "1", period: 100000, quota: 100000 });
      expect(existsSync(join(f.dir, "builder.json"))).toBe(false);
      expect(
        f
          .calls()
          .some(
            (a) =>
              a.includes("create") ||
              a.includes("--bootstrap") ||
              a.includes("exec") ||
              a.includes("use"),
          ),
      ).toBe(false);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("creates a dedicated capped builder, verifies actual quota and reuses its cache without selecting globally", () => {
    const f = fixture();
    try {
      const r = f.run();
      expect(r.status, r.stderr).toBe(0);
      const create = f.calls().find((a) => a.includes("create"))!;
      expect(create).toContain("docker-container");
      expect(create).toContain("cpu-quota=100000");
      expect(create).toContain("cpu-period=100000");
      expect(create).toContain("default-load=true");
      expect(create).not.toContain("--use");
      const first = f.result();
      expect(f.run().status).toBe(0);
      expect(f.result()).toEqual(first);
      expect(f.calls().filter((a) => a.includes("create"))).toHaveLength(1);
      const beforeCheck = f.calls().length;
      expect(f.run(true).status).toBe(0);
      expect(
        f
          .calls()
          .slice(beforeCheck)
          .some((a) => a.includes("--bootstrap") || a.includes("create") || a.includes("exec")),
      ).toBe(false);
      expect(f.calls().some((a) => a[0] === "inspect")).toBe(true);
      expect(f.calls().flat()).not.toContain("rm");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("accepts a half-core budget and rejects invalid budgets before creating builders", () => {
    const f = fixture();
    try {
      writeFileSync(
        join(f.dir, "config.json"),
        JSON.stringify({ "x-offy-deploy": { build_cpus: "0.5" } }),
      );
      expect(f.run(true).status).toBe(0);
      expect(f.result().quota).toBe(50000);
      for (const cpus of ["0", "-1", "NaN", "1000", "1; touch bad"]) {
        writeFileSync(
          join(f.dir, "config.json"),
          JSON.stringify({ "x-offy-deploy": { build_cpus: cpus } }),
        );
        expect(f.run().status).not.toBe(0);
      }
      expect(existsSync(join(f.dir, "builder.json"))).toBe(false);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("fails closed for unsupported capabilities and actual builder drift", () => {
    for (const flag of [
      "OLD_BUILDX",
      "OLD_COMPOSE",
      "NO_QUOTA",
      "DRIFT_DRIVER",
      "DRIFT_QUOTA",
      "DRIFT_PARALLELISM",
    ]) {
      const f = fixture();
      try {
        if (flag.startsWith("DRIFT")) expect(f.run().status).toBe(0);
        const r = f.run(false, { [flag]: "1" });
        expect(r.status, flag).not.toBe(0);
        expect(r.stderr).toContain("Build CPU");
        expect(f.calls().flat()).not.toContain("rm");
        expect(f.calls().flat()).not.toContain("use");
      } finally {
        rmSync(f.dir, { recursive: true });
      }
    }
  });
});
