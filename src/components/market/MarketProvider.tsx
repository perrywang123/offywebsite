"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MARKET_REVIEW_BAG, type MarketState, type MarketCountry } from "@/lib/market";
import { persistDestination } from "./client";

interface MarketContextValue {
  state: MarketState;
  ready: boolean;
  resolving: boolean;
  open: boolean;
  saving: boolean;
  error: string;
  show: () => void;
  close: () => void;
  loadCountries: () => Promise<void>;
  save: (country: string, reviewBag: boolean) => Promise<void>;
  reloadDestination: (reviewBag: boolean) => void;
}
const MarketContext = createContext<MarketContextValue | null>(null);
const reloadPage = () => window.location.reload();
export function MarketProvider({
  children,
  initial,
  reload = reloadPage,
}: {
  children: React.ReactNode;
  initial: MarketState;
  reload?: () => void;
}) {
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? "";
  const routeKey = `${pathname ?? ""}?${search}`;
  const previousRoute = useRef(routeKey);
  const reloading = useRef(false);
  const interacting = useRef(false);
  const [state, setState] = useState(initial);
  const [resolving, setResolving] = useState(!initial.persisted);
  const [ready, setReady] = useState(
    initial.persisted || ["manual", "header", "ip"].includes(initial.source),
  );
  const [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const reloadDestination = useCallback(
    (reviewBag: boolean) => {
      if (interacting.current || reloading.current) return;
      if (reviewBag) {
        try {
          sessionStorage.setItem(MARKET_REVIEW_BAG, "1");
        } catch {
          /* Bag identities remain persisted. */
        }
      }
      reloading.current = true;
      reload();
    },
    [reload],
  );
  useEffect(() => {
    if (initial.persisted) return;
    let active = true;
    let timeZone: string | undefined;
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      /* Language or US remains available. */
    }
    void persistDestination({
      mode: "resolve",
      timeZone,
      languages: Array.from(navigator.languages ?? [navigator.language]).slice(0, 20),
    })
      .then((saved) => {
        if (!active) return;
        if (saved.country !== initial.country) {
          reload();
          return;
        }
        setState((previous) => ({ ...previous, ...saved }));
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      })
      .finally(() => {
        if (active) setResolving(false);
      });
    return () => {
      active = false;
    };
  }, [initial.country, initial.persisted, reload]);
  useEffect(() => {
    const navigated = previousRoute.current !== routeKey;
    previousRoute.current = routeKey;
    if (resolving || saving || open || !state.persisted) return;
    let active = true;
    let checking = false;
    const checkContext = () => {
      if (checking || reloading.current) return;
      checking = true;
      void fetch("/api/market?context=1", { cache: "no-store", signal: AbortSignal.timeout(3000) })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (active && data?.country && (!data.persisted || data.country !== state.country)) {
            reloadDestination(false);
          }
        })
        .catch(() => {})
        .finally(() => {
          checking = false;
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkContext();
    };
    document.addEventListener("visibilitychange", onVisible);
    if (navigated) checkContext();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state.country, state.persisted, resolving, saving, open, routeKey, reloadDestination]);
  const loadCountries = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/market", {
        cache: "no-store",
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { countries?: MarketCountry[] };
      if (!Array.isArray(data.countries) || !data.countries.length) throw new Error();
      setState((previous) => ({ ...previous, countries: data.countries! }));
    } catch {
      setError("We couldn’t load destinations. Please try again.");
    }
  }, []);
  const show = useCallback(() => {
    interacting.current = true;
    setError("");
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    if (!saving) {
      interacting.current = false;
      setOpen(false);
    }
  }, [saving]);
  const save = useCallback(
    async (country: string, reviewBag: boolean) => {
      setSaving(true);
      setError("");
      try {
        await persistDestination({ mode: "select", country });
        if (reviewBag) {
          try {
            sessionStorage.setItem(MARKET_REVIEW_BAG, "1");
          } catch {
            /* Bag identities are still preserved in localStorage. */
          }
        }
        reload();
      } catch (reason) {
        setError(
          reason instanceof Error && reason.message === "destination_not_saved"
            ? "Your destination couldn’t be saved. Enable cookies and try again."
            : "We couldn’t update your destination. Please try again.",
        );
        setSaving(false);
      }
    },
    [reload],
  );
  const value = useMemo(
    () => ({
      state,
      ready,
      resolving,
      open,
      saving,
      error,
      show,
      close,
      loadCountries,
      save,
      reloadDestination,
    }),
    [
      state,
      ready,
      resolving,
      open,
      saving,
      error,
      show,
      close,
      loadCountries,
      save,
      reloadDestination,
    ],
  );
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}
export function useOptionalMarket() {
  return useContext(MarketContext);
}
export function MarketContent({ children }: { children: React.ReactNode }) {
  const market = useOptionalMarket();
  return (
    <div className="destination-content" data-destination-pending={market ? !market.ready : false}>
      <div className="destination-resolving" role="status">
        Setting your destination…
      </div>
      <div className="destination-page">{children}</div>
    </div>
  );
}
