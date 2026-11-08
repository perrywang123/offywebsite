"use client";
import {
  cleanSource,
  dataSchema,
  eventSchema,
  marketingAllowed,
  productData,
  type MetaName,
  type MetaProduct,
} from "@/lib/meta/events";
import type { z } from "zod";
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
  wasAllowed = false;
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
function context() {
  let value: StoredContext | undefined;
  try {
    value = JSON.parse(localStorage.getItem(STORAGE) ?? "null");
    if (!value && storageUnavailable) value = memoryContext;
  } catch {
    value = memoryContext;
  }
  if (!value || value.expires < Date.now() || !/^[a-f0-9-]{36}$/i.test(value.id))
    value = { id: crypto.randomUUID(), expires: Date.now() + 30 * 86400000, source: {} };
  const query = new URLSearchParams(location.search),
    source = cleanSource(location.search),
    click = query.get("fbclid");
  if (click && /^[A-Za-z0-9_-]{1,400}$/.test(click)) {
    // Keep the original capture time when client navigation preserves this query.
    if (!value.fbc?.endsWith("." + click)) value.fbc = `fb.1.${Date.now()}.${click}`;
    value.source = source;
  } else if (Object.keys(source).length) value.source = source;
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
export function checkMetaConsent() {
  const allowed = metaAllowed();
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
      loadPixel();
      if (newlyAllowed) window.fbq?.("consent", "grant");
    } catch {
      /* observation still works */
    }
  }
  if (newlyAllowed) document.dispatchEvent(new Event("offy:meta-ready"));
  return allowed;
}
export function configureMeta(value: MetaPublicConfig) {
  config = value;
  checkMetaConsent();
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
export function observeMeta(
  name: MetaName,
  data: z.infer<typeof dataSchema>,
  checkoutReceipt?: string,
) {
  try {
    if (
      !checkMetaConsent() ||
      (/^\/(?:admin|api|checkout)(?:\/|$)/.test(location.pathname) &&
        !(name === "InitiateCheckout" && location.pathname === "/checkout"))
    )
      return;
    const saved = context(),
      eventId = crypto.randomUUID();
    let attempted = false;
    try {
      window.fbq?.("trackSingle", config.pixelId, name, data, { eventID: eventId });
      attempted = !!window.fbq;
    } catch {
      /* blocked script */
    }
    const matchCookie = (value?: string) =>
      value && /^fb\.\d+\.\d+\.[A-Za-z0-9_-]+$/.test(value) ? value : undefined;
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
      fbc: matchCookie(saved.fbc ?? cookie("_fbc")),
      checkoutReceipt,
      pixelAttempted: attempted,
    });
    void fetch("/api/meta/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
      signal: AbortSignal.timeout(4000),
    }).catch(() => {});
    return eventId;
  } catch {
    return;
  }
}
