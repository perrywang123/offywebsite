// @vitest-environment node
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("existing Meta catalog configuration", () => {
  function fixture() {
    const dir = mkdtempSync(join(tmpdir(), "offy-meta-catalog-test-"));
    const env = join(dir, ".env");
    const map = join(dir, "mapping.json");
    const original =
      "# commerce remains unchanged\nSITE_URL=https://isoffy.com\nSHOPIFY_ADMIN_TOKEN='private-test-token'\nLITERAL=$(do-not-execute)\nMETA_CATALOG_IDS='{}'\n";
    writeFileSync(env, original);
    writeFileSync(map, JSON.stringify({ "black-pearl": "53547250549025" }));
    return {
      dir,
      env,
      map,
      original,
      run: (check = false) =>
        spawnSync(
          "python3",
          [
            "deploy/configure-meta-catalog.py",
            "--env-file",
            env,
            "--mapping-file",
            map,
            ...(check ? ["--check"] : []),
          ],
          { encoding: "utf8" },
        ),
      close: () => rmSync(dir, { recursive: true, force: true }),
    };
  }
  it("previews without writing and changes only catalog IDs with a private recovery backup", () => {
    const f = fixture();
    try {
      expect(f.run(true).status).toBe(0);
      expect(readFileSync(f.env, "utf8")).toBe(f.original);
      expect(readdirSync(f.dir).filter((n) => n.includes("backup"))).toHaveLength(0);
      const result = f.run();
      expect(result.status).toBe(0);
      expect(result.stdout + result.stderr).not.toContain("private-test-token");
      const updated = readFileSync(f.env, "utf8");
      expect(updated.replace(/^META_CATALOG_IDS=.*\n/m, "")).toBe(
        f.original.replace(/^META_CATALOG_IDS=.*\n/m, ""),
      );
      expect(updated).toContain('META_CATALOG_IDS=\'{"black-pearl":"53547250549025"}\'');
      expect(statSync(f.env).mode & 0o777).toBe(0o600);
      const backup = readdirSync(f.dir).find((n) => n.includes("backup"))!;
      expect(readFileSync(join(f.dir, backup), "utf8")).toBe(f.original);
      expect(statSync(join(f.dir, backup)).mode & 0o777).toBe(0o600);
    } finally {
      f.close();
    }
  });
  it("rejects empty, duplicate, malformed and non-string mappings without changing configuration", () => {
    const f = fixture();
    try {
      for (const mapping of [
        "{}",
        '{"a":"123","a":"456"}',
        '{"a":"123","b":"123"}',
        '{"a":123}',
        '{"a":"bad\\nvalue"}',
        '{"a":"123"',
      ]) {
        writeFileSync(f.map, mapping);
        expect(f.run().status, mapping).not.toBe(0);
        expect(readFileSync(f.env, "utf8")).toBe(f.original);
      }
    } finally {
      f.close();
    }
  });
});
