import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * `/zh/...` 的历史链接兜底。
 *
 * 中文已从 [`routing.locales`](src/i18n/routing.ts) 移除,next-intl 不认识 `/zh`
 * 这个前缀,会把 `/zh/products` 当成普通路径段转发到内部 `/en/zh/products`
 * —— 结果是 404。但外部(搜索索引、别人分享过的链接)可能已经存在带 `/zh`
 * 的地址,所以这里先把它 308 收敛到**去掉前缀的同一路径**:
 *   `/zh` → `/`、`/zh/products` → `/products`、`/zh/products?x=1` → `/products?x=1`
 * 既不留死链,也不会让用户进到中文页面(落点是英文页,见 routing.ts 的 locale 列表)。
 *
 * 用 308 而不是 307:这是永久性的 URL 变更,权重与浏览器缓存都该交给新地址。
 */
function redirectZhPrefix(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname !== "/zh" && !pathname.startsWith("/zh/")) return null;

  // 只复制 pathname 与原有 query(`clone()` 已带上 search),不引入新参数。
  const url = request.nextUrl.clone();
  const stripped = pathname.slice("/zh".length);
  url.pathname = stripped === "" ? "/" : stripped;
  return NextResponse.redirect(url, 308);
}

export default function middleware(request: NextRequest) {
  // 先处理历史 `/zh` 前缀,再交给 next-intl(它会 rewrite `/products` → `/en/products`,
  // 并把 `/en/products` 307 收敛到 `/products`)。
  return redirectZhPrefix(request) ?? intlMiddleware(request);
}

export const config = {
  // Match all pathnames except API routes, static files, and internal assets.
  matcher: ["/((?!api|_next|_vercel|assets|.*\\..*).*)"],
};
