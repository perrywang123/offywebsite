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
      {/* 原来用 `pt-[calc(var(--header-h)+2.5rem)]` 再补一次 header 高度,但 header 是
          sticky(**占文档流**),于是首屏白白多出 144px 空白(方案 #46)。
          版心/节奏统一走 .container-site + .section-y。 */}
      <section className="container-site pt-12 md:pt-16">
        <Reveal>
          {/* 页面 H1 抬到 36px(方案 #54:把小的抬到 36,不是把 About 的 48 压下来);
              `font-extrabold` → `font-semibold`:redesign-02 §2.3 规定标题字重不超 700。
              下限用 9.6vw 而不是写死 36px:标题第一行 `FashionableBag` 是一个 14 字符的
              **不可断词**,36px 下宽 316px;320px 屏的版心只有 288px,写死 36px 会直接
              横向溢出(实测 scrollWidth 332)。9.6vw 在 375px 上正好 36px,更窄才收缩。
              `lg:` 保留改动前的 clamp(30px,4.2vw,60px) —— ≥1024px 的表现一律不变。 */}
          <h1 className="font-display text-[clamp(30px,9.6vw,36px)] leading-[1.02] font-semibold tracking-tight uppercase md:text-5xl lg:text-[clamp(30px,4.2vw,60px)]">
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
            className="rounded-card bg-cream-deep relative aspect-square w-full overflow-hidden md:w-[62%]"
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
              25% 宽 ÷ 0.4064 比例 ≈ 62%,与左图渲染高度一致)。
              窄屏按真实比例反算会得到 343×844px 的一根"高柱"(方案 #45),
              所以窄屏复用左图的方形框,md 起才恢复 608:1496 的竖图比例。 */}
          <Reveal
            variant="right"
            className="rounded-card bg-cream-deep relative aspect-square w-full overflow-hidden md:aspect-[608/1496] md:w-[25%]"
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
      <section className="container-site pt-10 md:pt-14">
        <Reveal>
          <h2 className="text-ink text-xl font-bold">{seriesName}</h2>
          <p className="text-ink-soft mt-1 text-sm">{t("comingSub")}</p>
        </Reveal>
      </section>

      {/* ============ 预告产品卡(6 款,悬停/点击"点击查看"弹出半透明大图浮窗,
           不跳转页面) ============
           PSD 各商品图原始比例差异较大(0.75~1.14,方形/竖图混合),卡片统一按
           PSD 矩形8 比例(877:1078)留框,图片用 object-contain 完整展示不裁切。 */}
      <section className="container-site section-y lg:py-12">
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
