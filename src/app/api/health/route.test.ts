// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

/** 用可控的 env 模块替换真实实现,验证「配置缺失」能被报出来。 */
async function healthWith(shopify: boolean, stripe: boolean, paypal: boolean) {
  vi.resetModules();
  vi.doMock("@/lib/env", () => ({
    isShopifyConfigured: () => shopify,
    isStripeConfigured: () => stripe,
    isPayPalConfigured: () => paypal,
  }));
  const { GET } = await import("./route");
  return (await GET().json()) as { status: string; config: Record<string, string> };
}

describe("GET /api/health", () => {
  it("配置齐全时如实报告 configured", async () => {
    const body = await healthWith(true, true, true);
    expect(body.status).toBe("ok");
    expect(body.config.shopify).toBe("configured");
  });

  it("缺少 Shopify 凭据时必须显式报出来(否则站点静默回退本地目录,排查成本极高)", async () => {
    const body = await healthWith(false, false, false);
    expect(body.status).toBe("ok");
    expect(body.config.shopify).toContain("MISSING");
    // 说清后果,而不只是打个标记
    expect(body.config.shopify).toContain("回退");
  });

  it("存活判断与外部服务无关:Shopify 没配也仍然返回 ok", async () => {
    // 容器 HEALTHCHECK 用这个端点;若让它依赖 Shopify,第三方抖动会导致容器被重启
    const body = await healthWith(false, true, true);
    expect(body.status).toBe("ok");
  });
});
