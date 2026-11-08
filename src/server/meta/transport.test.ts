// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { deliver } from "./transport";
describe("CAPI bounded delivery", () => {
  it("accepts only acknowledged events, does not expose response/token in errors", async () => {
    const send = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ events_received: 1, fbtrace_id: "trace" }), { status: 200 }),
      );
    expect(
      await deliver(
        { event_id: "a" },
        { endpoint: "https://graph.facebook.com/v24.0/123/events", token: "private-token" },
        send,
      ),
    ).toEqual({ ok: true });
    expect(send.mock.calls[0][1].headers.Authorization).toBe("Bearer private-token");
    expect(
      await deliver(
        {},
        { endpoint: "https://graph.facebook.com/v24.0/123/events", token: "secret" },
        vi.fn().mockResolvedValue(new Response("secret details", { status: 503 })),
      ),
    ).toEqual({ ok: false, retryable: true, error: "http_503" });
    expect(
      await deliver(
        {},
        { endpoint: "https://graph.facebook.com/v24.0/123/events", token: "secret" },
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ error: { message: "secret" } }), { status: 200 }),
          ),
      ),
    ).toEqual({ ok: false, retryable: false, error: "meta_rejected" });
  });
});
