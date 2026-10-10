import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { publicPath } from "@/i18n/routing";
import { CONTACT_INFO, POLICY_HANDLES, getPolicy, isPolicyHandle } from "@/server/catalog/policies";

/**
 * 书面政策页 —— 正文来自 Shopify 后台 设置 → 书面政策(见 server/catalog/policies.ts)。
 *
 * 设计要点(产品 + 设计评审后确定):
 *  · **浅色底**:单个政策 1.4 万~3.7 万字符,深底白字长时间阅读会有光晕,
 *    且全站只有这一处是深色正文页,与 about 的浅底节奏脱节。
 *  · 正文列 `max-w-[68ch]`(~608px):法务长文靠限制行宽换可读性,而不是靠降对比度。
 *  · **中文站显示英文原文** —— Translate & Adapt 没配政策翻译,接口只会返回英文。
 *    因此中文站加"语言说明"提示条并声明以英文原文为准;正文容器带 lang="en",
 *    否则屏幕阅读器会用中文音素读三万个英文字符。
 *  · 联系信息不是长文,单独用 <dl> 结构化呈现(用户提供的内容,英文原文照抄)。
 */

// 政策极少改;fetch 侧的 revalidate 同为 300(见 policies.ts)
export const revalidate = 300;

export function generateStaticParams() {
  return POLICY_HANDLES.map((handle) => ({ handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}): Promise<Metadata> {
  const { locale, handle } = await params;
  if (!isPolicyHandle(handle)) return {};
  const t = await getTranslations("policies");
  const title = t(`titles.${handle}`);
  return {
    title,
    // 中文站也用中文元数据(中文用户会搜"Offy 退货政策"),但描述里点明正文为英文
    description:
      locale === "zh" ? `${title} · 正文为英文原文` : `${title} of is.offy`,
    alternates: { canonical: publicPath(locale, `/policies/${handle}`) },
    // 不指向 Shopify 的 url 字段:那是 checkout.shopify.com 域的结账内副本,不是店铺公开页
  };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  // 白名单把住动态段:否则任意 /policies/xxx 都会渲染 200 空页(对 SEO 有害)
  if (!isPolicyHandle(handle)) notFound();

  const t = await getTranslations("policies");
  const policy = await getPolicy(handle);
  const title = t(`titles.${handle}`);
  const isContact = handle === "contact";
  const isZh = locale === "zh";

  return (
    <div className="container-site py-16 md:py-20">
      <header className="mx-auto max-w-[68ch]">
        <p className="kicker mb-4">{t("kicker")}</p>
        <h1 className="font-display text-[clamp(1.75rem,1.4rem+1.4vw,3rem)] font-semibold leading-[1.1] tracking-tight">
          {title}
        </h1>
      </header>

      {/* 语言说明:仅中文站。政策正文只有英文,不声明会让中文用户以为看到了中文版;
          样式用白卡而不是 bg-cream-deep —— 后者 #f5f5f5 与页面底 #efefef 几乎不可分。 */}
      {isZh && (
        <aside className="mx-auto mt-8 max-w-[68ch] rounded-soft border border-cream-line bg-paper px-4 py-3">
          <p className="kicker">{t("noticeTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("notice")}</p>
        </aside>
      )}

      {isContact ? (
        <ContactSection locale={locale} />
      ) : (
        <article className="mx-auto mt-12 max-w-[68ch] pb-8" lang="en">
          {policy.bodyHtml ? (
            // 已过 lib/sanitize.ts 白名单消毒(剥掉全部属性、丢 script/style、校验 href 协议)
            <div className="policy-body" dangerouslySetInnerHTML={{ __html: policy.bodyHtml }} />
          ) : (
            <p className="text-ink-soft">{t("unavailable")}</p>
          )}
        </article>
      )}

      <div className="mx-auto mt-16 max-w-[68ch] border-t border-cream-line pt-8 text-xs uppercase tracking-[var(--tracking-12)] text-ink-soft">
        <Link href="/" className="focus-ring transition-colors hover:text-ink">
          ← {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}

/** 联系信息:结构化 <dl>。用户给的是"一行一字段"的纯文本,拆开才能让邮箱可点、
 *  Instagram 可跳;字段值一律英文原文照抄,不翻译(公司名/地址的官方拼写就是英文)。 */
async function ContactSection({ locale }: { locale: string }) {
  const t = await getTranslations("policies");
  const isZh = locale === "zh";

  return (
    <section className="mx-auto mt-12 max-w-[38rem] pb-8">
      <p className="text-ink-soft">{t("contactIntro")}</p>
      <dl className="mt-10 grid gap-y-7 sm:grid-cols-[10rem_1fr] sm:gap-x-8 sm:gap-y-8">
        {CONTACT_INFO.rows.map((row) => (
          <div key={row.label.en} className="contents">
            <dt className="kicker self-start">{isZh ? row.label.zh : row.label.en}</dt>
            <dd className="text-base text-ink">
              {row.href ? (
                <a
                  href={row.href}
                  className="focus-ring link-line break-words"
                  {...(row.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {row.value}
                </a>
              ) : (
                <span className="break-words">{row.value}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 border-t border-cream-line pt-8 text-sm leading-relaxed text-ink-soft">
        {t("contactNote")}
      </p>
    </section>
  );
}
