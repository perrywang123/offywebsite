import Image from "next/image";
import type { UpcomingIp } from "@/lib/catalog";

/**
 * 首页"后续新的 IP"卡片:裁切后不含烤字的插图(上) + 实时文字(下)。
 * 原卡片图(upcoming-kitty.png / upcoming-psyche.png)把标题/状态/标语直接烤进
 * 像素,无法跟随语言切换,也追溯到源 PSD 确认是单层扁平化导出、没有可分离的
 * 文字子层——这里改用只保留插画部分的裁图(art,顶部 ~33% 高度区域,已
 * OCR 校验无文字残留)+ 组件渲染的实时双语文字,随 locale 切换且可随时改文案。
 */
export function UpcomingCard({
  ip,
  inDevelopmentLabel,
  locale,
}: {
  ip: UpcomingIp;
  inDevelopmentLabel: string;
  locale: string;
}) {
  const name = locale === "zh" ? ip.name.zh : ip.name.en;
  const tagline = locale === "zh" ? ip.tagline.zh : ip.tagline.en;

  return (
    <div className="overflow-hidden rounded-block bg-cream-deep">
      <div className="relative aspect-[1597/326] w-full">
        <Image
          src={ip.art}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      <div className="p-6 md:p-8">
        <span className="inline-block rounded-full bg-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-[var(--tracking-14)] text-cream">
          {inDevelopmentLabel}
        </span>
        <h3 className="mt-4 font-display text-2xl font-semibold uppercase tracking-tight">{name}</h3>
        <p className="mt-2 text-sm text-ink-soft">{tagline}</p>
      </div>
    </div>
  );
}
