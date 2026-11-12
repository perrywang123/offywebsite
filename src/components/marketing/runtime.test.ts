import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureMeta,
  observeMeta,
  checkMetaConsent,
  registerMetaProducts,
  checkoutMarketingContext,
} from "./runtime";
describe("consented browser tracking", () => {
  let allow = true;
  beforeEach(() => {
    allow = true;
    localStorage.clear();
    history.replaceState({}, "", "/products/a");
    document.querySelectorAll("#offy-meta-pixel").forEach((n) => n.remove());
    Object.assign(window, {
      Shopify: {
        customerPrivacy: {
          analyticsProcessingAllowed: () => allow,
          marketingAllowed: () => allow,
          saleOfDataAllowed: () => allow,
        },
      },
      fbq: vi.fn(),
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    configureMeta({
      enabled: true,
      pixelId: "1120625754196383",
      catalogIds: { a: "real-catalog-id" },
    });
  });
  it("keeps checkout preparation local and never emits a Meta checkout event", () => {
    vi.mocked(window.fbq!).mockClear();
    observeMeta("CheckoutReady", {}, "receipt");
    observeMeta("InitiateCheckout", {}, "legacy-receipt");
    expect(window.fbq).not.toHaveBeenCalledWith(
      "trackSingle",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string).checkoutReceipt).toBe(
      "legacy-receipt",
    );
  });
  it("replaces source tags as a unit without resetting a genuine previous Meta click timestamp", () => {
    history.replaceState(
      {},
      "",
      "/products/a?campaign_id=120123456&adset_id=120234567&ad_id=120345678&fbclid=real-click",
    );
    observeMeta("PageView", {});
    history.replaceState({}, "", "/products/a?utm_source=newsletter&utm_medium=email");
    observeMeta("AddToCart", {});
    const body = JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string);
    expect(body.source).toEqual({ utm_source: "newsletter", utm_medium: "email" });
    expect(body.fbc).toMatch(/\.real-click$/);
  });
  it("does not carry a click cookie beyond the 30-day observation window", () => {
    document.cookie = `_fbc=fb.1.${Date.now() - 31 * 86400000}.expired-click; Path=/`;
    observeMeta("AddToCart", {});
    const body = JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string);
    expect(body.fbc).toBeUndefined();
    document.cookie = "_fbc=; Max-Age=0; Path=/";
  });
  it("sends the same event ID to browser Pixel and observation endpoint", () => {
    const id = observeMeta("AddToCart", { value: 49.9, currency: "USD", num_items: 1 });
    expect(id).toBeTruthy();
    expect(window.fbq).toHaveBeenCalledWith(
      "trackSingle",
      "1120625754196383",
      "AddToCart",
      expect.anything(),
      { eventID: id },
    );
    const body = JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string);
    expect(body.eventId).toBe(id);
    expect(body.consent).toBe(true);
  });
  it("does not send denied actions and drops pending identifiers on withdrawal", () => {
    observeMeta("PageView", {});
    allow = false;
    checkMetaConsent();
    vi.mocked(fetch).mockClear();
    expect(observeMeta("AddToCart", {})).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    expect(localStorage.getItem("offy.meta.v1")).toBeNull();
  });
  it("checkout context stays optional even when catalog metadata throws", () => {
    expect(
      checkoutMarketingContext(() => {
        throw new Error("invalid metadata");
      }),
    ).toBeUndefined();
    allow = false;
    checkMetaConsent();
    expect(checkoutMarketingContext({})).toBeUndefined();
  });
  it("tracking exceptions never escape into shopping", () => {
    Object.assign(window, {
      fbq: () => {
        throw new Error("blocked");
      },
    });
    expect(() => observeMeta("AddToCart", {})).not.toThrow();
    expect(() =>
      registerMetaProducts([{ code: "a", quantity: 1, currency: "USD", priceCents: 4990 }]),
    ).not.toThrow();
  });
  it("grants Pixel consent again after a withdrawal without replaying cart actions", () => {
    observeMeta("AddToCart", {});
    allow = false;
    checkMetaConsent();
    vi.mocked(window.fbq!).mockClear();
    allow = true;
    checkMetaConsent();
    expect(window.fbq).toHaveBeenCalledWith("consent", "grant");
    expect(window.fbq).not.toHaveBeenCalledWith(
      "trackSingle",
      expect.anything(),
      "AddToCart",
      expect.anything(),
      expect.anything(),
    );
  });
  it("clears a previous marketing identity when a new page starts with denied consent", () => {
    allow = false;
    checkMetaConsent();
    localStorage.setItem(
      "offy.meta.v1",
      JSON.stringify({ id: crypto.randomUUID(), expires: Date.now() + 10000, source: {} }),
    );
    checkMetaConsent();
    expect(localStorage.getItem("offy.meta.v1")).toBeNull();
  });
  it("still observes events and revokes Pixel when browser storage is unavailable", () => {
    const get = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      vi.mocked(fetch).mockClear();
      observeMeta("AddToCart", {});
      observeMeta("AddToCart", {});
      const posts = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST");
      expect(posts).toHaveLength(2);
      expect(JSON.parse(posts[0][1]!.body as string).visitorId).toBe(
        JSON.parse(posts[1][1]!.body as string).visitorId,
      );
      allow = false;
      checkMetaConsent();
      expect(window.fbq).toHaveBeenCalledWith("consent", "revoke");
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });
  it("does not mistake pending Meta configuration for denied privacy permission", () => {
    configureMeta({ enabled: false, pixelId: "", catalogIds: {} });
    const saved = JSON.stringify({
      id: crypto.randomUUID(),
      expires: Date.now() + 10000,
      source: {},
    });
    localStorage.setItem("offy.meta.v1", saved);
    checkMetaConsent();
    expect(localStorage.getItem("offy.meta.v1")).toBe(saved);
  });
});
