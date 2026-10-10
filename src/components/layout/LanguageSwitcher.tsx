"use client";

/**
 * 语言切换按钮 —— **当前站点对外英文单语,已暂时从导航里摘掉**。
 *
 * `routing.locales` 只剩 `en`(见 src/i18n/routing.ts),切到中文的入口不该存在,
 * 所以 `Header.tsx`(桌面端)与 `MobileNav.tsx`(移动抽屉)都不再渲染本组件。
 * 组件与 `messages/zh.json`、各页面的 `isZh` 分支一并**刻意保留**:
 * **恢复多语言时,把这两处引用加回来即可**(外加把 `"zh"` 加回 routing 的 locales)。
 */

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function toggle() {
    const next = locale === "zh" ? "en" : "zh";
    // @ts-expect-error — pathname from next-intl navigation is typed by the routing config
    router.replace({ pathname, params }, { locale: next });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-10 items-center rounded-full border border-sand bg-paper px-3 text-xs font-semibold text-ink-soft transition-colors hover:border-ink"
    >
      {locale === "zh" ? "EN" : "中文"}
    </button>
  );
}
