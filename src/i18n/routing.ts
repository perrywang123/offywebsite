import { defineRouting } from "next-intl/routing";

/**
 * 路由配置 —— 站点当前**对外英文单语**。
 *
 * 中文不是"被拦截",而是**根本不在路由表里**:`locales` 只有 `en`,next-intl
 * 因此不会生成任何 `/zh` 地址,页面在结构上就不可达(拦截是在可达的基础上加
 * 过滤,容易漏;不进路由表则不可能被访问)。与之配套:
 *
 *  · `localePrefix: "as-needed"` —— 默认语言(en)的公开 URL 不带前缀:
 *    `/products` 就是英文页,不再有 `/en/products`。
 *  · 历史链接不产生死链:`/en/*` 由 next-intl 自己 307 收敛到无前缀地址,
 *    `/zh/*` 由 [`middleware.ts`](src/middleware.ts) 显式 308 收敛(否则它会 404)。
 *  · `messages/zh.json` 与各页面的 `isZh` / `locale === "zh"` 分支**刻意保留**,
 *    它们现在只是永不执行的死代码(不是遗漏);`dictionaries.test.ts` 仍要求
 *    两份字典 key 完全一致。
 *  · 语言切换按钮已从 `Header.tsx` / `MobileNav.tsx` 摘掉,组件文件保留。
 *
 * **恢复中文(两步):**
 *   1. 把 `"zh"` 加回下面的 `locales`;
 *   2. 把 `<LanguageSwitcher />` 加回 `Header.tsx`(桌面端)与 `MobileNav.tsx`
 *      (移动抽屉),并恢复两处的 import。
 * 其余代码(canonical / hreflang / sitemap / publicPath)都由本文件推导,无需再改。
 */
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

/**
 * `localePrefix` 既可能是模式字符串(`"as-needed"`),也可能是 `{ mode }` 配置对象。
 * 在这里归一成模式字符串,顺带把类型放宽成 `string`,避免 TS 认为
 * `routing.localePrefix === "always"` 是"永不成立"的比较。
 */
const localePrefixMode: string =
  typeof routing.localePrefix === "string"
    ? routing.localePrefix
    : (routing.localePrefix?.mode ?? "always");

/** 默认语言在公开 URL 里是否带前缀(`as-needed` / `never` 下不带)。 */
const defaultLocaleIsPrefixed = localePrefixMode === "always";

/**
 * 把「页面内部路径」格式化成某个 locale 的**对外公开路径**
 * (canonical / hreflang / sitemap / 服务端跳转用)。
 *
 * 不直接用 next-intl 的 `getPathname`:`next-intl/navigation` 的 react-server
 * 构建里没有这个函数,服务端组件取到的是 `undefined`。
 */
export function publicPath(locale: string, path = "/"): string {
  const suffix = path === "" || path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  const prefixed = defaultLocaleIsPrefixed || locale !== routing.defaultLocale;
  return prefixed ? `/${locale}${suffix}` : suffix || "/";
}
