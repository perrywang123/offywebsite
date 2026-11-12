export const analyticsMetrics = ["PageView", "ViewContent", "AddToCart", "CheckoutReady"] as const;
export type AnalyticsMetric = (typeof analyticsMetrics)[number];
export type AnalyticsStage = "view" | "content" | "cart" | "checkout" | "paid";
export const analyticsLabels: Record<AnalyticsMetric, string> = {
  PageView: "访问",
  ViewContent: "商品浏览",
  AddToCart: "加购",
  CheckoutReady: "结账准备",
};
export const analyticsColors: Record<AnalyticsMetric | "paid", string> = {
  PageView: "#1d1915",
  ViewContent: "#647c8c",
  AddToCart: "#967454",
  CheckoutReady: "#ad762e",
  paid: "#39725c",
};
export function analyticsPercent(n: number | null, denominator: number, digits = 1) {
  return n === null || denominator <= 0 ? "—" : `${((n / denominator) * 100).toFixed(digits)}%`;
}
