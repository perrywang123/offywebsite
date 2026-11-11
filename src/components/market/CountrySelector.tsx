"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/components/cart/CartProvider";
import { marketCountryName } from "@/lib/market";
import { useOptionalMarket } from "./MarketProvider";

export function CountryTrigger({
  variant = "header",
  onOpen,
}: {
  variant?: "header" | "bag" | "menu";
  onOpen?: () => void;
}) {
  const market = useOptionalMarket();
  if (!market) return null;
  const name = marketCountryName(market.state.country);
  const currency = market.state.countries?.find((c) => c.code === market.state.country)?.currency;
  return (
    <button
      type="button"
      className={`destination-trigger destination-trigger--${variant}`}
      aria-label={`Ship to ${name}${currency ? ` · ${currency}` : ""}`}
      aria-haspopup="dialog"
      disabled={market.resolving}
      aria-busy={market.resolving}
      onClick={() => {
        onOpen?.();
        market.show();
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      >
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </svg>
      <span>
        <span className="destination-trigger-prefix">Ship to </span>
        <span className="destination-trigger-short">
          {market.state.country === "GB" ? "UK" : market.state.country}
        </span>
        <span className="destination-trigger-long">
          {name}
          {currency ? ` · ${currency}` : ""}
        </span>
      </span>
      <span aria-hidden="true">⌄</span>
    </button>
  );
}
export function CountrySelector() {
  const market = useOptionalMarket();
  if (!market?.open) return null;
  return createPortal(<DestinationPanel />, document.body);
}
function DestinationPanel() {
  const market = useOptionalMarket()!;
  const { state, saving, error, close, loadCountries, save } = market;
  const { count } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(state.country);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  useEffect(() => {
    if (!state.countries) void loadCountries();
  }, [state.countries, loadCountries]);
  const options =
    state.countries?.filter((c) =>
      `${c.name} ${c.code} ${c.currency}`.toLowerCase().includes(search.trim().toLowerCase()),
    ) ?? [];
  const currentValid = state.countries?.some((c) => c.code === selected) ?? false;
  const changed = selected !== state.country;
  const helper =
    state.source === "manual"
      ? "Your saved destination. Change it whenever you need."
      : state.source === "default"
        ? "We couldn’t detect your location, so we’ve selected the United States."
        : state.source === "timezone" || state.source === "language"
          ? "Suggested from your browser settings. Please check your destination."
          : "Suggested from your location. Please check your destination.";
  return (
    <dialog
      ref={ref}
      className="destination-dialog"
      aria-labelledby="destination-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="destination-panel">
        <header className="destination-heading">
          <div>
            <p className="destination-eyebrow">A LITTLE OFFY, ANYWHERE</p>
            <h2 id="destination-title" tabIndex={-1} autoFocus>
              Where are we shipping?
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close destination selector"
            onClick={close}
            disabled={saving}
            className="destination-close"
          >
            ✕
          </button>
        </header>
        <p className="destination-helper">{helper}</p>
        <label className="destination-search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search destinations"
            aria-label="Search destinations"
            disabled={saving}
          />
        </label>
        <div
          className="destination-options"
          role="radiogroup"
          aria-label="Shipping destination"
          aria-busy={!state.countries && !error}
        >
          {!state.countries && !error && (
            <p role="status" className="destination-empty">
              Loading destinations…
            </p>
          )}
          {options.map((c) => (
            <label key={c.code} className="destination-option" data-selected={c.code === selected}>
              <input
                type="radio"
                name="shipping-destination"
                value={c.code}
                checked={c.code === selected}
                onChange={() => setSelected(c.code)}
                disabled={saving}
              />
              <span className="destination-check" aria-hidden="true">
                {c.code === selected ? "✓" : ""}
              </span>
              <span>{c.name}</span>
              <span className="destination-currency">{c.currency}</span>
            </label>
          ))}
          {state.countries && !options.length && (
            <p className="destination-empty">No destinations found. Try another search.</p>
          )}
        </div>
        {error && (
          <div className="destination-error" role="alert">
            <p>{error}</p>
            {!state.countries && (
              <button type="button" onClick={() => void loadCountries()}>
                Try again
              </button>
            )}
          </div>
        )}
        <footer className="destination-footer">
          <p>
            {count > 0 && changed
              ? "Prices and availability may change. We’ll keep your OFFYs in your bag for review."
              : "Shop in your destination’s currency. Final shipping and taxes are confirmed at checkout."}
          </p>
          <button
            type="button"
            className="destination-confirm"
            disabled={saving || !currentValid}
            aria-busy={saving}
            onClick={() => {
              if (!changed && state.source === "manual") close();
              else void save(selected, count > 0 && changed);
            }}
          >
            {saving
              ? "Updating destination…"
              : count > 0 && changed
                ? "Switch & review bag"
                : "Confirm destination"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
