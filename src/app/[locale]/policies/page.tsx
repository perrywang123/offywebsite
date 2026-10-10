import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { publicPath } from "@/i18n/routing";
import { POLICY_HANDLES, type PolicyHandle } from "@/server/catalog/policies";

/**
 * 书面政策**二级页**(`/policies`)—— 目录页,只列入口,不写正文。
 *
 * 存在理由:页脚此前把 4 条政策 + 联系信息 + FAQ 平铺成一列 6 条同级链接,
 * 设计稿改成 HELP & SUPPORT 面板(两个大字入口 + 一个弱化的二级入口)后,
 * 政策需要一层容器承接 —— 就是本页。联系信息**不在**这里:它在页脚已经是
 * 独立的大字入口,再从这一层进一次是多余的一跳。
 *
 * 与政策正文页同一套版式(container-site + kicker + `max-w-[68ch]` 正文列),
 * 因为本页是同一信息架构里的一层,不是新体系。
 *
 * 路由说明:`/policies` 是静态段,App Router 里静态段优先于 `[handle]` 动态段,
 * 所以不会被 `[handle]/page.tsx` 当成 handle="policies" 吃掉。
 *
 * 链接一律不带 `/en`(站点对外英文单语、`localePrefix: "as-needed"`);
 * canonical 用 [`publicPath`](src/i18n/routing.ts) 算,不手写 `/${locale}/...`。
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("policies");
  return {
    // 与页脚那条二级入口共用 `policies.legalLabel`:两处必须同名,分开维护必然会漂
    title: t("legalLabel"),
    description: t("indexDescription"),
    // hreflang 由根布局的 alternates.languages 提供,这里只声明自己的 canonical
    alternates: { canonical: publicPath(locale, "/policies") },
  };
}

/** 目录里展示的政策 = `POLICY_HANDLES` 去掉 contact。
 *
 * 从共享常量**推导**而不是另抄一份列表:顺序与 handle 只有 policies.ts 一处维护,
 * 以后增删政策不会漏改这一页(与页脚此前用同一个常量的理由一致)。
 */
const INDEX_HANDLES: PolicyHandle[] = POLICY_HANDLES.filter((handle) => handle !== "contact");

export default async function PoliciesIndexPage() {
  const t = await getTranslations("policies");

  return (
    <div className="container-site py-16 md:py-20">
      <header className="mx-auto max-w-[68ch]">
        <p className="kicker mb-4">{t("kicker")}</p>
        <h1 className="font-display text-[clamp(1.75rem,1.4rem+1.4vw,3rem)] font-semibold leading-[1.1] tracking-tight">
          {t("legalLabel")}
        </h1>
        <p className="mt-4 text-ink-soft">{t("indexIntro")}</p>
      </header>

      {/* 中文站不额外加"正文为英文"提示条:这一页只有政策名,而政策名 zh.json 里有
          中文;真正只有英文原文的是点进去之后的正文,那一页自己会提示。 */}
      <nav aria-label={t("navAriaLabel")} className="mx-auto mt-12 max-w-[68ch] pb-8">
        <ul className="divide-y divide-cream-line border-y border-cream-line">
          {INDEX_HANDLES.map((handle) => (
            <li key={handle}>
              <Link
                href={`/policies/${handle}`}
                className="focus-ring group flex items-center justify-between gap-4 py-5 font-display text-lg font-semibold tracking-tight transition-colors hover:text-ink-soft"
              >
                {t(`titles.${handle}`)}
                {/* 进入下一层的指示符:纯装饰,aria-hidden,不引图标库 */}
                <span
                  aria-hidden
                  className="text-ink-muted transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto mt-16 max-w-[68ch] border-t border-cream-line pt-8 text-xs uppercase tracking-[var(--tracking-12)] text-ink-soft">
        <Link href="/" className="focus-ring transition-colors hover:text-ink">
          ← {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}
