const zero = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "UYI",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);
const three = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);
const supported = new Set([
  "USD",
  "EUR",
  "GBP",
  "HKD",
  "SGD",
  "CNY",
  "AUD",
  "CAD",
  "NZD",
  "CHF",
  "AED",
  "SAR",
  "QAR",
  "MYR",
  "THB",
  "IDR",
  "PHP",
  "INR",
  "TWD",
  "ZAR",
  "BRL",
  "MXN",
  "PLN",
  "CZK",
  "DKK",
  "SEK",
  "NOK",
  "HUF",
  "RON",
  "TRY",
  "ILS",
  "EGP",
  "PKR",
  "BDT",
  "NGN",
  "KES",
  "MAD",
  "COP",
  "PEN",
  "UYU",
  "RSD",
  "UAH",
  "GEL",
  "KZT",
  ...zero,
  ...three,
]);
export function exponent(currency: string) {
  if (!supported.has(currency)) throw new Error("unsupported_currency");
  return zero.has(currency) ? 0 : three.has(currency) ? 3 : 2;
}
export function minor(amount: string, currency: string): number {
  const exp = exponent(currency);
  if (!/^\d+(?:\.\d+)?$/.test(amount)) throw new Error("invalid_money");
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.slice(exp).replace(/0/g, "")) throw new Error("money_precision");
  const n =
    BigInt(whole) * BigInt(10) ** BigInt(exp) +
    BigInt(fraction.slice(0, exp).padEnd(exp, "0") || "0");
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("money_overflow");
  return Number(n);
}
export function rateBps(value: string): number {
  if (!/^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(value)) throw new Error("invalid_rate");
  const rate = minor(value, "USD");
  if (rate > 10000) throw new Error("invalid_rate");
  return rate;
}
export function commission(net: number, bps: number): number {
  if (!Number.isSafeInteger(net) || net < 0 || !Number.isInteger(bps) || bps < 0 || bps > 10000)
    throw new Error("invalid_commission");
  return Number((BigInt(net) * BigInt(bps) + BigInt(5000)) / BigInt(10000));
}
export function decimal(amount: number, currency: string): string {
  const exp = exponent(currency),
    sign = amount < 0 ? "-" : "",
    s = String(Math.abs(amount)).padStart(exp + 1, "0");
  return sign + (exp ? `${s.slice(0, -exp)}.${s.slice(-exp)}` : s);
}
export function csvCell(value: string): string {
  const safe = /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
