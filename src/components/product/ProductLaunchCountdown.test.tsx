import { act, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { ProductLaunchCountdown } from "./ProductLaunchCountdown";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const releaseAt = "2026-11-26T08:00:00+08:00";
const cutoff = Date.parse("2026-11-26T00:00:00Z");

function countdown(
  serverNow: number,
  variant?: "detail" | "badge",
  date: string | null = releaseAt,
) {
  return (
    <StrictMode>
      <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
        <ProductLaunchCountdown releaseAt={date} serverNow={serverNow} variant={variant} />
      </NextIntlClientProvider>
    </StrictMode>
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "performance", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(new Date("2031-03-10T07:00:00Z"));
  router.refresh.mockClear();
});

afterEach(() => vi.useRealTimers());

describe("launch countdown", () => {
  it("counts from server time, shows the exact time in UTC, and rechecks only once across midnight", () => {
    const { container, rerender } = render(countdown(cutoff - 2_000));

    expect(screen.getByText("Coming soon")).toBeVisible();
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-11-26T00:00:00.000Z");
    expect(time).toHaveTextContent(/Nov 26, 2026, 12:00\s*AM UTC/);
    expect(screen.getByRole("timer")).toHaveTextContent("In 2s");
    expect(router.refresh).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByRole("timer")).toHaveTextContent("In 1s");
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.queryByRole("timer")).toBeNull();
    expect(router.refresh).toHaveBeenCalledOnce();

    rerender(countdown(cutoff + 5_000));
    act(() => vi.advanceTimersByTime(30_000));
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(screen.getByText("Currently unavailable")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Check availability" }));
    expect(router.refresh).toHaveBeenCalledTimes(2);
  });

  it("switches a compact linked-card badge to the waiting state without revalidating the route", () => {
    const { container } = render(countdown(cutoff - 2_000, "badge"));
    expect(screen.getByText("Coming soon")).toBeVisible();
    expect(container.querySelector("time")).toHaveTextContent(/Nov 26.*UTC/);
    expect(screen.getByRole("timer")).toHaveTextContent("In 2s");

    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByText("Currently unavailable")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("leads with the opening time further out and leads with the countdown on release day", () => {
    const hour = 3_600_000;
    const { container, rerender } = render(countdown(cutoff - 30 * hour));
    const time = () => container.querySelector("time")?.parentElement;

    expect(screen.getByRole("timer")).toHaveTextContent("In 1d 6h");
    expect(time()?.nextElementSibling).toBe(screen.getByRole("timer"));

    rerender(countdown(cutoff - 2 * hour));
    expect(screen.getByRole("timer")).toHaveTextContent("In 2h 0m");
    expect(screen.getByRole("timer").nextElementSibling).toBe(time());
  });

  it.each([null, "2026-11-26T00:00:00", "unannounced"])(
    "shows an unannounced date for %s without guessing a timezone",
    (date) => {
      const { container } = render(countdown(cutoff - 2_000, "detail", date));
      expect(screen.getByText("Release date to be announced")).toBeVisible();
      expect(container.querySelector("time")).toBeNull();
      expect(screen.queryByRole("timer")).toBeNull();
      act(() => vi.advanceTimersByTime(2_000));
      expect(router.refresh).not.toHaveBeenCalled();
    },
  );
});
