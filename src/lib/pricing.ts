/**
 * 价格格式化(币种感知)。
 *
 * 为什么不能写死 USD:全站价格跟随**访客所在市场**——Shopify Storefront 的
 * `@inContext(country:)` 会让同一个商品在不同国家返回不同币种与金额
 * (实测:US→USD 49.90、GB→GBP 37.90、HK→HKD 369.00、JP/DE→SGD 49.90)。
 * 金额一律以"该币种的最小单位整数"(分)在站内传递,展示时才落到字符串。
 *
 * 数字格式仍按站点语言走:英文 → `en-US`,中文 → `zh-CN`。两者的差异在
 * `Intl.NumberFormat` 里是真实存在的,例如同一笔 CNY 金额在 en-US 下是
 * `CN¥1,234.50`、在 zh-CN 下是 `¥1,234.50`;USD 则是 `$49.90` / `US$49.90`。
 * 让 Intl 自己决定符号与位置,不要去手写 "xx 美元" 这类特例分支。
 */

/** 站点语言 → Intl 数字格式 locale("en" 之外的取值一律按英文站处理)。 */
function numberLocale(locale: string): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}

/**
 * 把"某币种的最小单位整数金额"格式化成该 locale 下的货币字符串。
 *
 * @param cents   最小单位整数金额(USD 分为 49.90 美元 → 4990)。
 * @param currency ISO-4217 代码,如 `"USD"` / `"GBP"` / `"HKD"` / `"SGD"`。
 *                 `Intl` 对大小写不敏感,非法代码会原样回显代码本身而不是抛错。
 * @param locale  站点语言(`"en"` / `"zh"`)。
 */
export function formatPrice(cents: number, currency: string, locale: string = "en"): string {
  return new Intl.NumberFormat(numberLocale(locale), {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

/** Clamp a requested quantity to the allowed checkout range (1–99). */
export function clampQuantity(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(99, Math.max(1, Math.trunc(qty)));
}

/** 购物车里参与小计计算的一行(只要求展示层的三个字段)。 */
export interface PricedLine {
  priceCents: number;
  currency: string;
  quantity: number;
}

export interface CartTotal {
  /** 可加总部分的小计金额(`currency` 的最小单位整数)。 */
  cents: number;
  /** `cents` 的币种。 */
  currency: string;
  /**
   * 是否有行、其币种与 `currency` 不同而**未被计入**小计。
   *
   * 正常情况下不会发生:同一个访客的所有商品价都来自同一个
   * `@inContext(country:)`,所以天然同币种。但"访客市场变了"(例如换了国家、
   * 或部分行的实时价拉取失败回退到本地 USD 快照)就可能混币。此时**绝不**
   * 把不同币种的数字相加(那会得出一个既不是 USD 也不是 GBP 的假金额),
   * 只累加主币种的行,并把 `mixed` 置位让界面给出提示。
   */
  mixed: boolean;
}

/**
 * 把购物车各行按币种汇总。主币种取**第一个出现**的币种(购物袋按加入顺序
 * 渲染,第一行即顾客最先看到的币种)。
 */
export function cartTotal(lines: PricedLine[]): CartTotal {
  if (lines.length === 0) return { cents: 0, currency: "USD", mixed: false };

  const norm = (c: string) => c.trim().toUpperCase() || "USD";
  const currency = norm(lines[0]!.currency);
  let cents = 0;
  let mixed = false;
  for (const line of lines) {
    if (norm(line.currency) !== currency) {
      mixed = true;
      continue;
    }
    cents += line.priceCents * line.quantity;
  }
  return { cents, currency, mixed };
}
