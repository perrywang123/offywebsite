import { Link } from "@/i18n/navigation";
import type { Series } from "@/lib/catalog";

/**
 * Scroll-following category tab bar (dogguo-style): a horizontally scrollable
 * list of category links that sticks below the fixed header while scrolling.
 * The active category renders bold with `aria-current="page"`.
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

  return (
    <div
      role="tablist"
      aria-label={locale === "zh" ? "分类" : "Categories"}
      className="sticky top-[var(--header-h)] z-30 border-b border-cream-line bg-cream/90 backdrop-blur-md"
    >
      <div className="no-scrollbar container-site flex items-center gap-6 overflow-x-auto py-4">
        <Link
          href="/products"
          aria-current={active === undefined ? "page" : undefined}
          className={`whitespace-nowrap text-xs uppercase tracking-[var(--tracking-14)] transition-colors hover:text-ink ${
            active === undefined ? "font-bold text-ink" : "font-medium text-ink-soft"
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
              className={`whitespace-nowrap text-xs uppercase tracking-[var(--tracking-14)] transition-colors hover:text-ink ${
                isActive ? "font-bold text-ink" : "font-medium text-ink-soft"
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
