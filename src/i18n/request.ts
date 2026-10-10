import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // 固定时区。不配的话 next-intl 会在服务端与客户端各按自己的时区格式化日期,
    // 两边结果不一致 → React hydration mismatch,而且**只在线上出**(本地开发
    // 服务端和浏览器往往同区)。构建日志里会出现一条 ENVIRONMENT_FALLBACK,
    // 长得像 Error 但其实不中断构建,很容易被忽略。
    // 选 UTC 而不是某个具体城市:这是一个面向全球发货的店,没有任何理由把
    // 日期锚在上海或洛杉矶;UTC 是中立且不会随夏令时漂移的那个。
    timeZone: "UTC",
  };
});
