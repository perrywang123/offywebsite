import type { Metadata } from "next";
import { publicPath } from "@/i18n/routing";
import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { faqParts } from "@/lib/faq";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqJsonLd } from "@/lib/seo/jsonld";

/**
 * 常见问题(Q&A)页。
 *
 * 内容来源:`独立站Q&A_审核修订稿——final(2).docx`,见 `src/lib/faq.ts`(脚本从 docx 生成)。
 * 文案只有英文 —— 与政策页同理:这批内容紧邻法务口径(退货/隐私/免责),
 * 不做机翻;中文站顶部给一句语言说明。
 *
 * 展示用原生 `<details>`:10 条长答案全铺开会有 8 千多字符、页面极长,
 * 折叠后先让用户扫问题。用 `<details>` 而不是自研手风琴 —— 零 JS、
 * 键盘与屏幕阅读器原生可用、也不需要给这个页面引入客户端组件。
 *
 * 字号层级由页面元素承担(源 docx 的 26pt 总标题 → h1、15/16pt Part → h2、
 * 14pt 问题 → summary);答案内部只还原源文档的**加粗**与**分段**。
 */
/**
 * 用 `generateMetadata` 而不是静态对象,只为一件事:**canonical**。
 *
 * 静态 `metadata` 拿不到 `locale`(它是模块级常量),于是写不出 `publicPath(locale, ...)`
 * —— 而**不写 canonical 就会继承 layout 的那个(指向首页)** ✗,对 Google 等于
 * 声称"本页是首页的副本",不被独立收录。
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "FAQ",
    description: "Shipping, returns, payment and privacy questions about OFFY orders.",
    alternates: { canonical: publicPath(locale, "/faq") },
  };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("faq");
  const isZh = locale === "zh";

  return (
    <div className="container-site section-y lg:py-20">
      {/* 第 2 批 SEO:FAQPage 富媒体。答案由 FaqBlock[] 拼成纯文本,不输出 <strong>。 */}
      <JsonLd data={faqJsonLd(faqParts)} />
      <header className="mx-auto max-w-[68ch]">
        <p className="kicker mb-4">{t("kicker")}</p>
        {/* 页面 H1 从 28px 抬到 36px(方案 #54:把小的抬上来,而不是把 About 的
            48 压下去)。`md:text-5xl` = 48 与改动前 clamp 的上限一致,所以
            ≥1024px 的计算结果不变。 */}
        <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight md:text-5xl lg:text-[clamp(1.75rem,1.4rem+1.4vw,3rem)]">
          {t("title")}
        </h1>
        <p className="text-ink-soft mt-4">{t("intro")}</p>
      </header>

      {/* 语言说明:仅中文站。与政策页同一个理由与同一套样式。 */}
      {isZh && (
        <aside className="rounded-soft border-cream-line bg-paper mx-auto mt-8 max-w-[68ch] border px-4 py-3">
          <p className="kicker">{t("noticeTitle")}</p>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">{t("notice")}</p>
        </aside>
      )}

      <div className="mx-auto mt-12 max-w-[68ch] pb-8">
        {faqParts.map((part) => (
          <section key={part.title} className="mt-12 first:mt-0">
            <h2 lang="en" className="font-display text-xl font-semibold tracking-tight md:text-2xl">
              {part.title}
            </h2>
            <div className="divide-cream-line border-cream-line mt-5 divide-y border-y">
              {part.items.map((item, itemIndex) => (
                /* 纵向内边距从 <details> 挪到 <summary>(方案 #50):原来 py-4 加在
                   外层,summary 自身只有 28px 高,点在它上下那圈"看不见的 padding"
                   上没有反应 —— 是个假可点区域。挪进来后视觉完全不变,
                   命中区 28 → 60px。 */
                <details key={item.q} className="group">
                  <summary
                    lang="en"
                    className="focus-ring text-ink flex cursor-pointer list-none items-start justify-between gap-4 py-4 text-base font-medium marker:content-none"
                  >
                    {/* 问题编号按源文档显示(老板要求)。
                        源文档里编号在**每个部分内从 Q1 重新开始**,而那正好等于
                        数组索引 + 1 —— 所以不需要在数据里存编号,也不用改生成器。
                        编号存进数据反而会多一个可能和顺序不一致的事实来源。 */}
                    <span>
                      <span className="text-ink-muted">Q{itemIndex + 1}:</span> {item.q}
                    </span>
                    {/* 展开指示:纯 CSS,不引图标库 */}
                    <span
                      aria-hidden
                      className="text-ink-muted mt-1 shrink-0 transition-transform group-open:rotate-45"
                    >
                      ＋
                    </span>
                  </summary>
                  <div lang="en" className="policy-body mt-3 max-w-none text-[0.9375rem]">
                    {/* 一个 block = 源文档里的一段 → 一个 <p>(换行);
                        段内片段按 bold 渲染成 <strong>(加粗小标题与正文同段,
                        所以不能整段当纯文本塞进去)。`policy-body strong` 已有字重样式。 */}
                    {item.a.map((block, blockIndex) => (
                      <p key={blockIndex}>
                        {block.map((segment, segmentIndex) =>
                          segment.bold ? (
                            <strong key={segmentIndex}>{segment.text}</strong>
                          ) : (
                            <Fragment key={segmentIndex}>{segment.text}</Fragment>
                          ),
                        )}
                      </p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="border-cream-line text-ink-soft mx-auto mt-16 max-w-[68ch] border-t pt-8 text-xs tracking-[var(--tracking-12)] uppercase">
        <Link
          href="/"
          className="focus-ring tap-target hover:text-ink transition-colors lg:min-h-0"
        >
          ← {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}
