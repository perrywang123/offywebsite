// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "offy-build-runner-"));
  mkdirSync(join(dir, "bin"));
  writeFileSync(
    join(dir, "bin/pnpm"),
    `#!/usr/bin/env python3
import json,os,sys,time,signal
from pathlib import Path
args=sys.argv[1:]; phase='lint' if args==['lint'] else 'next-build'
with Path('calls').open('a') as f:f.write(json.dumps(args)+'\\n')
print('fixture '+phase+' output',flush=True)
if os.environ.get('BUILD_SLEEP'):time.sleep(float(os.environ['BUILD_SLEEP']))
if os.environ.get('BUILD_SIGNAL'):os.kill(os.getpid(),signal.SIGTERM)
sys.exit(2 if os.environ.get('BUILD_FAIL')==phase else 0)
`,
    { mode: 0o755 },
  );
  const script = resolve("scripts/build.mjs");
  const env = { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` };
  return {
    dir,
    script,
    env,
    run: (extra: Record<string, string> = {}) =>
      spawnSync(process.execPath, [script], {
        cwd: dir,
        env: { ...env, ...extra },
        encoding: "utf8",
      }),
    calls: () =>
      readFileSync(join(dir, "calls"), "utf8")
        .trim()
        .split("\n")
        .map((s) => JSON.parse(s)),
  };
}

describe("sequential production build", () => {
  it("runs mandatory lint before Next.js with only duplicate lint disabled", () => {
    const f = fixture();
    try {
      const r = f.run();
      expect(r.status, r.stderr).toBe(0);
      expect(f.calls()).toEqual([["lint"], ["exec", "next", "build", "--turbopack", "--no-lint"]]);
      expect(r.stdout).toMatch(/phase=lint status=start/);
      expect(r.stdout).toMatch(/phase=lint status=success elapsed=/);
      expect(r.stdout.indexOf("phase=lint status=success")).toBeLessThan(
        r.stdout.indexOf("phase=next-build status=start"),
      );
      expect(r.stdout).toContain("phase=next-build status=success");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it.each(["lint", "next-build"])(
    "returns failure for %s and never starts a later phase",
    (phase) => {
      const f = fixture();
      try {
        const r = f.run({ BUILD_FAIL: phase });
        expect(r.status, r.stderr).toBe(2);
        expect(f.calls()).toHaveLength(phase === "lint" ? 1 : 2);
        expect(r.stdout + r.stderr).toContain(`phase=${phase} status=failed`);
        expect(r.stdout + r.stderr).toContain("exit=2");
      } finally {
        rmSync(f.dir, { recursive: true });
      }
    },
  );
  it("maps a signaled phase to a nonzero cancellation result", () => {
    const f = fixture();
    try {
      const r = f.run({ BUILD_SIGNAL: "1" });
      expect(r.status).toBe(143);
      expect(r.stdout + r.stderr).toContain("signal=SIGTERM");
      expect(f.calls()).toHaveLength(1);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("prints periodic progress while a phase has no new output", () => {
    const f = fixture();
    try {
      const js = `const {runBuild}=await import(${JSON.stringify("file://" + f.script)});process.exitCode=await runBuild({heartbeatMs:30});`;
      const r = spawnSync(process.execPath, ["--input-type=module", "-e", js], {
        cwd: f.dir,
        env: { ...f.env, BUILD_SLEEP: "0.15" },
        encoding: "utf8",
      });
      expect(r.status, r.stderr).toBe(0);
      expect(r.stdout).toContain("status=running elapsed=");
      expect(r.stdout).toContain("cgroup_memory_mib=");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("forwards catchable interruption and stops before Next.js", async () => {
    const f = fixture();
    try {
      const child = spawn(process.execPath, [f.script], {
        cwd: f.dir,
        env: { ...f.env, BUILD_SLEEP: "10" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      let sent = false;
      child.stdout.on("data", (data) => {
        out += data;
        if (!sent && out.includes("fixture lint output")) {
          sent = true;
          child.kill("SIGTERM");
        }
      });
      const code = await new Promise((resolveCode, reject) => {
        child.on("close", resolveCode);
        child.on("error", reject);
      });
      expect(code).toBe(143);
      expect(out).toContain("status=canceled");
      expect(f.calls()).toHaveLength(1);
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  }, 15_000);
});
