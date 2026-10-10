import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { faqParts } from "@/lib/faq";

/**
 * 常见问题(Q&A)页。
 *
 * 内容来源:`独立站Q&A_审核修订稿(1).pages`,见 `src/lib/faq.ts`(脚本从提取稿生成)。
 * 文案只有英文 —— 与政策页同理:这批内容紧邻法务口径(退货/隐私/免责),
 * 不做机翻;中文站顶部给一句语言说明。
 *
 * 展示用原生 `<details>`:10 条长答案全铺开会有 8 千多字符、页面极长,
 * 折叠后先让用户扫问题。用 `<details>` 而不是自研手风琴 —— 零 JS、
 * 键盘与屏幕阅读器原生可用、也不需要给这个页面引入客户端组件。
 */
export const metadata: Metadata = {
  title: "FAQ",
  description: "Shipping, returns, payment and privacy questions about OFFY orders.",
};

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("faq");
  const isZh = locale === "zh";

  return (
    <div className="container-site section-y lg:py-20">
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
              {part.items.map((item) => (
                /* 纵向内边距从 <details> 挪到 <summary>(方案 #50):原来 py-4 加在
                   外层,summary 自身只有 28px 高,点在它上下那圈"看不见的 padding"
                   上没有反应 —— 是个假可点区域。挪进来后视觉完全不变,
                   命中区 28 → 60px。 */
                <details key={item.q} className="group">
                  <summary
                    lang="en"
                    className="focus-ring text-ink flex cursor-pointer list-none items-start justify-between gap-4 py-4 text-base font-medium marker:content-none"
                  >
                    <span>{item.q}</span>
                    {/* 展开指示:纯 CSS,不引图标库 */}
                    <span
                      aria-hidden
                      className="text-ink-muted mt-1 shrink-0 transition-transform group-open:rotate-45"
                    >
                      ＋
                    </span>
                  </summary>
                  <div lang="en" className="policy-body mt-3 max-w-none text-[0.9375rem]">
                    {item.a
                      .split("\n")
                      .map((line, i) => (line.trim() === "" ? null : <p key={i}>{line}</p>))}
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
