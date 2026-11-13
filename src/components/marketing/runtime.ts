"use client";
import {
  cleanSource,
  internalMetaSource,
  browserMetaEvent,
  checkoutObservation,
  dataSchema,
  eventSchema,
  marketingAllowed,
  productData,
  type MetaName,
  type MetaProduct,
} from "@/lib/meta/events";
import type { z } from "zod";
import { createObservationDelivery } from "./delivery";
export interface MetaPublicConfig {
  enabled: boolean;
  pixelId: string;
  catalogIds: Record<string, string>;
  pixelScript?: string;
}
type Pixel = ((...args: unknown[]) => void) & {
  queue?: unknown[][];
  callMethod?: (...args: unknown[]) => void;
  push?: Pixel;
  loaded?: boolean;
  version?: string;
};
declare global {
  interface Window {
    fbq?: Pixel;
    _fbq?: Pixel;
  }
}
let config: MetaPublicConfig = { enabled: false, pixelId: "", catalogIds: {} };
let initialized = "",
  wasAllowed = false,
  pixelSuppressed = false;
const knownProducts = new Map<string, MetaProduct>();
const STORAGE = "offy.meta.v1";
type StoredContext = {
  id: string;
  expires: number;
  source: ReturnType<typeof cleanSource>;
  fbc?: string;
};
let memoryContext: StoredContext | undefined,
  storageUnavailable = false;
export function metaAllowed() {
  try {
    return (
      config.enabled &&
      typeof window !== "undefined" &&
      marketingAllowed(
        window.Shopify?.customerPrivacy,
        (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true,
      )
    );
  } catch {
    return false;
  }
}
function readContext() {
  let value: StoredContext | undefined;
  try {
    value = JSON.parse(localStorage.getItem(STORAGE) ?? "null");
    if (!value && storageUnavailable) value = memoryContext;
  } catch {
    value = memoryContext;
  }
  return value &&
    Number.isFinite(value.expires) &&
    value.expires >= Date.now() &&
    /^[a-f0-9-]{36}$/i.test(value.id)
    ? value
    : undefined;
}
const observationDelivery = createObservationDelivery(
  (id) => metaAllowed() && readContext()?.id === id,
);
function context(search = location.search) {
  const value = readContext() ?? {
    id: crypto.randomUUID(),
    expires: Date.now() + 30 * 86400000,
    source: {},
  };
  const query = new URLSearchParams(search),
    source = cleanSource(search),
    click = query.get("fbclid");
  if (click && /^[A-Za-z0-9_-]{1,400}$/.test(click)) {
    // Keep the original capture time when client navigation preserves this query.
    if (!value.fbc?.endsWith("." + click)) {
      value.fbc = `fb.1.${Date.now()}.${click}`;
    }
  }
  // These are the last recorded labels, not proof of which ad owns a later click.
  if (Object.keys(source).length) value.source = source;
  try {
    localStorage.setItem(STORAGE, JSON.stringify(value));
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
  }
  memoryContext = value;
  return value;
}
function cookie(name: string) {
  return document.cookie
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + "="))
    ?.slice(name.length + 1);
}
function loadPixel() {
  if (initialized === config.pixelId) return;
  if (!window.fbq) {
    const fbq: Pixel = (...args) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    };
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq ??= fbq;
  }
  window.fbq("consent", "grant");
  window.fbq("init", config.pixelId);
  if (!document.getElementById("offy-meta-pixel")) {
    const script = document.createElement("script");
    script.id = "offy-meta-pixel";
    script.async = true;
    script.src = config.pixelScript ?? "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  initialized = config.pixelId;
}
export function checkMetaConsent(search?: string) {
  const allowed = metaAllowed();
  if (!allowed) observationDelivery.cancel();
  let deniedWithStoredIdentity = false;
  try {
    const privacy = window.Shopify?.customerPrivacy;
    deniedWithStoredIdentity =
      !!privacy &&
      privacy.consentStatus !== "loading" &&
      typeof privacy.marketingAllowed === "function" &&
      !marketingAllowed(
        privacy,
        (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true,
      ) &&
      !!localStorage.getItem(STORAGE);
  } catch {
    /* unknown permission/storage state remains fail-closed */
  }
  if (!allowed && (wasAllowed || deniedWithStoredIdentity)) {
    let old = memoryContext;
    try {
      old = JSON.parse(localStorage.getItem(STORAGE) ?? "null") ?? old;
    } catch {
      /* use memory context */
    }
    try {
      if (old?.id)
        void fetch("/api/meta/events", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId: old.id }),
          keepalive: true,
        }).catch(() => {});
    } catch {
      /* optional deletion request */
    }
    try {
      localStorage.removeItem(STORAGE);
    } catch {
      /* storage unavailable */
    }
    memoryContext = undefined;
    storageUnavailable = false;
    try {
      for (const name of ["_fbp", "_fbc"]) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${location.hostname}; SameSite=Lax`;
      }
      window.fbq?.("consent", "revoke");
    } catch {
      /* consent withdrawal never blocks shopping */
    }
  }
  const newlyAllowed = allowed && !wasAllowed;
  wasAllowed = allowed;
  if (allowed) {
    try {
      if (internalMetaSource(context(search).source)) {
        if (!pixelSuppressed) window.fbq?.("consent", "revoke");
        pixelSuppressed = true;
      } else {
        loadPixel();
        if (newlyAllowed || pixelSuppressed) window.fbq?.("consent", "grant");
        pixelSuppressed = false;
      }
    } catch {
      /* observation still works */
    }
  }
  if (newlyAllowed) document.dispatchEvent(new Event("offy:meta-ready"));
  return allowed;
}
export function configureMeta(value: MetaPublicConfig, search?: string) {
  config = value;
  checkMetaConsent(search);
}
export function registerMetaProducts(items: MetaProduct[]) {
  for (const item of items) knownProducts.set(item.code, item);
}
export function metaCartData(items: { code: string; quantity: number }[]) {
  return productData(
    items.map((item) => ({ ...knownProducts.get(item.code), ...item })),
    config.catalogIds,
  );
}
/** Passed with the existing checkout request so departure cannot drop the local observation. */
export function checkoutMarketingContext(
  data: z.infer<typeof dataSchema> | (() => z.infer<typeof dataSchema>),
) {
  try {
    if (!metaAllowed()) return;
    const saved = context();
    const fbc = saved.fbc ?? cookie("_fbc"),
      at = Number(fbc?.split(".")[2]);
    return {
      visitorId: saved.id,
      source: saved.source,
      pagePath: location.pathname,
      data: typeof data === "function" ? data() : data,
      fbp: cookie("_fbp"),
      fbc: at >= Date.now() - 30 * 86400000 && at <= Date.now() + 300000 ? fbc : undefined,
    };
  } catch {
    return;
  }
}
export function observeMeta(
  name: MetaName,
  data: z.infer<typeof dataSchema>,
  checkoutReceipt?: string,
) {
  try {
    if (
      !checkMetaConsent() ||
      (/^\/(?:admin|api|checkout)(?:\/|$)/.test(location.pathname) &&
        !(checkoutObservation(name) && location.pathname === "/checkout"))
    )
      return;
    const saved = context(),
      eventId = crypto.randomUUID();
    let attempted = false;
    try {
      if (browserMetaEvent(name) && !internalMetaSource(saved.source)) {
        window.fbq?.("trackSingle", config.pixelId, name, data, { eventID: eventId });
        attempted = !!window.fbq;
      }
    } catch {
      /* blocked script */
    }
    const matchCookie = (value?: string) =>
      value && /^fb\.\d+\.\d+\.[A-Za-z0-9_-]+$/.test(value) ? value : undefined;
    const fbc = matchCookie(saved.fbc ?? cookie("_fbc"));
    const clickAt = Number(fbc?.split(".")[2]);
    const input = eventSchema.parse({
      eventId,
      visitorId: saved.id,
      name,
      occurredAt: Date.now(),
      pagePath: location.pathname,
      source: saved.source,
      data,
      consent: true,
      fbp: matchCookie(cookie("_fbp")),
      fbc:
        clickAt >= Date.now() - 30 * 86400000 && clickAt <= Date.now() + 300000 ? fbc : undefined,
      checkoutReceipt,
      pixelAttempted: attempted,
    });
    observationDelivery.send(input);
    return eventId;
  } catch {
    return;
  }
}
