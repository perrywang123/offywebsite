/** 纯函数：币种必须为 USD。 */
export function assertCurrencyUsd(currency: string | undefined): boolean {
  return currency === "USD";
}

/** 纯函数：PayPal 返回金额与本地期望金额做字符串精确比对（不解析回浮点）。 */
export function amountMatches(expectedUsd: string, actualUsd: string | undefined): boolean {
  return actualUsd === expectedUsd;
}

/** 从 PayPal 订单 links 中提取 approve（授权跳转）URL。 */
export function extractApproveUrl(
  links: Array<{ rel: string; href: string }> | undefined,
): string | undefined {
  return links?.find((l) => l.rel === "approve")?.href;
}
