// @vitest-environment node
import { mkdtempSync, readFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ path: ":memory:" }));
vi.mock("@/lib/env", () => ({
  env: {
    get DATABASE_URL() {
      return state.path;
    },
  },
}));
describe("shared persisted diagnostic encryption key", () => {
  it("independent module instances read the same private key from the shared database directory", async () => {
    const directory = mkdtempSync(join(tmpdir(), "offy-diagnostic-key-test-"));
    state.path = join(directory, "offy.db");
    try {
      vi.resetModules();
      const first = await import("./crypto"),
        key = first.diagnosticKey();
      const encrypted = first.encryptDiagnostic(
        { checkoutUrl: "https://test.invalid/private" },
        key,
        "attempt",
      );
      vi.resetModules();
      const second = await import("./crypto");
      expect(second.diagnosticKey().equals(key)).toBe(true);
      expect(second.decryptDiagnostic(encrypted, second.diagnosticKey(), "attempt")).toEqual({
        checkoutUrl: "https://test.invalid/private",
      });
      expect(readFileSync(join(directory, "checkout-diagnostics.key"), "utf8")).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(statSync(join(directory, "checkout-diagnostics.key")).mode & 0o777).toBe(0o600);
      expect(() => second.decryptDiagnostic(encrypted, key, "other-attempt")).toThrow(
        "diagnostic_key_unavailable",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
      state.path = ":memory:";
    }
  });
});
