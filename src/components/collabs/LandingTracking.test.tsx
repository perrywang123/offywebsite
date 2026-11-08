import { render, act, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const route = vi.hoisted(() => ({ path: "/products", query: "dt_id=3689395&utm_source=video" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.path,
  useSearchParams: () => new URLSearchParams(route.query),
}));
import { CollabsLandingTracking } from "./LandingTracking";
let allowed: boolean;
beforeEach(() => {
  route.path = "/products";
  route.query = "dt_id=3689395&utm_source=video";
  allowed = false;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  Object.assign(window, {
    Shopify: {
      customerPrivacy: { analyticsProcessingAllowed: () => allowed, consentStatus: "loaded" },
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete window.Shopify;
});
const posts = () => vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === "POST");
it("does not observe before permission and sends one minimal view after consent even under StrictMode", async () => {
  render(
    <StrictMode>
      <CollabsLandingTracking />
    </StrictMode>,
  );
  expect(posts()).toHaveLength(0);
  await act(async () => {
    allowed = true;
    document.dispatchEvent(new Event("visitorConsentCollected"));
  });
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(JSON.parse(String(posts()[0][1]?.body))).toMatchObject({
    version: 1,
    dtId: "3689395",
    path: "/products",
    analyticsAllowed: true,
  });
  expect(String(posts()[0][1]?.body)).not.toContain("utm_source");
  await act(async () => {
    document.dispatchEvent(new Event("visitorConsentCollected"));
  });
  expect(posts()).toHaveLength(1);
});
it("observes another rendered landing but does not carry the previous dt_id into unrelated pages", async () => {
  allowed = true;
  const ui = render(<CollabsLandingTracking />);
  await waitFor(() => expect(posts()).toHaveLength(1));
  route.path = "/products/another";
  ui.rerender(<CollabsLandingTracking />);
  await waitFor(() => expect(posts()).toHaveLength(2));
  route.query = "";
  route.path = "/about";
  ui.rerender(<CollabsLandingTracking />);
  expect(posts()).toHaveLength(2);
});
it("reacts to privacy readiness and clears an existing identity when permission is withdrawn", async () => {
  delete window.Shopify;
  render(<CollabsLandingTracking />);
  expect(fetch).not.toHaveBeenCalled();
  await act(async () => {
    Object.assign(window, {
      Shopify: { customerPrivacy: { analyticsProcessingAllowed: () => allowed } },
    });
    allowed = true;
    document.dispatchEvent(new Event("shopifyCustomerPrivacyApiLoaded"));
  });
  await waitFor(() => expect(posts()).toHaveLength(1));
  await act(async () => {
    allowed = false;
    document.dispatchEvent(new Event("visitorConsentCollected"));
  });
  expect(vi.mocked(fetch).mock.calls.at(-1)?.[1]?.method).toBe("DELETE");
});
it("ignores malformed tracking parameters, private routes and tracking transport errors", async () => {
  allowed = true;
  route.query = "dt_id=1&dt_id=2";
  const ui = render(<CollabsLandingTracking />);
  expect(posts()).toHaveLength(0);
  route.query = "dt_id=3689395";
  route.path = "/checkout/return";
  ui.rerender(<CollabsLandingTracking />);
  expect(posts()).toHaveLength(0);
  vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  route.path = "/products";
  ui.rerender(<CollabsLandingTracking />);
  await waitFor(() => expect(posts()).toHaveLength(1));
});
it("contains synchronous identifier and transport failures outside React", () => {
  allowed = true;
  const uuid = vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
    throw new Error("identifier unavailable");
  });
  expect(() => render(<CollabsLandingTracking />)).not.toThrow();
  expect(posts()).toHaveLength(0);
  uuid.mockRestore();
});
