"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { listMetaEvents } from "@/server/meta/store";
import type { evidenceOverview, traceEvidence } from "@/server/meta/evidence";
import { buildMetaLink, metaUrlParameters } from "@/lib/meta/links";
import { MetaAnalyticsCharts } from "./MetaAnalyticsCharts";
import type { MetaAnalyticsData } from "@/server/meta/analytics";
import type { AnalyticsStage } from "@/lib/meta/analytics";
import { decimal } from "@/server/kol/money";
type Evidence = ReturnType<typeof listMetaEvents> & {
  overview?: ReturnType<typeof evidenceOverview>;
  analytics?: MetaAnalyticsData;
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

type GlobalScope = {
  from: string;
  to: string;
  source: "all" | "ad" | "unlabelled";
  campaignId: string;
  adId: string;
  includeTests: boolean;
};
const initialScope = (): GlobalScope => ({
  from: day(Date.now() - 6 * 86400000),
  to: day(Date.now()),
  source: "all",
  campaignId: "",
  adId: "",
  includeTests: false,
});
const stageLabels: Record<AnalyticsStage, string> = {
  view: "访问",
  content: "商品浏览",
  cart: "可选加购",
  checkout: "结账准备",
  paid: "关联付款",
};
function EvidenceDialog({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current,
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (element?.showModal) element.showModal();
    else element?.setAttribute("open", "");
    return () => {
      element?.close?.();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      className="admin-dialog meta-evidence-dialog"
      ref={dialog}
      aria-label="广告事件与链路证据"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>广告事件与链路证据</h2>
        <button type="button" className="icon-button" aria-label="关闭广告证据" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="dialog-content">{children}</div>
    </dialog>
  );
}
export function MetaDiagnostics() {
  const [data, setData] = useState<Evidence>();
  const [scope, setScope] = useState(initialScope);
  const [draft, setDraft] = useState(scope);
  const [period, setPeriod] = useState("7");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [stage, setStage] = useState<AnalyticsStage | "">("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<Trace>();
  const [traceError, setTraceError] = useState("");
  const [selected, setSelected] = useState<Evidence["rows"][number]>();
  const [tracing, setTracing] = useState(false);
  const requestId = useRef(0),
    traceRequest = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const scopePanel = useRef<HTMLDetailsElement>(null),
    detailsPanel = useRef<HTMLDetailsElement>(null),
    ordersPanel = useRef<HTMLDetailsElement>(null);
  const query = useCallback(
    () =>
      new URLSearchParams({
        page: String(page),
        from: scope.from,
        to: scope.to,
        ...(scope.source !== "all" ? { source: scope.source } : {}),
        ...(scope.campaignId ? { campaignId: scope.campaignId } : {}),
        ...(scope.adId ? { adId: scope.adId } : {}),
        ...(scope.includeTests ? { includeTests: "true" } : {}),
        ...(name ? { name } : {}),
        ...(status ? { status } : {}),
        ...(stage ? { stage } : {}),
      }),
    [scope, page, name, status, stage],
  );
  const load = useCallback(async () => {
    const id = ++requestId.current;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError("");
    setSelected(undefined);
    traceRequest.current++;
    setTrace(undefined);
    setTracing(false);
    setTraceError("");
    try {
      const response = await fetch(`/api/admin/kol/meta?${query()}`, {
        cache: "no-store",
        signal: current.signal,
      });
      if (!response.ok) throw new Error();
      const result: Evidence = await response.json();
      if (id === requestId.current) setData(result);
    } catch {
      if (!current.signal.aborted && id === requestId.current)
        setError(
          "广告诊断暂时读取失败，请重试；不会影响独立站下单。当前图表如有显示，为上次成功结果。",
        );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query]);
  const cancelRequests = useCallback(() => {
    requestId.current++;
    traceRequest.current++;
    controller.current?.abort();
  }, []);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => void load(), 250);
    return () => {
      clearTimeout(timer);
      cancelRequests();
    };
  }, [load, cancelRequests]);
  useEffect(() => {
    let wide = window.innerWidth > 640;
    if (scopePanel.current) scopePanel.current.open = wide;
    const resize = () => {
      const next = window.innerWidth > 640;
      if (wide !== next && scopePanel.current) scopePanel.current.open = next;
      wide = next;
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  function applyScope(next = draft) {
    if (
      !next.from ||
      !next.to ||
      next.from > next.to ||
      [next.campaignId, next.adId].some((v) => v && !/^\d{1,30}$/.test(v))
    ) {
      setError("请检查日期顺序及广告编号（只填写数字）。");
      return;
    }
    setError("");
    setScope({ ...next });
    setPage(1);
    setStage("");
    setName("");
    setStatus("");
    if (window.innerWidth <= 640 && scopePanel.current) scopePanel.current.open = false;
  }
  function drillStage(value: AnalyticsStage) {
    setStage(value);
    setName("");
    setStatus("");
    setPage(1);
    if (detailsPanel.current) {
      detailsPanel.current.open = true;
      detailsPanel.current.scrollIntoView?.({ block: "start", behavior: "auto" });
    }
  }
  function drillAd(id: string | null) {
    const next: GlobalScope = { ...scope, adId: id ?? "", source: id ? "ad" : "unlabelled" };
    setDraft(next);
    applyScope(next);
  }
  async function openTrace(row: Evidence["rows"][number]) {
    const seq = ++traceRequest.current;
    setSelected(row);
    setTrace(undefined);
    setTraceError("");
    setTracing(true);
    try {
      const response = await fetch(`/api/admin/kol/meta/trace/${row.id}?${query()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (seq === traceRequest.current) setTrace(result);
    } catch {
      if (seq === traceRequest.current)
        setTraceError("链路暂时读取失败，请重试；过期或未采集记录可能无法关联。");
    } finally {
      if (seq === traceRequest.current) setTracing(false);
    }
  }
  const overview = data?.overview,
    analytics = data?.analytics;
  return (
    <section className="meta-dashboard" aria-label="Meta 广告诊断" aria-busy={loading}>
      <div className="section-line">
        <div>
          <h2>广告来源与订单核对</h2>
          <p className="muted">
            站内趋势、观察漏斗与 Shopify
            订单证据。来源为最后记录的有效标签，不能证明后续点击属于该广告；不代表 Meta
            最终归因或佣金。
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
          <div className="meta-connection-strip">
            <span>Pixel：{data.config.enabled ? data.config.pixelId : "未启用"}</span>
            <span>CAPI：{data.config.capi ? "配置齐备" : "未启用或配置不全"}</span>
            <span>目录映射：{data.config.catalogCount} 项</span>
            {data.config.simulation ? (
              <strong>本地模拟验收（非真实 Meta）</strong>
            ) : data.config.testMode ? (
              <strong>测试事件模式（投放前必须关闭）</strong>
            ) : null}
          </div>
          <p className="meta-owner-caption">
            Purchase 由 Shopify 官方集成负责；InitiateCheckout 同样由官方上报，Offy
            的结账准备仅在本地记录。{" "}
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
      <details open ref={scopePanel} className="meta-global-panel">
        <summary>
          筛选范围{" "}
          <strong>
            {scope.from} – {scope.to}
          </strong>
        </summary>
        <div className="meta-global-filters">
          <label>
            统计周期
            <select
              value={period}
              onChange={(e) => {
                const value = e.target.value;
                setPeriod(value);
                if (value !== "custom")
                  setDraft((d) => ({
                    ...d,
                    from: day(Date.now() - (Number(value) - 1) * 86400000),
                    to: day(Date.now()),
                  }));
              }}
            >
              <option value="7">最近 7 天</option>
              <option value="30">最近 30 天</option>
              <option value="custom">自定义日期</option>
            </select>
          </label>
          {period === "custom" && (
            <>
              <label>
                开始日期
                <input
                  type="date"
                  value={draft.from}
                  onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                />
              </label>
              <label>
                结束日期
                <input
                  type="date"
                  value={draft.to}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                />
              </label>
            </>
          )}
          <label>
            流量范围
            <select
              value={draft.source}
              onChange={(e) =>
                setDraft((d) => ({ ...d, source: e.target.value as GlobalScope["source"] }))
              }
            >
              <option value="all">全部站内流量</option>
              <option value="ad">仅带广告 ID 的流量</option>
              <option value="unlabelled">未记录广告 ID 的流量</option>
            </select>
          </label>
          <label>
            广告系列 ID
            <input
              inputMode="numeric"
              value={draft.campaignId}
              onChange={(e) => setDraft((d) => ({ ...d, campaignId: e.target.value.trim() }))}
              placeholder="全部系列"
            />
          </label>
          <label>
            广告 ID
            <input
              inputMode="numeric"
              value={draft.adId}
              onChange={(e) => setDraft((d) => ({ ...d, adId: e.target.value.trim() }))}
              placeholder="全部广告"
            />
          </label>
          <button className="primary" type="button" disabled={loading} onClick={() => applyScope()}>
            应用筛选
          </button>
        </div>
        <label className="meta-test-toggle">
          <input
            type="checkbox"
            checked={draft.includeTests}
            onChange={(e) => setDraft((d) => ({ ...d, includeTests: e.target.checked }))}
          />
          包含内部测试与 Shopify 测试订单
        </label>
        <p className="meta-filter-note">
          日期按 Asia/Shanghai；最多保留 30 天 / 20,000 条记录。修改后点击“应用筛选”。
        </p>
      </details>
      {(loading || error) && data && (
        <p className="meta-snapshot-note" role="status">
          {loading
            ? "正在读取新筛选；当前展示上次成功快照，暂不可下钻。"
            : "读取失败，保留上次快照；请刷新后再核对。"}
        </p>
      )}
      {analytics && (
        <>
          <p className="meta-filter-note">
            当前图表：
            {
              { all: "全部站内流量", ad: "带广告 ID 的流量", unlabelled: "未记录广告 ID 的流量" }[
                analytics.scope.source
              ]
            }
            {analytics.scope.adId ? ` · 广告 ${analytics.scope.adId}` : ""}
            {analytics.scope.campaignId ? ` · 系列 ${analytics.scope.campaignId}` : ""} ·{" "}
            {analytics.scope.includeTests
              ? "包含内部测试"
              : `已排除 ${overview?.excludedTests ?? 0} 条内部测试`}{" "}
            · 更新 {time(analytics.generatedAt)}
          </p>
          <MetaAnalyticsCharts
            data={analytics}
            enabled={data!.config.enabled}
            ordersConfigured={!!data!.config.ordersConfigured}
            sync={overview?.sync ?? null}
            busy={loading || !!error}
            onStage={drillStage}
            onAd={drillAd}
          />
        </>
      )}
      <div className="meta-evidence-heading">
        <div>
          <h3>继续核对原始证据</h3>
          <p className="muted">查看事件、结账与订单记录，定位具体异常。</p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              if (detailsPanel.current) {
                detailsPanel.current.open = true;
                detailsPanel.current.scrollIntoView?.({ block: "start" });
              }
            }}
          >
            查看事件明细 ↓
          </button>
          <button
            type="button"
            onClick={() => {
              if (ordersPanel.current) {
                ordersPanel.current.open = true;
                ordersPanel.current.scrollIntoView?.({ block: "start" });
              }
            }}
          >
            查看订单证据 ↓
          </button>
        </div>
      </div>
      <details className="meta-evidence-section" ref={ordersPanel}>
        <summary>Shopify 订单核对</summary>
        {overview && (
          <section aria-label="Shopify 订单核对">
            <p>
              {!data?.config.ordersConfigured
                ? "Shopify Admin 尚未配置，订单证据暂不可用。"
                : overview.sync?.lastError
                  ? "订单读取暂时失败，将自动重试；以下若有证据为上次读取结果。"
                  : overview.sync?.lastSuccess
                    ? `最近成功读取 ${time(overview.sync.lastSuccess)}${overview.sync.scanning ? " · 分页读取中" : " · 完成扫描后每 15 分钟检查"}`
                    : "等待首次读取；没有证据不等于没有成交。"}
            </p>
            <p className="muted">
              关联本次上线后、许可内且带签名结账编号的订单。金额是 Shopify
              订单总额（含运税），非广告归因金额；不同币种分开显示。下列按事件范围关联，可能包含漏斗前序不完整或范围外创建的订单，不能作为漏斗转化分子。
            </p>
            {overview.currencies.map((c) => (
              <p key={c.currency}>
                <strong>{c.currency}</strong> · {c.orders} 笔有付款历史且未取消的订单 · 总额{" "}
                {decimal(c.totalMinor, c.currency)} · 已退款 {decimal(c.refundedMinor, c.currency)}
              </p>
            ))}
            {overview.orders.length ? (
              <>
                <p className="muted">
                  共 {overview.orderCount} 笔匹配订单，显示最近 {overview.orders.length}{" "}
                  笔；汇总包含全部匹配订单。
                </p>
                <Orders orders={overview.orders} />
              </>
            ) : (
              <p className="muted">尚无匹配订单证据；请同时查看 Shopify 订单与 Meta 报表。</p>
            )}
          </section>
        )}
      </details>
      {data && <SourceHelper origin={data.config.siteUrl ?? "https://isoffy.com"} />}
      <details className="meta-evidence-section" ref={detailsPanel} open>
        <summary>事件明细</summary>
        <p className="meta-filter-note">
          以下筛选仅作用于事件明细，不改变上方趋势和漏斗。旧版结账事件只保留历史证据。
        </p>
        <div className="toolbar meta-detail-filters">
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
                <option value={key} key={key}>
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
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {stage && (
            <button
              type="button"
              onClick={() => {
                setStage("");
                setPage(1);
              }}
            >
              仅看漏斗「{stageLabels[stage]}」队列 ×
            </button>
          )}
        </div>
        {!data && !error && <p role="status">正在读取诊断…</p>}
        {data?.rows.length === 0 && (
          <div className="empty">
            <h3>暂无匹配事件</h3>
            <p>未接入、未许可或保留期外没有记录，不代表没有实际访问。</p>
          </div>
        )}
        {!!data?.rows.length && (
          <div
            className="table-scroll meta-event-table"
            tabIndex={0}
            role="region"
            aria-label="事件明细，可横向滚动"
          >
            <table>
              <thead>
                <tr>
                  <th>事件 / 时间</th>
                  <th>页面</th>
                  <th>广告来源</th>
                  <th>发送状态</th>
                  <th>证据</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{names[row.name] ?? row.name}</strong>
                      <small>{time(row.createdAt)}</small>
                    </td>
                    <td className="code">{row.pagePath}</td>
                    <td className="code">{row.source.ad_id ?? "未记录广告 ID"}</td>
                    <td>{labels[row.status] ?? row.status}</td>
                    <td>
                      <button
                        type="button"
                        disabled={loading || !!error}
                        aria-label={`查看${names[row.name] ?? row.name}事件 ${row.id.slice(0, 8)} 的链路`}
                        onClick={() => void openTrace(row)}
                      >
                        查看链路 ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="section-line meta-pages">
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
      </details>
      {selected && (
        <EvidenceDialog
          onClose={() => {
            traceRequest.current++;
            setSelected(undefined);
            setTrace(undefined);
            setTracing(false);
          }}
        >
          <article className="meta-record meta-selected-record">
            <h3>{names[selected.name] ?? selected.name}</h3>
            <p className="muted">
              {time(selected.createdAt)} · {selected.pagePath}
            </p>
            <p>
              {labels[selected.status] ?? selected.status} ·{" "}
              {selected.data.value !== undefined
                ? `${selected.data.value} ${selected.data.currency}`
                : "金额未记录"}{" "}
              · {selected.data.num_items ?? "—"} 件
            </p>
            <dl>
              <dt>广告来源</dt>
              <dd>{sourceText(selected.source)}</dd>
              <dt>匹配信息</dt>
              <dd>
                Meta 点击标识：{selected.hasFbc ? "有" : "无"}；浏览器标识：
                {selected.hasFbp ? "有" : "无"}。标识存在不代表已归因。
              </dd>
              <dt>浏览器</dt>
              <dd>
                {["CheckoutReady", "InitiateCheckout"].includes(selected.name)
                  ? "Shopify 官方负责结账上报；本条仅站内记录"
                  : selected.pixelAttempted
                    ? "已调用 Pixel，平台接收需另行核对"
                    : "未成功调用 Pixel"}
              </dd>
              <dt>CAPI 尝试</dt>
              <dd>
                {selected.attempts} 次{selected.lastError ? ` · ${selected.lastError}` : ""}
              </dd>
              <dt>事件编号</dt>
              <dd>{selected.id}</dd>
              <dt>结账诊断</dt>
              <dd>
                {selected.attemptId ? (
                  <Link href={`/admin/checkouts?query=${selected.attemptId}`}>
                    {selected.attemptId} ↗
                  </Link>
                ) : (
                  "未关联"
                )}
              </dd>
            </dl>
          </article>
          {tracing && <p role="status">正在读取浏览 → 结账 → 订单…</p>}
          {traceError && (
            <p className="message error" role="alert">
              {traceError}
            </p>
          )}
          {trace && (
            <section className="meta-trace" aria-label="同一浏览器链路">
              <h3>同一浏览器的许可内观察</h3>
              <p className="muted">
                当前日期范围内最多 50 条；表示观察顺序，不等于 Meta 最终归因。
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
        </EvidenceDialog>
      )}
    </section>
  );
}
