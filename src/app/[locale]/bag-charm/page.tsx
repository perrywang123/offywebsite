import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { teaserSeries } from "@/lib/catalog";
import { Reveal } from "@/components/Reveal";
import { TeaserProductGrid } from "./TeaserProductGrid";

/**
 * 时尚包挂系列预告详情页(更多新品.psd 还原):
 * Hero = 超大英文标题两行「FashionableBag / Charm Collection」
 *   + 左方形玩偶图(hero-left 1888×1888)+ 右竖图(hero-right 1308×1744);
 * 标题区「时尚包挂系列 / 更多都市精灵，敬请期待」;
 * 下方 6 款包挂产品卡(PSD 提取图,WCOFFY-XXX01-06 + 点击查看)。
 * 移动端:左右双图改为上下排布。
 */
export default async function BagCharmTeaserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const [titleLine1, ...titleRest] = teaserSeries.titleEn.split(" ");
  const titleLine2 = titleRest.join(" ");
  const seriesName = locale === "zh" ? teaserSeries.name.zh : teaserSeries.name.en;

  return (
    <>
      {/* ============ Hero:超大标题 + 左方形图 / 右竖图(移动端上下排布) ============ */}
      <section className="container-site pt-[calc(var(--header-h)+2.5rem)]">
        <Reveal>
          <h1 className="font-display text-[clamp(30px,4.2vw,60px)] font-extrabold uppercase leading-[1.02] tracking-tight">
            {titleLine1}
            <br />
            {titleLine2}
          </h1>
        </Reveal>
        {/* 移动端:flex-col 上下全宽堆叠;桌面端:flex-row,两图均用显式百分比宽度
            (左 62% 方形 → 高度=62%容器宽;右按真实比例 608:1496 反算得 25%宽,
            使其渲染高度与左图一致,不再撑高/压扁——避免 flex 自动拉伸宽度
            在 Next Image fill 绝对定位场景下不生效的问题)。 */}
        <div className="mt-10 flex flex-col gap-4 md:flex-row lg:gap-6">
          {/* 左:方形玩偶图(PSD 1888×1888,近似居中,object-cover 安全) */}
          <Reveal
            variant="left"
            className="relative aspect-square w-full overflow-hidden rounded-card bg-cream-deep md:w-[62%]"
          >
            <Image
              src={teaserSeries.heroLeft}
              alt={`${seriesName} — 1`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 62vw"
              className="object-cover"
            />
          </Reveal>
          {/* 右:竖图(原图层边界有大片留白,已裁至真实内容区 608×1496≈0.41;
              25% 宽 ÷ 0.4064 比例 ≈ 62%,与左图渲染高度一致) */}
          <Reveal
            variant="right"
            className="relative aspect-[608/1496] w-full overflow-hidden rounded-card bg-cream-deep md:w-[25%]"
          >
            <Image
              src={teaserSeries.heroRight}
              alt={`${seriesName} — 2`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 25vw"
              className="object-cover"
            />
          </Reveal>
        </div>
      </section>

      {/* ============ 标题区 ============ */}
      <section className="container-site pt-14">
        <Reveal>
          <h2 className="text-xl font-bold text-ink">{seriesName}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t("comingSub")}</p>
        </Reveal>
      </section>

      {/* ============ 预告产品卡(6 款,悬停/点击"点击查看"弹出半透明大图浮窗,
           不跳转页面) ============
           PSD 各商品图原始比例差异较大(0.75~1.14,方形/竖图混合),卡片统一按
           PSD 矩形8 比例(877:1078)留框,图片用 object-contain 完整展示不裁切。 */}
      <section className="container-site py-12">
        <TeaserProductGrid
          items={teaserSeries.items}
          viewDetailLabel={t("viewDetail")}
          closeLabel={t("quickViewClose")}
          quickViewLabel={t("quickViewLabel")}
        />
      </section>
    </>
  );
}
