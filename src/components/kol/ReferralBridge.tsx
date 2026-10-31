"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
const KEY = "offy.referral.session";
export function referralTicket(): string | undefined {
  try {
    const value = sessionStorage.getItem(KEY);
    return value && /^[a-f0-9-]{36}$/.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
}
/** Only navigation or a real foreground user action extends the server's short session. */
export function ReferralBridge() {
  const pathname = usePathname();
  useEffect(() => {
    const url = new URL(location.href),
      incoming = url.searchParams.get("offy_visit");
    if (incoming) {
      try {
        sessionStorage.removeItem(KEY);
        if (/^[a-f0-9-]{36}$/.test(incoming)) sessionStorage.setItem(KEY, incoming);
      } catch {}
      url.searchParams.delete("offy_visit");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    }
    let last = 0;
    const confirm = () => {
      const ticket = referralTicket();
      if (!ticket || Date.now() - last < 10000 || document.visibilityState === "hidden") return;
      last = Date.now();
      void fetch("/api/kol/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
        cache: "no-store",
      })
        .then(async (r) => {
          if (r.ok && !(await r.json()).active) sessionStorage.removeItem(KEY);
        })
        .catch(() => {});
    };
    confirm();
    const activity = (event: Event) => {
      if (event.isTrusted) confirm();
    };
    document.addEventListener("click", activity);
    document.addEventListener("keydown", activity);
    return () => {
      document.removeEventListener("click", activity);
      document.removeEventListener("keydown", activity);
    };
  }, [pathname]);
  return null;
}
