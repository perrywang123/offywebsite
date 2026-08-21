import { env } from "../../../lib/env";

export class PayPalError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export interface PayPalCapture {
  id: string;
  status: string;
  amount?: { currency_code?: string; value?: string };
}

export interface PayPalOrder {
  id: string;
  status?: string;
  links?: Array<{ rel: string; href: string }>;
  purchase_units?: Array<{
    reference_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: { captures?: PayPalCapture[] };
  }>;
  payer?: { email_address?: string };
}

export function paypalBaseUrl(): string {
  return env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}
let cache: TokenCache | null = null;

export async function getAccessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now + 60_000) return cache.accessToken;

  const res = await fetchImpl(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new PayPalError("token_request_failed", res.status);

  const json = (await res.json()) as { access_token: string; expires_in?: number };
  const expiresIn = (json.expires_in ?? 32400) - 60;
  cache = { accessToken: json.access_token, expiresAt: now + expiresIn * 1000 };
  return cache.accessToken;
}

async function request(
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const token = await getAccessToken(fetchImpl);
  const res = await fetchImpl(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new PayPalError(`paypal_${init.method}_failed`, res.status);
  }
  return res.json();
}

export async function createOrder(
  payload: unknown,
  requestId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PayPalOrder> {
  return (await request(
    "/v2/checkout/orders",
    {
      method: "POST",
      headers: { "PayPal-Request-Id": requestId },
      body: JSON.stringify(payload),
    },
    fetchImpl,
  )) as PayPalOrder;
}

export async function getOrder(orderId: string, fetchImpl: typeof fetch = fetch): Promise<PayPalOrder> {
  return (await request(`/v2/checkout/orders/${orderId}`, { method: "GET" }, fetchImpl)) as PayPalOrder;
}

export async function captureOrder(
  orderId: string,
  requestId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PayPalOrder> {
  return (await request(
    `/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: { "PayPal-Request-Id": requestId },
      body: "{}",
    },
    fetchImpl,
  )) as PayPalOrder;
}

export async function voidOrder(orderId: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  await request(`/v2/checkout/orders/${orderId}/void`, { method: "POST", body: "{}" }, fetchImpl);
}
