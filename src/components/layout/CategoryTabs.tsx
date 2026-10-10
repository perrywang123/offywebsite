"use client";

import { useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import type { Series } from "@/lib/catalog";

/**
 * Scroll-following category tab bar (dogguo-style): a horizontally scrollable
 * list of category links that sticks below the fixed header while scrolling.
 * The active category renders bold with `aria-current="page"`.
 *
 * 客户端组件:只有一个生命周期副作用(把当前分类滚进视野)。导航本身仍是
 * 普通 Link,服务端渲染的内容不变。
 */
export function CategoryTabs({
  series,
  active,
  locale,
}: {
  series: Series[];
  active?: string;
  locale: string;
}) {
  const allLabel = locale === "zh" ? "全部" : "All";
  const listRef = useRef<HTMLDivElement>(null);

  // 窄屏下当前分类常常在横滑条右边看不见(例如第 5 个系列),顾客就失去了
  // "我在哪一类"的唯一提示。这里只在横向把当前项居中:**必须显式
  // `block:"nearest"`**,否则 inline 滚动会连页面纵向一起滚走(方案 R15)。
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || typeof el.scrollIntoView !== "function") return;
    el.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active, series.length]);

  return (
    <div
      role="tablist"
      aria-label={locale === "zh" ? "分类" : "Categories"}
      className="border-cream-line bg-cream/90 sticky top-[var(--header-h)] z-30 border-b backdrop-blur-md"
    >
      {/* `.hscroll` 提供横滑 + 吸附 + 隐藏滚动条 + 窄屏两端渐隐(见 globals.css);
          保留 items-center / py-4 以免改变纵向节奏。`lg:min-h-0` 让链接的
          44px 命中区只在 <1024px 生效,桌面端 strip 高度与改动前一致。 */}
      <div ref={listRef} className="hscroll container-site items-center gap-6 py-4">
        <Link
          href="/products"
          aria-current={active === undefined ? "page" : undefined}
          className={`tap-target hover:text-ink text-xs tracking-[var(--tracking-14)] whitespace-nowrap uppercase transition-colors lg:min-h-0 ${
            active === undefined ? "text-ink font-bold" : "text-ink-soft font-medium"
          }`}
        >
          {allLabel}
        </Link>
        {series.map((s) => {
          const isActive = active === s.slug;
          return (
            <Link
              key={s.slug}
              href={`/collections/${s.slug}`}
              aria-current={isActive ? "page" : undefined}
              className={`tap-target hover:text-ink text-xs tracking-[var(--tracking-14)] whitespace-nowrap uppercase transition-colors lg:min-h-0 ${
                isActive ? "text-ink font-bold" : "text-ink-soft font-medium"
              }`}
            >
              {locale === "zh" ? s.name.zh : s.name.en}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
