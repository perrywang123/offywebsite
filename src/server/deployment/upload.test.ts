// @vitest-environment node
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { describe, it, expect } from "vitest";
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "offy-upload-test-")),
    bin = join(dir, "bin"),
    log = join(dir, "calls");
  mkdirSync(bin);
  for (const name of ["ssh", "rsync"]) {
    writeFileSync(
      join(bin, name),
      `#!/usr/bin/env python3\nimport sys,os,json\nwith open(os.environ['OFFY_TEST_CALLS'],'a') as f:f.write(json.dumps([${JSON.stringify(name)}]+sys.argv[1:])+'\\n')\nif ${JSON.stringify(name)}=='ssh':sys.stdin.read()\n`,
      { mode: 0o755 },
    );
  }
  return {
    dir,
    log,
    env: {
      ...process.env,
      PATH: bin + ":" + process.env.PATH,
      OFFY_TEST_CALLS: log,
      DEPLOY_SERVER: "offy-prod",
      DEPLOY_DIR: "/opt/offy",
    },
    calls: () => {
      try {
        return readFileSync(log, "utf8");
      } catch {
        return "";
      }
    },
  };
}
describe("source uploader", () => {
  it("validates local env selection and remote directory before any network call", () => {
    const f = setup();
    try {
      for (const extra of [
        { DEPLOY_ENV_FILE: join(f.dir, "missing") },
        { DEPLOY_DIR: "/" },
        { DEPLOY_DIR: "/opt/offy/../other" },
        { DEPLOY_DIR: "/opt/$(touch bad)" },
      ]) {
        const r = spawnSync("bash", ["scripts/deploy.sh", "--kol"], {
          env: { ...f.env, ...extra },
          encoding: "utf8",
        });
        expect(r.status).not.toBe(0);
        expect(f.calls()).toBe("");
      }
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("dry-run never connects or transfers", () => {
    const f = setup();
    try {
      const r = spawnSync("bash", ["scripts/deploy.sh", "--kol", "--dry-run"], {
        env: f.env,
        encoding: "utf8",
      });
      expect(r.status, r.stderr).toBe(0);
      expect(f.calls()).toBe("");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
  it("uses common exclusions and the validated server pipeline, without exposing private env contents", () => {
    const f = setup();
    try {
      const envFile = join(f.dir, "private.env");
      writeFileSync(envFile, "TEST_PRIVATE_VALUE=do-not-log-this\n");
      const r = spawnSync("bash", ["scripts/deploy.sh", "--kol"], {
        env: { ...f.env, DEPLOY_ENV_FILE: envFile },
        encoding: "utf8",
      });
      expect(r.status, r.stderr).toBe(0);
      const calls = f.calls();
      expect(calls).toContain("source-excludes.txt");
      expect(calls).toContain("--skip-pull");
      expect(calls).toContain("--kol");
      expect(calls).toContain("upload-env.sh");
      expect(calls + r.stdout + r.stderr).not.toContain("do-not-log-this");
    } finally {
      rmSync(f.dir, { recursive: true });
    }
  });
});
