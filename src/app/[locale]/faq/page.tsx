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
    <div className="container-site py-16 md:py-20">
      <header className="mx-auto max-w-[68ch]">
        <p className="kicker mb-4">{t("kicker")}</p>
        <h1 className="font-display text-[clamp(1.75rem,1.4rem+1.4vw,3rem)] font-semibold leading-[1.1] tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-4 text-ink-soft">{t("intro")}</p>
      </header>

      {/* 语言说明:仅中文站。与政策页同一个理由与同一套样式。 */}
      {isZh && (
        <aside className="mx-auto mt-8 max-w-[68ch] rounded-soft border border-cream-line bg-paper px-4 py-3">
          <p className="kicker">{t("noticeTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("notice")}</p>
        </aside>
      )}

      <div className="mx-auto mt-12 max-w-[68ch] pb-8">
        {faqParts.map((part) => (
          <section key={part.title} className="mt-12 first:mt-0">
            <h2
              lang="en"
              className="font-display text-xl font-semibold tracking-tight md:text-2xl"
            >
              {part.title}
            </h2>
            <div className="mt-5 divide-y divide-cream-line border-y border-cream-line">
              {part.items.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary
                    lang="en"
                    className="focus-ring flex cursor-pointer list-none items-start justify-between gap-4 text-base font-medium text-ink marker:content-none"
                  >
                    <span>{item.q}</span>
                    {/* 展开指示:纯 CSS,不引图标库 */}
                    <span
                      aria-hidden
                      className="mt-1 shrink-0 text-ink-muted transition-transform group-open:rotate-45"
                    >
                      ＋
                    </span>
                  </summary>
                  <div lang="en" className="policy-body mt-3 max-w-none text-[0.9375rem]">
                    {item.a.split("\n").map((line, i) =>
                      line.trim() === "" ? null : <p key={i}>{line}</p>,
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-[68ch] border-t border-cream-line pt-8 text-xs uppercase tracking-[var(--tracking-12)] text-ink-soft">
        <Link href="/" className="focus-ring transition-colors hover:text-ink">
          ← {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}
