import { afterEach, describe, expect, it, vi } from "vitest";
import { beginCheckoutAttempt, reportCheckoutObservation } from "./checkout-diagnostics-client";
afterEach(() => vi.unstubAllGlobals());
describe("anonymous client telemetry", () => {
  it("registers only product identity, quantity, language and path; observations use keepalive", async () => {
    const transport = vi
      .fn()
      .mockImplementation(async () => Response.json({ receipt: "receipt-token" }));
    vi.stubGlobal("fetch", transport);
    const receipt = await beginCheckoutAttempt([{ code: "wild", quantity: 1 }], "en");
    expect(receipt).toBe("receipt-token");
    expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({
      action: "start",
      items: [{ code: "wild", quantity: 1 }],
      locale: "en",
      pagePath: "/",
    });
    reportCheckoutObservation(receipt, "redirect_requested");
    expect(transport.mock.calls[1][1].keepalive).toBe(true);
  });
  it("a failed telemetry endpoint does not reject checkout preparation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      beginCheckoutAttempt([{ code: "wild", quantity: 1 }], "en"),
    ).resolves.toBeUndefined();
    expect(() => reportCheckoutObservation(undefined, "client_error")).not.toThrow();
  });
});
