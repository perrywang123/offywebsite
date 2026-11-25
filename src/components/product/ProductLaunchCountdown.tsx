"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const second = 1_000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const zonedIsoTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

type CountdownProps = {
  releaseAt: string | null;
  serverNow: number;
  variant?: "badge" | "detail";
};

function useRemainingTime(releaseTime: number, serverNow: number) {
  const [clock, setClock] = useState({ releaseTime, serverNow, elapsed: 0 });

  useEffect(() => {
    if (!Number.isFinite(releaseTime) || releaseTime <= serverNow) return;

    // Count elapsed time from the server sample independently of the shopper's device clock.
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (remaining: number) => {
      const unit = remaining > day ? hour : remaining > hour ? minute : second;
      timer = setTimeout(update, remaining % unit || unit);
    };
    function update() {
      clearTimeout(timer);
      const elapsed = Math.floor(performance.now() - start);
      setClock({ releaseTime, serverNow, elapsed });
      const remaining = releaseTime - serverNow - elapsed;
      if (remaining > 0) schedule(remaining);
    }
    function onVisible() {
      if (document.visibilityState === "visible") update();
    }

    schedule(releaseTime - serverNow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [releaseTime, serverNow]);

  const elapsed =
    clock.serverNow === serverNow && clock.releaseTime === releaseTime ? clock.elapsed : 0;
  return releaseTime - serverNow - elapsed;
}

function remainingLabel(
  remaining: number,
  t: ReturnType<typeof useTranslations<"product.launch">>,
) {
  if (remaining > day) {
    const hours = Math.ceil(remaining / hour);
    return t("daysRemaining", { days: Math.floor(hours / 24), hours: hours % 24 });
  }
  if (remaining > hour) {
    const minutes = Math.ceil(remaining / minute);
    return t("hoursRemaining", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  }
  const seconds = Math.ceil(remaining / second);
  if (seconds < 60) return t("secondsRemaining", { seconds });
  return t("minutesRemaining", { minutes: Math.floor(seconds / 60), seconds: seconds % 60 });
}

type TimingProps = { releaseTime: number; remaining: number };

function LaunchTiming({ releaseTime, remaining, compact }: TimingProps & { compact?: boolean }) {
  const t = useTranslations("product.launch");
  const locale = useLocale();

  if (!Number.isFinite(releaseTime)) return <span className="block">{t("unannounced")}</span>;
  if (remaining <= 0) return <span className="block">{t("unavailable")}</span>;

  const showSeconds = releaseTime % minute !== 0;
  const date = new Intl.DateTimeFormat(locale, {
    year: compact ? undefined : "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(releaseTime);
  const emphasizeCountdown = !compact && remaining <= day;
  const openingTime = (
    <span className={emphasizeCountdown ? "text-ink-soft block text-sm" : "block"}>
      {compact ? "" : `${t("opens")} `}
      <time dateTime={new Date(releaseTime).toISOString()}>{date}</time>
    </span>
  );
  const countdown = (
    <span
      role="timer"
      aria-live="off"
      className={
        emphasizeCountdown ? "font-display block text-xl tabular-nums" : "block tabular-nums"
      }
    >
      {remainingLabel(remaining, t)}
    </span>
  );
  if (compact) {
    return (
      <>
        {countdown}
        {openingTime}
      </>
    );
  }
  return emphasizeCountdown ? (
    <>
      {countdown}
      {openingTime}
    </>
  ) : (
    <>
      {openingTime}
      {countdown}
    </>
  );
}

function LaunchDetail({ releaseTime, remaining, serverNow }: TimingProps & { serverNow: number }) {
  const t = useTranslations("product.launch");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const rechecked = useRef<number | null>(null);
  const expired = remaining <= 0;

  useEffect(() => {
    // A server response after the deadline has already checked Storefront for this market.
    if (!expired || releaseTime <= serverNow || rechecked.current === releaseTime) return;
    rechecked.current = releaseTime;
    startTransition(() => router.refresh());
  }, [expired, releaseTime, router, serverNow]);

  return (
    <div className="border-cream-line bg-paper text-ink rounded-soft space-y-1 border px-4 py-3 sm:px-5">
      {expired ? (
        <>
          <p className="text-sm font-medium" role="status">
            {pending ? t("checking") : t("unavailable")}
          </p>
          <button
            type="button"
            className="link-line tap-target text-sm disabled:opacity-60"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            {t("retry")}
          </button>
        </>
      ) : (
        <>
          <p className="text-ink-soft text-xs font-semibold tracking-wide uppercase">
            {t("comingSoon")}
          </p>
          <LaunchTiming releaseTime={releaseTime} remaining={remaining} />
        </>
      )}
    </div>
  );
}

export function ProductLaunchCountdown({
  releaseAt,
  serverNow,
  variant = "detail",
}: CountdownProps) {
  const t = useTranslations("product.launch");
  const releaseTime = releaseAt && zonedIsoTime.test(releaseAt) ? Date.parse(releaseAt) : NaN;
  const remaining = useRemainingTime(releaseTime, serverNow);

  if (variant === "detail") {
    return <LaunchDetail releaseTime={releaseTime} remaining={remaining} serverNow={serverNow} />;
  }

  return (
    <span className="text-ink-soft flex flex-wrap items-baseline gap-x-2 text-xs leading-snug">
      <span className="text-ink font-semibold">{t("comingSoon")}</span>
      <LaunchTiming releaseTime={releaseTime} remaining={remaining} compact />
    </span>
  );
}
