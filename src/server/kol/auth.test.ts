// @vitest-environment node
import { describe, expect, it } from "vitest";
import { testDb } from "./test-db";
import {
  addAdmin,
  authenticate,
  sessionAdmin,
  logout,
  requireIngress,
  requireMutation,
} from "./auth";
const config = {
  enabled: true,
  ingressSecret: "ingress-test-32-bytes-secret",
  origin: "https://admin.test:8443",
  secure: true,
};
describe("admin security", () => {
  it("hashes passwords, expires and revokes sessions, persists login throttling", async () => {
    const db = testDb();
    await addAdmin(db, "admin@example.com", "long-password-for-test");
    expect(await authenticate(db, "admin@example.com", "wrong", 100)).toBeNull();
    const login = await authenticate(db, "ADMIN@example.com", "long-password-for-test", 101);
    expect(sessionAdmin(db, login!.token, 102)?.email).toBe("admin@example.com");
    expect(sessionAdmin(db, login!.token, 101 + 8 * 3600000 + 1)).toBeNull();
    logout(db, login!.token);
    expect(sessionAdmin(db, login!.token, 102)).toBeNull();
    for (let i = 0; i < 7; i++) await authenticate(db, "blocked@example.com", "wrong", 200);
    await expect(authenticate(db, "blocked@example.com", "wrong", 201)).rejects.toThrow(
      "login_throttled",
    );
  });
  it("requires secret ingress regardless of host, and exact origin + CSRF", () => {
    expect(() => requireIngress(new Headers({ host: "admin.test:8443" }), config)).toThrow();
    const h = new Headers({
      "x-offy-admin-ingress": config.ingressSecret,
      origin: config.origin,
      "x-offy-csrf": "1",
    });
    expect(() => requireIngress(h, config)).not.toThrow();
    expect(() => requireMutation(h, config)).not.toThrow();
    h.set("origin", "https://evil.test");
    expect(() => requireMutation(h, config)).toThrow("invalid_origin");
    expect(() => requireIngress(h, { ...config, enabled: false })).toThrow();
  });
});
