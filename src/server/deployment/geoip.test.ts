// @vitest-environment node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("checks the optional Country database every three days with bounded resources", () => {
  const companion = readFileSync("deploy/docker-compose.geoip.yml", "utf8");
  expect(companion).toMatch(/GEOIPUPDATE_FREQUENCY:\s*"72"/);
  expect(companion).toContain("GEOIPUPDATE_EDITION_IDS: GeoLite2-Country");
  expect(companion).toMatch(/cpus:\s*0\.10/);
  expect(companion).toMatch(/mem_limit:\s*96m/);
});

it("starts only the updater without rebuilding or restarting commerce services or logging credentials", () => {
  const root = mkdtempSync(join(tmpdir(), "offy-geoip-launch-"));
  try {
    mkdirSync(join(root, "deploy"));
    mkdirSync(join(root, "bin"));
    mkdirSync(join(root, ".offy-geoip.local"), { mode: 0o700 });
    writeFileSync(join(root, "deploy/update-geoip.sh"), readFileSync("deploy/update-geoip.sh"));
    writeFileSync(join(root, ".offy-geoip.local/account"), "123456");
    writeFileSync(join(root, ".offy-geoip.local/license"), "private-fixture-key");
    writeFileSync(
      join(root, "bin/docker"),
      '#!/bin/sh\nprintf "%s\\n" "$@" > "$OFFY_GEOIP_TEST_ARGS"\n',
      { mode: 0o755 },
    );
    const capture = join(root, "args.txt");
    const result = spawnSync("bash", [join(root, "deploy/update-geoip.sh")], {
      env: {
        ...process.env,
        PATH: `${join(root, "bin")}:${process.env.PATH}`,
        OFFY_GEOIP_TEST_ARGS: capture,
      },
      encoding: "utf8",
      timeout: 5000,
    });
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(capture, "utf8").trim().split("\n")).toEqual([
      "compose",
      "--project-directory",
      resolve(root),
      "-f",
      "docker-compose.prod.yml",
      "-f",
      "deploy/docker-compose.geoip.yml",
      "up",
      "-d",
      "--no-deps",
      "geoipupdate",
    ]);
    expect(result.stdout + result.stderr).not.toContain("private-fixture-key");
    expect(readFileSync(join(root, ".offy-geoip.local/license"), "utf8")).toBe(
      "private-fixture-key",
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});
