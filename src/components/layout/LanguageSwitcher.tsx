"use client";

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
