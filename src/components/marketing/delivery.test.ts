import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createObservationDelivery } from "./delivery";
import type { MetaEvent } from "@/lib/meta/events";

describe("bounded browser observation delivery", () => {
  const input = (): MetaEvent => ({
    eventId: crypto.randomUUID(),
    visitorId: crypto.randomUUID(),
    name: "AddToCart",
    occurredAt: Date.now(),
    pagePath: "/products/a",
    source: {},
    data: {},
    consent: true,
  });
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it("retries network/503/429 using the same body and terminates after three attempts", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    const delivery = createObservationDelivery(() => true, fetcher);
    const event = input();
    delivery.send(event);
    await vi.runAllTimersAsync();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(new Set(fetcher.mock.calls.map(([, init]) => init.body)).size).toBe(1);
    expect(JSON.parse(fetcher.mock.calls[2][1].body).eventId).toBe(event.eventId);
    expect(JSON.parse(fetcher.mock.calls[2][1].body).occurredAt).toBe(event.occurredAt);
  });
  it("never retries permanent rejection or duplicates a queued ID", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 400 }));
    const delivery = createObservationDelivery(() => true, fetcher);
    const event = input();
    delivery.send(event);
    delivery.send(event);
    await vi.runAllTimersAsync();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("cancels retries when permission or identity changes", async () => {
    let active = true;
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    const delivery = createObservationDelivery(() => active, fetcher);
    delivery.send(input());
    await vi.advanceTimersByTimeAsync(0);
    active = false;
    await vi.runAllTimersAsync();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("limits active requests and cancels in-flight and pending work", async () => {
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          signals.push(init.signal);
          init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    );
    const delivery = createObservationDelivery(() => true, fetcher);
    for (let i = 0; i < 60; i++) delivery.send(input());
    expect(fetcher).toHaveBeenCalledTimes(2);
    delivery.cancel();
    await vi.runAllTimersAsync();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(signals.every((s) => s.aborted)).toBe(true);
  });
  it("does not replay expired observations", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null));
    const delivery = createObservationDelivery(() => true, fetcher);
    delivery.send({ ...input(), occurredAt: Date.now() - 60001 });
    await vi.runAllTimersAsync();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("drops overflow above fifty jobs even after active requests finish", async () => {
    const resolvers: ((response: Response) => void)[] = [];
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => resolvers.push(resolve)));
    const delivery = createObservationDelivery(() => true, fetcher);
    for (let i = 0; i < 60; i++) delivery.send(input());
    for (let i = 0; i < 25; i++) {
      resolvers.splice(0).forEach((resolve) => resolve(new Response(null)));
      await vi.advanceTimersByTimeAsync(0);
    }
    await vi.runAllTimersAsync();
    expect(fetcher).toHaveBeenCalledTimes(50);
  });
  it("retries a timeout once and stops when the next attempt succeeds", async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal.addEventListener("abort", () => reject(new Error("timeout")));
          }),
      )
      .mockResolvedValue(new Response(null));
    const delivery = createObservationDelivery(() => true, fetcher);
    delivery.send(input());
    await vi.runAllTimersAsync();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
