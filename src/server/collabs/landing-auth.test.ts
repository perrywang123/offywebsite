// @vitest-environment node
import { expect, it } from "vitest";
import {
  issueLandingVisitor,
  readLandingVisitor,
  landingVisitorHash,
  createLandingLimiter,
} from "./landing-auth";
const secret = "isolated-signing-secret-000000000000000000",
  now = 1794080000000;
it("purpose-signs a fixed-expiry browser cookie and rejects tampering, future or expired identities", () => {
  const cookie = issueLandingVisitor(secret, now);
  expect(readLandingVisitor(cookie, secret, now + 1)?.issuedAt).toBe(now);
  expect(readLandingVisitor(cookie + "x", secret, now)).toBeNull();
  expect(readLandingVisitor(cookie, secret + "other", now)).toBeNull();
  expect(readLandingVisitor(cookie, secret, now + 90 * 86400000)).toBeNull();
  expect(readLandingVisitor(cookie, secret, now - 60000)).toBeNull();
  const identity = readLandingVisitor(cookie, secret, now)!;
  expect(landingVisitorHash(identity.id, secret)).not.toContain(identity.id);
  expect(landingVisitorHash(identity.id, secret)).toHaveLength(64);
});
it("bounds request rate without storing raw network identities", () => {
  const admit = createLandingLimiter(3, 2);
  expect(admit("a", now)).toBe(true);
  expect(admit("a", now)).toBe(true);
  expect(admit("a", now)).toBe(false);
  expect(admit("b", now)).toBe(true);
  expect(admit("c", now)).toBe(false);
  expect(admit("a", now + 60000)).toBe(true);
});
