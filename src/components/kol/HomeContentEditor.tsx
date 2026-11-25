"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { newsFeature } from "@/lib/content";
import {
  defaultHomeContent,
  homeContentVersionSchema,
  homeImageByteLimit,
  homeImageMaxEdge,
  homeMediaPrefix,
  isHomeImageSource,
  type HomeContent,
  type HomeContentVersion,
} from "@/lib/home-content";

const path = "home-config";
const sections = [
  ["hero", "首屏轮播"],
  ["announcements", "活动横幅"],
  ["latest", "The Latest from OFFY"],
] as const;
type Section = (typeof sections)[number][0];
const heroLabels = [
  "品牌主图",
  "促销主图",
  "Princess Series",
  "Streetwear Series",
  "Dress-up Series",
];
const defaults = defaultHomeContent();

async function prepareImage(file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error("请选择 20 MB 以内的图片。");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("无法打开图片，请选择 JPG、PNG、WebP 或 AVIF。");
  }
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器暂时无法处理图片，请重试。");
    for (const edge of [homeImageMaxEdge, 1920]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.88, 0.76, 0.64]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (blob && blob.size <= homeImageByteLimit) return blob;
      }
    }
    throw new Error("图片仍然过大，请缩小后重试。");
  } finally {
    bitmap.close();
  }
}

function ImageFields({
  title,
  image,
  original,
  siteUrl,
  variant,
  onChange,
  onUpload,
  children,
}: {
  title: string;
  image: string;
  original: string;
  siteUrl: string;
  variant?: "wide" | "feature";
  onChange: (image: string) => void;
  onUpload: (file: File) => void;
  children: ReactNode;
}) {
  const source = image.trim();
  const preview = !isHomeImageSource(source)
    ? null
    : source.startsWith(homeMediaPrefix)
      ? `/api/admin/kol/${path}/media/${source.slice(homeMediaPrefix.length)}`
      : new URL(source, siteUrl).href;
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <div className="home-editor-fields">
      <div className="home-editor-media">
        <div className={`home-editor-preview ${variant ? `home-editor-preview-${variant}` : ""}`}>
          {preview && preview !== broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              onError={() => setBroken(preview)}
              style={
                variant === "feature" && source === newsFeature.image
                  ? { objectPosition: newsFeature.objectPosition }
                  : undefined
              }
            />
          ) : (
            <span>{broken === preview && broken ? "图片加载失败" : "图片预览"}</span>
          )}
        </div>
        <div className="home-editor-media-actions">
          <label className="button home-editor-upload">
            上传图片
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              aria-label={`${title}上传图片`}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) onUpload(file);
              }}
            />
          </label>
          {image !== original && (
            <button type="button" className="text-button" onClick={() => onChange(original)}>
              恢复原图
            </button>
          )}
        </div>
      </div>
      <div className="home-editor-entry">
        <label>
          图片地址
          <input
            value={image}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://cdn.shopify.com/…"
            maxLength={2048}
          />
        </label>
        {children}
      </div>
    </div>
  );
}

function Destination({
  value,
  onChange,
  optional,
  label = "跳转链接",
}: {
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  label?: string;
}) {
  return (
    <label>
      {optional ? `${label}（选填）` : label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="/products 或 https://…"
        maxLength={2048}
      />
    </label>
  );
}

export function HomeContentEditor({
  siteUrl,
  request,
  onSessionExpired,
}: {
  siteUrl: string;
  request: (path: string, body?: unknown, signal?: AbortSignal) => Promise<unknown>;
  onSessionExpired: () => void;
}) {
  const [section, setSection] = useState<Section>("hero");
  const [published, setPublished] = useState<HomeContentVersion | null>(null);
  const [draft, setDraft] = useState<HomeContent | null>(null);
  const [pending, setPending] = useState<"load" | "image" | "publish" | null>("load");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  const dirty = Boolean(draft && JSON.stringify(draft) !== JSON.stringify(published?.content));

  const fail = useCallback(
    (error: unknown) => {
      const status = (error as { status?: number }).status;
      if (status === 401) onSessionExpired();
      else setError(error instanceof Error ? error.message : "操作失败，请重试。");
    },
    [onSessionExpired],
  );
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setPending("load");
      setError("");
      try {
        const value = homeContentVersionSchema.parse(await request(path, undefined, signal));
        if (signal?.aborted) return;
        setPublished(value);
        setDraft(value.content);
        setConflict(false);
        setNotice("");
      } catch (error) {
        if (!signal?.aborted) fail(error);
      } finally {
        if (!signal?.aborted) setPending(null);
      }
    },
    [request, fail],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (change: (content: HomeContent) => void) => {
    setDraft((previous) => {
      if (!previous) return previous;
      const next = structuredClone(previous);
      change(next);
      return next;
    });
    setNotice("");
  };
  const upload = async (file: File, changeImage: (image: string) => void) => {
    setError("");
    setNotice("");
    setPending("image");
    try {
      const result = (await request(`${path}/media`, await prepareImage(file))) as {
        image: string;
      };
      changeImage(result.image);
      setNotice("图片已上传，保存后生效。");
    } catch (error) {
      fail(error);
    } finally {
      setPending(null);
    }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !published || !draft || !dirty || conflict) return;
    setError("");
    setNotice("");
    const input = homeContentVersionSchema.safeParse({
      revision: published.revision,
      content: draft,
    });
    if (!input.success) {
      const issue = input.error.issues[0];
      const group = issue.path[1] === "promotion" ? "hero" : issue.path[1];
      const namedSection = sections.find(([name]) => name === group);
      if (namedSection) setSection(namedSection[0]);
      const item =
        typeof issue.path[2] === "number"
          ? ` · ${issue.path[2] + 1}`
          : issue.path[2] === "items"
            ? ` · 动态卡 ${Number(issue.path[3]) + 1}`
            : issue.path[2] === "feature"
              ? " · 主卡"
              : "";
      setError(`${namedSection?.[1] ?? "首页配置"}${item} · ${issue.message}`);
      return;
    }
    setPending("publish");
    try {
      const saved = homeContentVersionSchema.parse(await request(path, input.data));
      setPublished(saved);
      setDraft(saved.content);
      setNotice("已发布，刷新首页即可查看。");
    } catch (error) {
      if ((error as { status?: number }).status === 409) setConflict(true);
      fail(error);
    } finally {
      setPending(null);
    }
  };

  if (!draft || !published) {
    return error ? (
      <div className="message error" role="alert">
        {error}
        <button type="button" onClick={() => void load()}>
          重新读取
        </button>
      </div>
    ) : (
      <p className="message" role="status">
        正在读取首页配置…
      </p>
    );
  }

  const latestCards = [
    { title: "主卡", card: draft.latest.feature, original: defaults.latest.feature },
    ...draft.latest.items.map((card, index) => ({
      title: `动态卡 ${index + 1}`,
      card,
      original: defaults.latest.items[index],
    })),
  ];
  return (
    <form className="home-editor" onSubmit={save}>
      <div className="home-editor-toolbar">
        <div className="home-editor-nav" role="group" aria-label="首页内容">
          {sections.map(([key, title]) => (
            <button
              type="button"
              key={key}
              aria-pressed={section === key}
              onClick={() => setSection(key)}
            >
              {title}
            </button>
          ))}
        </div>
        <div className="home-editor-actions">
          <button
            type="button"
            disabled={!dirty || Boolean(pending)}
            onClick={() => {
              setDraft(published.content);
              setNotice("");
              if (!conflict) setError("");
            }}
          >
            撤销修改
          </button>
          <button className="primary" disabled={!dirty || Boolean(pending) || conflict}>
            {pending === "publish" ? "正在发布…" : "保存并发布"}
          </button>
        </div>
      </div>
      {error && (
        <div className="message error" role="alert">
          {error}
          {conflict && (
            <button type="button" disabled={Boolean(pending)} onClick={() => void load()}>
              重新读取最新配置
            </button>
          )}
        </div>
      )}
      <p className="home-editor-status muted" role="status">
        {pending === "image"
          ? "正在处理和上传图片…"
          : notice ||
            (dirty
              ? "有未发布的修改"
              : published.revision
                ? "显示已发布的配置"
                : "当前使用默认首页内容")}
      </p>

      <fieldset className="home-editor-panel" disabled={Boolean(pending)}>
        <legend>{sections.find(([key]) => key === section)?.[1]}</legend>
        {section === "hero" && (
          <>
            <p className="home-editor-help">
              建议上传约 16:10 的成品横图。替换后按整张图展示，原图保留原文字版式。
            </p>
            {draft.hero.map((slide, index) => {
              const update = (value: Partial<typeof slide>) =>
                edit((content) => {
                  Object.assign(content.hero[index], value);
                });
              const label = heroLabels[index];
              const original = defaults.hero[index].image;
              return (
                <section className="home-editor-row" key={label} aria-label={label}>
                  <div className="home-editor-row-heading">
                    <h3>{label}</h3>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={slide.enabled}
                        onChange={(event) => update({ enabled: event.target.checked })}
                      />
                      展示
                    </label>
                  </div>
                  <ImageFields
                    title={label}
                    image={slide.image}
                    original={original}
                    siteUrl={siteUrl}
                    variant="wide"
                    onChange={(image) => update({ image })}
                    onUpload={(file) => void upload(file, (image) => update({ image }))}
                  >
                    <Destination
                      value={slide.href}
                      onChange={(href) => update({ href })}
                      optional
                    />
                    {slide.image !== original && (
                      <label>
                        图片说明
                        <input
                          value={slide.alt}
                          maxLength={160}
                          onChange={(event) => update({ alt: event.target.value })}
                        />
                      </label>
                    )}
                    {index === 1 && slide.image === original && (
                      <>
                        <label>
                          活动引导语
                          <input
                            value={draft.promotion.kicker}
                            maxLength={100}
                            onChange={(event) => {
                              const kicker = event.target.value;
                              edit((content) => {
                                content.promotion.kicker = kicker;
                              });
                            }}
                          />
                        </label>
                        <label>
                          活动标题
                          <textarea
                            rows={2}
                            value={draft.promotion.title}
                            maxLength={160}
                            onChange={(event) => {
                              const title = event.target.value;
                              edit((content) => {
                                content.promotion.title = title;
                              });
                            }}
                          />
                        </label>
                      </>
                    )}
                  </ImageFields>
                </section>
              );
            })}
          </>
        )}
        {section === "announcements" && (
          <>
            <p className="home-editor-help">用于全站顶部的黑色横幅。开启两条时轮播展示。</p>
            {draft.announcements.map((item, index) => {
              const title = `横幅文案 ${index + 1}`;
              const update = (value: Partial<typeof item>) =>
                edit((content) => {
                  Object.assign(content.announcements[index], value);
                });
              return (
                <section className="home-editor-row" key={title} aria-label={title}>
                  <div className="home-editor-row-heading">
                    <h3>{title}</h3>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(event) => update({ enabled: event.target.checked })}
                      />
                      展示
                    </label>
                  </div>
                  <div className="home-editor-announcement" aria-hidden="true">
                    {item.text || "横幅预览"}
                  </div>
                  <div className="home-editor-entry home-editor-announcement-fields">
                    <label>
                      横幅文案
                      <textarea
                        rows={2}
                        value={item.text}
                        maxLength={180}
                        onChange={(event) => update({ text: event.target.value })}
                      />
                    </label>
                    <Destination value={item.href} onChange={(href) => update({ href })} optional />
                  </div>
                </section>
              );
            })}
          </>
        )}
        {section === "latest" && (
          <>
            <p className="home-editor-help">
              建议使用 3:4 的竖图。桌面两排动态卡旁的主图裁切更窄，主体和文字尽量放在中部。链接指向
              OFFY 商品时，首页会核验访客所在市场的可售状态。
            </p>
            <div className="home-editor-browse">
              <Destination
                label="Browse All Series 跳转链接"
                value={draft.latest.browseHref}
                onChange={(href) =>
                  edit((content) => {
                    content.latest.browseHref = href;
                  })
                }
              />
            </div>
            {latestCards.map(({ title, card, original }, index) => {
              const update = (value: Partial<typeof card>) =>
                edit((content) => {
                  Object.assign(
                    index === 0 ? content.latest.feature : content.latest.items[index - 1],
                    value,
                  );
                });
              return (
                <section className="home-editor-row" key={title} aria-label={title}>
                  <div className="home-editor-row-heading">
                    <h3>{title}</h3>
                  </div>
                  <ImageFields
                    title={title}
                    image={card.image}
                    original={original.image}
                    siteUrl={siteUrl}
                    variant={index === 0 ? "feature" : undefined}
                    onChange={(image) => update({ image })}
                    onUpload={(file) => void upload(file, (image) => update({ image }))}
                  >
                    <Destination value={card.href} onChange={(href) => update({ href })} />
                    {"alt" in card ? (
                      <label>
                        图片说明（选填）
                        <input
                          value={card.alt}
                          maxLength={160}
                          onChange={(event) => update({ alt: event.target.value })}
                        />
                      </label>
                    ) : (
                      <label>
                        按钮文案
                        <input
                          value={card.label}
                          maxLength={48}
                          onChange={(event) => update({ label: event.target.value })}
                        />
                      </label>
                    )}
                  </ImageFields>
                </section>
              );
            })}
          </>
        )}
      </fieldset>
    </form>
  );
}
