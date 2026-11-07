// @vitest-environment node
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
it("rejects absent, stale, non-Linux or wrong-architecture images before replacement", () => {
  const dir = mkdtempSync(join(tmpdir(), "offy-prebuilt-test-"));
  try {
    const config = join(dir, "config.json");
    writeFileSync(config, JSON.stringify({ services: { app: { image: "offy-app:local" } } }));
    writeFileSync(
      join(dir, "docker"),
      '#!/usr/bin/env python3\nimport os,json,sys\nif os.environ.get("MISSING"):sys.exit(1)\nprint(json.dumps([{ "Os":os.environ.get("IMAGE_OS","linux"),"Architecture":os.environ.get("ARCH","amd64"),"Config":{"Labels":{"org.opencontainers.image.revision":os.environ.get("REV","abc")}}}]))\n',
      { mode: 0o755 },
    );
    const run = (extra: Record<string, string | undefined> = {}) =>
      spawnSync("python3", ["deploy/prebuilt-images.py", config, "abc", "app"], {
        env: { ...process.env, PATH: dir + ":" + process.env.PATH, ...extra },
        encoding: "utf8",
      });
    expect(run().status).toBe(0);
    for (const extra of [
      { MISSING: "1" },
      { REV: "wrong" },
      { IMAGE_OS: "darwin" },
      { ARCH: "arm64" },
    ])
      expect(run(extra).status).not.toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
