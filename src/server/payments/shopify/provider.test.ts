// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

// 真实目录里没有"存在但买不了"的商品(全部 isAvailable),所以这一条只能靠
// 把 live 解析包一层 spy 来控制;其余用例继续走真实实现(离线时会回退本地目录)。
vi.mock("../../catalog/live", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../catalog/live")>();
  return { ...actual, getLiveProductByCode: vi.fn(actual.getLiveProductByCode) };
});

import { getLiveProductByCode } from "../../catalog/live";
import { cartMutation } from "./client";
import { ShopifyPaymentProvider } from "./provider";
import type { Product } from "../../../lib/catalog";

const MOTARO_VARIANT = "gid://shopify/ProductVariant/53491815579937";
const mockedProduct = getLiveProductByCode as unknown as ReturnType<typeof vi.fn>;

/** 一个"存在且有变体、但已售罄"的商品。 */
const soldOut = (code: string, variantId: string): Product => ({
  code,
  slug: code,
  series: "princess-lady",
  name: { zh: code, en: code },
  description: { zh: "", en: "" },
  priceCents: 4500,
  currency: "USD",
  dimensions: null,
  images: ["https://cdn/x.jpg"],
  emotionTags: { zh: [], en: [] },
  featured: false,
  isAvailable: false,
  isUpcoming: false,
  isQuoteOnly: false,
  sortOrder: 0,
  shopifyVariantId: variantId,
});

describe("cartMutation (checkout market)", () => {
  it("prices the cart in the visitor's market — country goes into both @inContext and buyerIdentity", () => {
    // 修复前这里固定注入 SHOPIFY_MARKET_COUNTRY(=US):英国访客在站上看到
    // £37.90,点结算却被送到按 USD 计价的结账页。buyerIdentity.countryCode
    // 是 Shopify Markets 决定 presentment 币种的依据,必须跟着访客走。
    const gb = cartMutation("GB", "en");
    expect(gb).toContain("@inContext(country: GB, language: EN)");
    expect(gb).toContain("buyerIdentity: { countryCode: GB }");
  });

  it("keeps the zh storefront's checkout language", () => {
    expect(cartMutation("HK", "zh")).toContain("@inContext(country: HK, language: ZH_CN)");
  });

  it("carries the post-checkout return signal as a cart attribute (CartInput has no returnUrl)", () => {
    // 已用本店 Storefront 探针确认 `attributes: [AttributeInput!]` 在 schema 上存在;
    // 若这里漏掉,`/checkout/return` 就永远收不到回站信号,袋子也就清不掉。
    const m = cartMutation("US", "en");
    expect(m).toContain("$attributes: [AttributeInput!]");
    expect(m).toContain("attributes: $attributes");
  });
});

describe("ShopifyPaymentProvider.createCheckout", () => {
  it("creates a Shopify cart and returns the checkoutUrl as a redirect", async () => {
    const createCart = vi.fn().mockResolvedValue({
      id: "gid://shopify/Cart/abc",
      checkoutUrl: "https://ujc6x6-41.myshopify.com/cart/c/abc?key=k",
    });
    const provider = new ShopifyPaymentProvider({ createCart, configured: () => true });

    // offy_redrush is mapped to the MOTARO variant in the catalog.
    const result = await provider.createCheckout({
      items: [{ code: "offy_redrush", quantity: 2 }],
      locale: "en",
    });

    expect(result).toEqual({
      ok: true,
      provider: "shopify",
      redirect: { kind: "redirect", url: "https://ujc6x6-41.myshopify.com/cart/c/abc?key=k" },
    });
    expect(createCart).toHaveBeenCalledWith([{ merchandiseId: MOTARO_VARIANT, quantity: 2 }]);
  });

  it("returns 400 unknown_items (naming the item) for an unknown product", async () => {
    const provider = new ShopifyPaymentProvider({ createCart: vi.fn(), configured: () => true });
    const result = await provider.createCheckout({
      items: [{ code: "NOPE", quantity: 1 }],
      locale: "en",
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "unknown_items",
      items: [{ code: "NOPE", reason: "unknown_items" }],
    });
  });

  it("returns 400 unknown_items when a product has no Shopify variant mapping", async () => {
    // PCOF1-A3 has no shopifyVariantId.
    const createCart = vi.fn();
    const provider = new ShopifyPaymentProvider({ createCart, configured: () => true });
    const result = await provider.createCheckout({
      items: [{ code: "PCOF1-A3", quantity: 1 }],
      locale: "en",
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "unknown_items",
      items: [{ code: "PCOF1-A3", reason: "unknown_items" }],
    });
    expect(createCart).not.toHaveBeenCalled();
  });

  it("classifies a sold-out product as unavailable_items and still names it (P0-3)", async () => {
    // 这正是"顾客一路点到结算才被 400 拦下"的那一类。修复前它和"商品不存在"
    // 共用 invalid_items,界面上只剩一个裸错误码、也不指名是哪一件。
    mockedProduct.mockResolvedValueOnce(soldOut("glimmer", "gid://shopify/ProductVariant/777"));
    const createCart = vi.fn();
    const provider = new ShopifyPaymentProvider({ createCart, configured: () => true });
    const result = await provider.createCheckout({
      items: [{ code: "glimmer", quantity: 1 }],
      locale: "en",
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "unavailable_items",
      items: [{ code: "glimmer", reason: "unavailable_items" }],
    });
    expect(createCart).not.toHaveBeenCalled();
  });

  it("names every offender when the bag mixes an unavailable item with an unknown one", async () => {
    mockedProduct.mockResolvedValueOnce(soldOut("glimmer", "gid://shopify/ProductVariant/777"));
    const provider = new ShopifyPaymentProvider({ createCart: vi.fn(), configured: () => true });
    const result = await provider.createCheckout({
      items: [
        { code: "glimmer", quantity: 1 },
        // PCOF1-A3 在本地目录里没有 Shopify 变体映射 → unknown_items
        { code: "PCOF1-A3", quantity: 1 },
      ],
      locale: "en",
    });
    expect(result).toMatchObject({
      ok: false,
      status: 400,
      // 有"存在但买不了"的商品时以它为主因,两类都列在 items 里
      error: "unavailable_items",
      items: [
        { code: "glimmer", reason: "unavailable_items" },
        { code: "PCOF1-A3", reason: "unknown_items" },
      ],
    });
  });

  it("returns 503 when Shopify is not configured", async () => {
    const provider = new ShopifyPaymentProvider({ createCart: vi.fn(), configured: () => false });
    const result = await provider.createCheckout({
      items: [{ code: "offy_redrush", quantity: 1 }],
      locale: "en",
    });
    expect(result).toEqual({ ok: false, status: 503, error: "shopify_unavailable" });
  });

  it("returns 502 shopify_error when the Storefront API call fails", async () => {
    const createCart = vi.fn().mockRejectedValue(new Error("boom"));
    const provider = new ShopifyPaymentProvider({ createCart, configured: () => true });
    const result = await provider.createCheckout({
      items: [{ code: "offy_redrush", quantity: 1 }],
      locale: "en",
    });
    expect(result).toEqual({ ok: false, status: 502, error: "shopify_error" });
  });
});

describe("ShopifyPaymentProvider.capture / parseCallback", () => {
  it("capture is a no-op (order owned by Shopify)", async () => {
    const provider = new ShopifyPaymentProvider({ configured: () => true });
    const result = await provider.capture();
    expect(result).toEqual({ ok: false, status: 409, error: "not_supported" });
  });

  it("parseCallback returns null", async () => {
    const provider = new ShopifyPaymentProvider({ configured: () => true });
    const result = await provider.parseCallback();
    expect(result).toBeNull();
  });
});
