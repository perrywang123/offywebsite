import { describe, expect, it, vi } from "vitest";
import { persistDestination } from "./client";

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
describe("destination persistence", () => {
  it("sends browser signals without a claimed country and verifies first-party cookie persistence", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ country: "GB", source: "timezone", persisted: true }))
      .mockResolvedValueOnce(json({ country: "GB", source: "timezone", persisted: true }));
    expect(
      await persistDestination(
        { mode: "resolve", timeZone: "Europe/London", languages: ["en-US"] },
        fetcher,
      ),
    ).toMatchObject({ country: "GB", persisted: true });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      mode: "resolve",
      timeZone: "Europe/London",
      languages: ["en-US"],
    });
    expect(fetcher.mock.calls[1][0]).toBe("/api/market?context=1");
  });
  it("does not claim success when cookies are blocked or another tab chose a different country", async () => {
    for (const context of [
      { country: "US", persisted: false, source: "default" },
      { country: "HK", persisted: true, source: "manual" },
    ]) {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(json({ country: "GB", source: "manual", persisted: true }))
        .mockResolvedValueOnce(json(context));
      await expect(persistDestination({ mode: "select", country: "GB" }, fetcher)).rejects.toThrow(
        "destination_not_saved",
      );
    }
  });
  it("stops on server refusal and never follows a URL from a response", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        json({ error: "market_unavailable", redirect: "https://other.example" }, false),
      );
    await expect(persistDestination({ mode: "select", country: "GB" }, fetcher)).rejects.toThrow(
      "destination_unavailable",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
