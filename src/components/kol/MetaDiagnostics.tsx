"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { listMetaEvents } from "@/server/meta/store";
import type { evidenceOverview, traceEvidence } from "@/server/meta/evidence";
import { buildMetaLink, metaUrlParameters } from "@/lib/meta/links";
import { decimal } from "@/server/kol/money";
type Evidence = ReturnType<typeof listMetaEvents> & {
  overview?: ReturnType<typeof evidenceOverview>;
  config: {
    enabled: boolean;
    pixelId: string;
    capi: boolean;
    catalogCount: number;
    simulation?: boolean;
    testMode: boolean;
    siteUrl?: string;
    ordersConfigured?: boolean;
  };
};
type Trace = NonNullable<ReturnType<typeof traceEvidence>>;
const names: Record<string, string> = {
  PageView: "页面浏览",
  ViewContent: "商品浏览",
  AddToCart: "加购",
  CheckoutReady: "结账准备（站内）",
  InitiateCheckout: "旧版结账事件（历史）",
};
const labels: Record<string, string> = {
  observed: "已记录观察",
  unconfigured: "CAPI 未启用或未配置",
  pending: "等待发送／重试",
  sending: "发送中",
  sent: "CAPI 已接收",
  failed: "发送终止",
  suppressed: "已停止向 Meta 发送",
};
const time = (at: number) => new Date(at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
const day = (at: number) => new Date(at + 8 * 3600000).toISOString().slice(0, 10);
const sourceText = (source: Record<string, string>) =>
  Object.entries(source)
    .map(([k, v]) => `${k}=${v}`)
    .join(" · ") || "未记录来源标签";
type Order = NonNullable<Evidence["overview"]>["orders"][number];
function Orders({ orders }: { orders: Order[] }) {
  return (
    <div className="meta-orders">
      {orders.map((o) => (
        <article className="meta-order" key={o.orderId}>
          <div className="section-line">
            <strong>{o.orderName}</strong>
            <span>
              {o.test ? "测试 · " : ""}
              {o.canceled ? "已取消 · " : ""}
              {(
                {
                  PAID: "已付款",
                  PARTIALLY_PAID: "部分付款",
                  PARTIALLY_REFUNDED: "部分退款",
                  REFUNDED: "已退款",
                  PENDING: "待付款",
                  AUTHORIZED: "已授权",
                  VOIDED: "已作废",
                  UNKNOWN: "状态未知",
                } as Record<string, string>
              )[o.financialStatus] ?? o.financialStatus}
            </span>
          </div>
          <p>
            订单总额 {decimal(o.totalMinor, o.currency)} {o.currency} · 已退款{" "}
            {decimal(o.refundedMinor, o.currency)} {o.currency}
          </p>
          <p className="muted">
            下单 {time(o.createdAt)} · 核对 {time(o.checkedAt)}
          </p>
          <p className="muted">结账编号 {o.attemptId}</p>
        </article>
      ))}
    </div>
  );
}
function SourceHelper({ origin }: { origin: string }) {
  const [destination, setDestination] = useState("/products"),
    [message, setMessage] = useState("");
  let preview = "";
  try {
    preview = buildMetaLink(destination, origin);
  } catch {
    /* inline validation */
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("已复制");
    } catch {
      setMessage("无法自动复制，请选中文字手动复制。");
    }
  }
  return (
    <details className="meta-helper">
      <summary>投放链接设置 · 复制给投放同事</summary>
      <p>
        Meta 中设置 Sales → Website → 此数据集 → Purchase。网站地址填写 Offy
        落地页；下列参数放在广告的“URL parameters”栏。不会创建或发布广告。
      </p>
      <label>
        Offy 落地地址
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="/products 或商品页地址"
        />
      </label>
      {!preview && <p className="message error">请填写 Offy 站内公开页面地址。</p>}
      <label>
        Meta URL 参数
        <textarea readOnly rows={4} value={metaUrlParameters} />
      </label>
      <button type="button" onClick={() => void copy(metaUrlParameters)}>
        复制 URL 参数
      </button>
      {preview && (
        <>
          <label>
            完整链接预览
            <textarea readOnly rows={4} value={preview} />
          </label>
          <button type="button" onClick={() => void copy(preview)}>
            复制完整模板
          </button>
        </>
      )}
      <p className="muted">
        双花括号由 Meta 在真实投放点击时替换。预览或手动打开模板不能证明广告归因；不要自行添加
        fbclid。已有广告由投放负责人核对后修改。
      </p>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
export function MetaDiagnostics() {
  const [data, setData] = useState<Evidence>(),
    [name, setName] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [from, setFrom] = useState(() => day(Date.now() - 6 * 86400000)),
    [to, setTo] = useState(() => day(Date.now())),
    [campaignId, setCampaignId] = useState(""),
    [adId, setAdId] = useState(""),
    [includeTests, setIncludeTests] = useState(false),
    [trace, setTrace] = useState<Trace>(),
    [traceError, setTraceError] = useState(""),
    [tracing, setTracing] = useState("");
  const requestId = useRef(0),
    traceRequest = useRef(0);
  const query = useCallback(
    () =>
      new URLSearchParams({
        page: String(page),
        from,
        to,
        ...(name ? { name } : {}),
        ...(status ? { status } : {}),
        ...(campaignId ? { campaignId } : {}),
        ...(adId ? { adId } : {}),
        ...(includeTests ? { includeTests: "true" } : {}),
      }),
    [page, from, to, name, status, campaignId, adId, includeTests],
  );
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    setTrace(undefined);
    traceRequest.current++;
    setTracing("");
    setTraceError("");
    if (!from || !to || from > to || [campaignId, adId].some((v) => v && !/^\d{1,30}$/.test(v))) {
      setError("请检查日期顺序及广告编号（只填写数字）。");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/admin/kol/meta?${query()}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (id === requestId.current) setData(result);
    } catch {
      if (id === requestId.current) setError("广告诊断暂时读取失败，请重试；不会影响独立站下单。");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query, from, to, campaignId, adId]);
  const invalidateRequests = useCallback(() => {
    requestId.current++;
    traceRequest.current++;
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => {
      clearTimeout(timer);
      invalidateRequests();
    };
  }, [load, invalidateRequests]);
  async function openTrace(id: string) {
    const seq = ++traceRequest.current;
    setTracing(id);
    setTrace(undefined);
    setTraceError("");
    try {
      const response = await fetch(`/api/admin/kol/meta/trace/${id}?${query()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (seq === traceRequest.current) setTrace(result);
    } catch {
      if (seq === traceRequest.current)
        setTraceError("链路暂时读取失败，请重试；过期或未采集记录可能无法关联。");
    } finally {
      if (seq === traceRequest.current) setTracing("");
    }
  }
  const overview = data?.overview;
  return (
    <section aria-label="Meta 广告诊断" aria-busy={loading}>
      <div className="section-line">
        <div>
          <h2>广告来源与订单核对</h2>
          <p className="muted">
            站内观察、Meta 接收回执与 Shopify 订单证据；不代表广告归因或佣金。
          </p>
        </div>
        <button onClick={() => void load()} disabled={loading}>
          {loading ? "读取中…" : "刷新数据"}
        </button>
      </div>
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="message" role="status">
            Pixel：{data.config.enabled ? data.config.pixelId : "未启用或 ID 未配置"} · CAPI：
            {data.config.capi ? "配置齐备" : "未启用或配置不全"} · 目录映射：
            {data.config.catalogCount} 项
            {data.config.simulation
              ? " · 本地模拟验收（非真实 Meta）"
              : data.config.testMode
                ? " · 测试事件模式（投放前必须关闭）"
                : ""}
            <br />
            Purchase 由 Shopify 官方集成负责；InitiateCheckout 同样由官方上报，Offy
            的结账准备仅在本地记录。
          </div>
          <p>
            <a
              href="https://eventsmanager.facebook.com/events_manager2/list/pixel/1120625754196383/overview?business_id=837128189448656"
              target="_blank"
              rel="noreferrer"
            >
              事件管理工具 ↗
            </a>
            　
            <a
              href="https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1301113714798915"
              target="_blank"
              rel="noreferrer"
            >
              广告效果 / 最终归因 ↗
            </a>
          </p>
        </>
      )}
      <div className="toolbar meta-filters">
        <label>
          开始日期
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          结束日期
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          广告系列 ID
          <input
            inputMode="numeric"
            value={campaignId}
            onChange={(e) => {
              setCampaignId(e.target.value.trim());
              setPage(1);
            }}
            placeholder="全部系列"
          />
        </label>
        <label>
          广告 ID
          <input
            inputMode="numeric"
            value={adId}
            onChange={(e) => {
              setAdId(e.target.value.trim());
              setPage(1);
            }}
            placeholder="全部广告"
          />
        </label>
        <label>
          事件
          <select
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部事件</option>
            {Object.entries(names).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          发送状态
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部状态</option>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="meta-test-toggle">
        <input
          type="checkbox"
          checked={includeTests}
          onChange={(e) => {
            setIncludeTests(e.target.checked);
            setPage(1);
          }}
        />
        包含内部测试与 Shopify 测试订单
      </label>
      <p className="muted">
        时间 Asia/Shanghai · 最多保留 30 天 · 订单按所选站内事件关联。
        {loading && "正在读取新筛选，以下为上次结果。"}
      </p>
      {overview && (
        <>
          <div className="meta-counts">
            {["PageView", "ViewContent", "AddToCart", "CheckoutReady"].map((n) => {
              const e = overview.events.find((x) => x.name === n);
              return (
                <div key={n}>
                  <span>{names[n]}</span>
                  <strong>{e?.count ?? 0}</strong>
                  <small>
                    {e?.browsers ?? 0} 个浏览器标识 · {e?.withAdId ?? 0} 条带广告 ID
                  </small>
                </div>
              );
            })}
          </div>
          <p className="muted">
            浏览器标识不是实际人数；未许可、拦截、跨设备和清理存储会影响记录。
            {!includeTests && `本范围已排除 ${overview.excludedTests} 条标记的内部测试。`}
            旧版结账事件仅在明细中保留。
          </p>
          <section aria-label="Shopify 订单核对" className="meta-reconciliation">
            <h3>Shopify 订单核对</h3>
            <p>
              {!data?.config.ordersConfigured
                ? "Shopify Admin 尚未配置，订单证据暂不可用。"
                : overview.sync?.lastError
                  ? "订单读取暂时失败，将自动重试。站内记录与 CAPI 发送继续运行。"
                  : overview.sync?.lastSuccess
                    ? `最近成功读取 ${time(overview.sync.lastSuccess)}${overview.sync.scanning ? " · 分页读取中" : " · 完成扫描后每 15 分钟检查"}`
                    : "等待管理后台 worker 首次读取订单；当前没有订单证据不等于没有成交。"}
            </p>
            <p className="muted">
              仅关联本次上线后、许可内且带签名结账编号的订单。不推测历史来源，不向 Meta 重发
              Purchase。金额为 Shopify 订单总额（含运税），不是 Meta 广告购买金额。
            </p>
            {overview.currencies.map((c) => (
              <p key={c.currency}>
                <strong>{c.currency}</strong> · {c.orders} 笔有付款记录且未取消的订单 · 总额{" "}
                {decimal(c.totalMinor, c.currency)} · 已退款 {decimal(c.refundedMinor, c.currency)}
              </p>
            ))}
            {overview.orders.length ? (
              <>
                {overview.orderCount > overview.orders.length && (
                  <p className="muted">
                    共 {overview.orderCount} 笔匹配订单，以下显示最近 {overview.orders.length}{" "}
                    笔；币种汇总包含全部匹配订单。
                  </p>
                )}
                <Orders orders={overview.orders} />
              </>
            ) : (
              <p className="muted">尚无匹配订单证据；请同时查看 Shopify 订单与 Meta 广告报表。</p>
            )}
          </section>
        </>
      )}
      {data && <SourceHelper origin={data.config.siteUrl ?? "https://isoffy.com"} />}
      <h3>事件明细</h3>
      {!data && !error && <p role="status">正在读取诊断…</p>}
      {data?.rows.length === 0 && (
        <div className="empty">
          <h3>暂无匹配事件</h3>
          <p>从追踪启用后且许可允许的浏览开始采集；未接入或未许可不代表没有访问。</p>
        </div>
      )}
      <div className="meta-records">
        {data?.rows.map((row) => (
          <article key={row.id} className="meta-record">
            <div className="section-line">
              <strong>{names[row.name] ?? row.name}</strong>
              <span>{labels[row.status] ?? row.status}</span>
            </div>
            <p className="muted">
              {time(row.createdAt)} · {row.pagePath}
            </p>
            <p>
              {row.data.value !== undefined
                ? `${row.data.value} ${row.data.currency}`
                : "金额未记录"}{" "}
              · {row.data.num_items ?? "—"} 件 ·{" "}
              {row.name === "PageView"
                ? "页面浏览，无需商品目录 ID"
                : row.data.content_ids?.length
                  ? "已按配置映射目录 ID"
                  : "未提供目录 ID，需核对映射"}
            </p>
            <details>
              <summary>查看来源与发送明细</summary>
              <dl>
                <dt>广告来源</dt>
                <dd>{sourceText(row.source)}</dd>
                <dt>匹配信息</dt>
                <dd>
                  Meta 点击标识：{row.hasFbc ? "有" : "无"}；浏览器标识：{row.hasFbp ? "有" : "无"}
                  。标识存在不代表此事件已归因给广告。
                </dd>
                <dt>浏览器</dt>
                <dd>
                  {["CheckoutReady", "InitiateCheckout"].includes(row.name)
                    ? "结账由 Shopify 官方上报；本条仅本地核对"
                    : row.pixelAttempted
                      ? "已调用 Pixel（平台接收另行核对）"
                      : "未成功调用 Pixel"}
                </dd>
                <dt>CAPI 尝试</dt>
                <dd>
                  {row.attempts} 次{row.lastError ? ` · ${row.lastError}` : ""}
                </dd>
                <dt>事件编号</dt>
                <dd>{row.id}</dd>
                <dt>结账诊断编号</dt>
                <dd>
                  {row.attemptId ? (
                    <Link href={`/admin/checkouts?query=${row.attemptId}`}>{row.attemptId} ↗</Link>
                  ) : (
                    "未关联"
                  )}
                </dd>
              </dl>
            </details>
            <button
              type="button"
              disabled={loading || !!tracing}
              onClick={() => void openTrace(row.id)}
            >
              {tracing === row.id ? "读取链路中…" : "查看浏览 → 结账 → 订单"}
            </button>
            {trace?.selectedId === row.id && (
              <section className="meta-trace" aria-label="同一浏览器链路">
                <h4>同一浏览器的许可内观察</h4>
                <p className="muted">
                  当前日期范围内最多 50 条；表示观察到的顺序，不等于 Meta 最终归因。
                  {trace.truncated && "更早记录已省略。"}
                </p>
                <ol>
                  {trace.events.map((e) => (
                    <li key={e.id}>
                      <strong>{names[e.name] ?? e.name}</strong> · {time(e.createdAt)}
                      <p>{e.pagePath}</p>
                      <p className="muted">{sourceText(e.source)}</p>
                      {e.attemptId && <p>结账编号 {e.attemptId}</p>}
                    </li>
                  ))}
                </ol>
                {trace.checkouts.map((c) => (
                  <p key={c.id}>
                    Shopify 结账准备：{c.status === "redirect_ready" ? "已生成链接" : c.status} ·{" "}
                    {c.country}
                    {c.error ? ` · ${c.error}` : ""}
                  </p>
                ))}
                <Orders orders={trace.orders} />
                {!trace.orders.length && <p>尚无关联订单证据；不能据此断定未付款。</p>}
              </section>
            )}
          </article>
        ))}
      </div>
      {traceError && (
        <p className="message error" role="alert">
          {traceError}
        </p>
      )}
      {data && (
        <div className="section-line">
          <span>
            共 {data.total} 条 · 第 {page} 页
          </span>
          <div>
            <button disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>
              上一页
            </button>{" "}
            <button
              disabled={page * 30 >= data.total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
