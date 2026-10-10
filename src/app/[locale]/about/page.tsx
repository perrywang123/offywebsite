import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { upcomingIps, collabLooks } from "@/lib/catalog";
import { Reveal } from "@/components/Reveal";
import { UpcomingCard } from "@/components/home/UpcomingCard";

/**
 * 品牌故事页 —— 按 OUR STORY 表(`副本独立站首页文案 (1).xlsx` → `OUR STORY`)改版:
 *
 *   row 3 页首:主标语换成 "Meet Who You Love to Be",原标语降为副行(about.tagline)
 *   row 4 正文:Where She Came From 下由 3 段换成 12 段品牌叙事(about.storyParagraphs 数组)
 *   row 5 删掉黑色「创作团队」条(JIE / 桃子)
 *   row 6 删掉「零售网络 Stockists」区块
 *   row 7 后续计划:换成首页那块(NEW IPS AHEAD + UpcomingCard),文案复用 home 命名空间
 *
 * 删掉两块之后的版面重排:起源 section 的纵向留白由 py-16 提到 py-20 —— 它现在承载全页
 * 主要正文,且下方不再紧挨那个黑色色块;两栏由 items-center 改 items-start,让变长的正文
 * 与图集顶部对齐(否则图集会被垂直居中,顶部拖出一条空白)。剩余顺序(故事 → 新 IP →
 * 定制 CTA)保持「讲完来处 → 看接下来 → 谈合作」的递进,不再插别的板块。
 */
export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("about");
  // 后续计划直接复用首页文案(home.comingTitle / comingSub / inDevelopment):
  // 同一个模块不维护两份文案,中文站也照首页现状显示英文标题。
  const tHome = await getTranslations("home");
  // 正文用数组而不是 storyP1..P12:文案表一行一段,段落增减只动 JSON,不动组件。
  const storyParagraphs = t.raw("storyParagraphs") as string[];

  return (
    <div>
      {/* 页首:主标语 + 副行(原主标语 Imagine with Love. Create with Companion. 降为副行) */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-8">
        <Reveal>
          <p className="kicker mb-5">{t("storyKicker")}</p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            {t("title")}
          </h1>
          <p className="lede mt-6">{t("tagline")}</p>
        </Reveal>
      </section>

      {/* 起源:图集 + Where She Came From + 12 段正文(文案表 row 4) */}
      <section className="mx-auto grid max-w-7xl items-start gap-12 px-6 py-20 md:grid-cols-2 lg:px-8">
        <Reveal variant="left">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm" data-slot="story-image">
            <div className="absolute inset-0 overflow-hidden rounded-card bg-paper shadow-card">
              <Image src="/assets/news/news-01.jpg" alt="is.offy" fill sizes="(max-width:768px) 90vw, 40vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-2/5 overflow-hidden rounded-soft bg-paper shadow-card">
              <div className="relative aspect-[3/4]">
                <Image src="/assets/news/news-05.jpg" alt="is.offy" fill sizes="20vw" className="object-cover" />
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal variant="right">
          <h2 className="mb-6 font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("storyHeading")}</h2>
          {/* 末段用 brown-600 强调:沿用改版前 storyP3 的收尾处理 */}
          {storyParagraphs.map((paragraph, index) => (
            <p
              key={paragraph}
              className={index === storyParagraphs.length - 1 ? "mt-5 text-lg font-medium text-brown-600" : "lede mb-4"}
            >
              {paragraph}
            </p>
          ))}
        </Reveal>
      </section>

      {/* 后续计划(文案表 row 7:换成首页那块 —— NEW IPS AHEAD + 角色插画卡) */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <Reveal className="mb-10">
          <h2 className="font-display text-3xl font-semibold uppercase tracking-tight md:text-4xl">
            {tHome("comingTitle")}
          </h2>
          <p className="mt-3 text-ink-soft">{tHome("comingSub")}</p>
        </Reveal>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {upcomingIps.map((ip) => (
            <Reveal key={ip.code}>
              <UpcomingCard ip={ip} inDevelopmentLabel={tHome("inDevelopment")} locale={locale} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* 定制 CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center lg:px-8">
        <Reveal>
          <p className="kicker mb-3">{t("customKicker")}</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("customHeading")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-soft">{t("customBody")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {collabLooks.map((code) => (
              <span key={code} className="rounded-full border border-sand px-3 py-1 text-xs uppercase tracking-[var(--tracking-12)] text-ink-soft">
                {code}
              </span>
            ))}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
