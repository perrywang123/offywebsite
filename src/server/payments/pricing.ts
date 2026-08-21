/** 整数美分 → PayPal 两位小数字符串（USD）。4500 → "45.00"。禁止浮点累加。 */
export function centsToUsdString(cents: number): string {
  return (cents / 100).toFixed(2);
}
