import type { UpcomingIp } from "@/lib/catalog";

/**
 * 首页"后续新的 IP"卡片(主 PSD「更多新品,敬请期待」组还原):
 * 整张卡片是一个点阵占位盒(角色形象尚未公开,COMING SOON — TBD),
 * 卡片**内部**左侧为「状态徽章 + IP 名 + 标语」文字块,右侧为
 * 「COMING SOON — TBD」宽字距小字,整体垂直居中。
 * 文案为实时双语文字(2026 首页文案表第 27 行),不烤进图片。
 */
export function UpcomingCard({
  ip,
  inDevelopmentLabel,
  comingSoonLabel,
  locale,
}: {
  ip: UpcomingIp;
  inDevelopmentLabel: string;
  comingSoonLabel: string;
  locale: string;
}) {
  const name = locale === "zh" ? ip.name.zh : ip.name.en;
  const tagline = locale === "zh" ? ip.tagline.zh : ip.tagline.en;

  return (
    // PSD 单卡比例 1597×989(≈1.6:1);移动端略增高避免文字拥挤
    <div className="media-placeholder aspect-[4/3] rounded-block sm:aspect-[1597/989]">
      <div className="relative z-10 flex h-full w-full items-center justify-between gap-4 p-6 md:p-10">
        {/* 左:状态徽章 + IP 名 + 标语(垂直居中于卡片左侧) */}
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-[var(--tracking-14)] text-cream">
            {inDevelopmentLabel}
          </span>
          <h3 className="mt-4 font-display text-2xl font-semibold uppercase tracking-tight md:text-3xl">
            {name}
          </h3>
          <p className="mt-2 text-sm text-ink-soft">{tagline}</p>
        </div>
        {/* 右:COMING SOON — TBD(宽字距小字,窄屏省略避免挤压左侧文案) */}
        <p className="hidden shrink-0 text-[11px] uppercase tracking-[var(--tracking-18)] text-ink-muted sm:block">
          {comingSoonLabel}
        </p>
      </div>
    </div>
  );
}
