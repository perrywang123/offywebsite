// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { CONTACT_INFO, POLICY_HANDLES, getPolicy, isPolicyHandle } from "./policies";

function mockFetch(json: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({ ok, json: async () => json }) as unknown as typeof fetch;
}

const shopPayload = {
  data: {
    shop: {
      privacyPolicy: { title: "Privacy Policy", body: '<p class="p1">PRIVACY <b>POLICY</b></p>' },
      refundPolicy: { title: "Refund Policy", body: "<p>Refunds within 30 days.</p>" },
      shippingPolicy: { title: "Shipping Policy", body: "<p>Flat rate.</p>" },
      termsOfService: { title: "Terms of Service", body: "<p>Terms.</p>" },
    },
  },
};

describe("政策数据层(Shopify 书面政策)", () => {
  it("一次请求取回四个政策,并把正文消毒后返回", async () => {
    const p = await getPolicy("privacy", mockFetch(shopPayload));
    expect(p.handle).toBe("privacy");
    expect(p.source).toBe("shopify");
    // class 属性被剥掉
    expect(p.bodyHtml).toBe("<p>PRIVACY <b>POLICY</b></p>");
  });

  it("查询里带上了四个政策的 GraphQL 字段", async () => {
    const f = mockFetch(shopPayload);
    await getPolicy("terms", f);
    const body = JSON.parse((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    for (const field of ["privacyPolicy", "refundPolicy", "shippingPolicy", "termsOfService"]) {
      expect(body.query).toContain(field);
    }
  });

  it("联系信息走站内静态内容,不发请求", async () => {
    const f = mockFetch(shopPayload);
    const p = await getPolicy("contact", f);
    expect(p.source).toBe("static");
    expect(f).not.toHaveBeenCalled();
    expect(CONTACT_INFO.rows.map((r) => r.value)).toContain("contact@whimcoreofficial.com");
  });

  it("Shopify 不可达时返回 bodyHtml=null(页面据此兜底,不抛错)", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("ENOTFOUND")) as unknown as typeof fetch;
    const p = await getPolicy("returns", failing);
    expect(p.bodyHtml).toBeNull();
    expect(p.bodyHtml).toBeNull();
  });

  it("HTTP 非 2xx 也走兜底", async () => {
    const p = await getPolicy("returns", mockFetch({}, false));
    expect(p.bodyHtml).toBeNull();
  });

  it("Shopify 返回该政策为空时 bodyHtml 为 null", async () => {
    const p = await getPolicy("shipping", mockFetch({ data: { shop: { shippingPolicy: null } } }));
    expect(p.bodyHtml).toBeNull();
  });

  it("五个政策按页脚展示顺序排列,且顺序 = 需求里用户给的顺序", () => {
    expect([...POLICY_HANDLES]).toEqual(["returns", "privacy", "terms", "shipping", "contact"]);
  });

  it("isPolicyHandle 只认白名单(未知 handle 必须被挡掉,否则会渲染 200 空页)", () => {
    expect(isPolicyHandle("privacy")).toBe(true);
    expect(isPolicyHandle("returns")).toBe(true);
    expect(isPolicyHandle("legal-notice")).toBe(false);
    expect(isPolicyHandle("../../etc/passwd")).toBe(false);
    expect(isPolicyHandle("")).toBe(false);
  });

  it("不包括「法律声明」—— Shopify 后台未设置,公开页 404", () => {
    expect(POLICY_HANDLES).not.toContain("legal-notice");
    expect(POLICY_HANDLES).toEqual(["returns", "privacy", "terms", "shipping", "contact"]);
  });
});
