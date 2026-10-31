// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe("isolated Shopify transport", () => {
  it("refuses the simulator in production even if explicitly enabled", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OFFY_INTEGRATION_TEST", "true");
    vi.stubEnv("SHOPIFY_TEST_ORIGIN", "http://127.0.0.1:3903");
    await expect(import("@/lib/env")).rejects.toThrow("Integration transport");
  });
  it("refuses a non-loopback test origin", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("OFFY_INTEGRATION_TEST", "true");
    vi.stubEnv("SHOPIFY_TEST_ORIGIN", "https://real-store.myshopify.com");
    vi.stubEnv("SITE_URL", "http://127.0.0.1:3901");
    const { shopifyOrigin } = await import("@/lib/env");
    expect(() => shopifyOrigin()).toThrow("unsafe_shopify_test_origin");
  });
  it("requires secrets when KOL is enabled", async () => {
    vi.resetModules();
    vi.stubEnv("KOL_ENABLED", "true");
    vi.stubEnv("KOL_INGRESS_SECRET", "");
    vi.stubEnv("KOL_SIGNING_SECRET", "");
    await expect(import("@/lib/env")).rejects.toThrow("Enabled KOL requires");
  });
});
