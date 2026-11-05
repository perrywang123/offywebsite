"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type {
  DiagnosticDetail,
  DiagnosticList,
  DiagnosticSummary,
} from "@/lib/checkout-diagnostics";

const statusLabels: Record<string, string> = {
  started: "已点击结账",
  client_failed: "浏览器准备失败",
  processing: "服务端处理中",
  failed: "服务端准备失败",
  redirect_ready: "已生成跳转链接",
};
const eventLabels: Record<string, string> = {
  sensitive_unavailable: "完整数据加密不可用（脱敏证据仍保留）",
  started: "点击结账并登记",
  server_received: "服务端收到结账请求",
  catalog_checked: "核对 Shopify 商品",
  shopify_request: "请求创建 Shopify 购物车",
  shopify_response: "收到 Shopify 响应",
  shopify_transport_failed: "Shopify 网络请求失败",
  server_result: "返回结账准备结果",
  client_verification_failed: "浏览器商品验证失败",
  client_timeout: "浏览器请求超时",
  client_error: "浏览器报告异常",
  redirect_requested: "浏览器请求打开结账页",
};
const reasonLabels: Record<string, string> = {
  catalog_unavailable: "商品信息暂时无法核实",
  shopify_error: "Shopify 购物车创建失败",
  shopify_unavailable: "Shopify 尚未配置",
  unknown_items: "部分商品无法找到",
  unavailable_items: "部分商品当前无法购买",
  client_verification_failed: "浏览器商品验证失败",
  client_timeout: "浏览器请求超时",
  client_error: "浏览器报告异常",
  unexpected_checkout_error: "服务端发生异常",
};
const sourceLabel = (s: string) =>
  ({ header: "请求头判定", ip: "IP 地理推测", default: "默认国家" })[s] ?? s;
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const array = (v: unknown) => (Array.isArray(v) ? v : []);
function time(value: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(value);
}
function countryName(code: string) {
  try {
    return `${new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(code)} · ${code}`;
  } catch {
    return code;
  }
}
function Json({ value }: { value: unknown }) {
  return <pre className="diag-json">{JSON.stringify(value, null, 2)}</pre>;
}
async function request(path: string, signal?: AbortSignal, reveal = false) {
  const response = await fetch(`/api/admin/kol/checkouts${path}`, {
    method: reveal ? "POST" : "GET",
    cache: "no-store",
    signal,
    headers: reveal ? { "x-offy-csrf": "1" } : {},
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "登录已过期，请刷新页面后重新登录。"
        : data.error === "diagnostic_payload_expired"
          ? "完整链接与原始响应已到保留期限，脱敏记录仍可查看。"
          : data.error === "diagnostic_payload_unavailable"
            ? "完整链接未能保存，仍可查看脱敏证据与故障阶段。"
            : data.error === "diagnostic_key_unavailable"
              ? "无法解密，请检查主站与后台共用的诊断密钥。"
              : "读取失败，请稍后重试。",
    );
  return data;
}

function AttemptDialog({
  detail,
  onClose,
  opener,
}: {
  detail: DiagnosticDetail;
  onClose: () => void;
  opener: HTMLElement | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [revealed, setRevealed] = useState<{
    checkoutUrl: string | null;
    responses: unknown[];
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const element = dialog.current;
    if (element?.showModal) element.showModal();
    else element?.setAttribute("open", "");
    return () => {
      element?.close?.();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [opener]);
  const catalog = object(detail.events.find((e) => e.type === "catalog_checked")?.data);
  const response = object(detail.events.findLast((e) => e.type === "shopify_response")?.data);
  const body = object(response.body),
    creation = object(object(body.data).cartCreate),
    cart = object(creation.cart);
  const warnings = array(creation.warnings),
    userErrors = [...array(creation.userErrors), ...array(body.errors)];
  const lines = array(object(cart.lines).nodes);
  const reveal = async () => {
    setBusy(true);
    setError("");
    try {
      setRevealed(await request(`/${detail.id}/reveal`, undefined, true));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(revealed!.checkoutUrl!);
      setNotice("结账链接已复制");
    } catch {
      setError("复制失败，可选中链接文本手动复制。");
    }
  };
  return (
    <dialog
      ref={dialog}
      className="admin-dialog diagnostic-dialog"
      aria-label="结账尝试详情"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <small>CHECKOUT / {detail.id.slice(0, 8).toUpperCase()}</small>
          <h2>结账尝试详情</h2>
        </div>
        <button className="icon-button" aria-label="关闭结账详情" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="dialog-content diagnostic-detail">
        <div className="diag-result">
          <span
            className={`badge ${detail.status === "failed" || detail.status === "client_failed" ? "warn" : ""}`}
          >
            {statusLabels[detail.status]}
          </span>
          <span className="muted">{time(detail.createdAt)} · 北京时间</span>
        </div>
        <p className="muted">
          {detail.error
            ? (reasonLabels[detail.error] ?? detail.error)
            : "此记录用于核对结账准备过程，未确认 Shopify 页面到达或支付结果。"}
        </p>
        <dl className="detail-grid">
          <dt>记录编号</dt>
          <dd className="code">{detail.id}</dd>
          <dt>发起页面</dt>
          <dd>{detail.pagePath}</dd>
          <dt>服务端耗时</dt>
          <dd>{detail.durationMs === null ? "尚无服务端最终结果" : `${detail.durationMs} ms`}</dd>
        </dl>
        <section>
          <h3>国家判定</h3>
          <div className="diag-facts">
            <p>
              <small>本次采用</small>
              <strong>{countryName(detail.country)}</strong>
              <span>
                {sourceLabel(detail.countryEvidence.source)}
                {detail.countryEvidence.header ? ` · ${detail.countryEvidence.header}` : ""}
              </span>
            </p>
            <p>
              <small>Shopify 返回</small>
              <strong>{String(object(cart.buyerIdentity).countryCode ?? "尚未返回")}</strong>
              <span>默认配置 {detail.countryEvidence.fallback}</span>
            </p>
          </div>
          <p className="muted small">请求头和 IP 是定位线索，未代表用户已确认收货国家。</p>
          <details>
            <summary>查看国家判定依据</summary>
            <Json value={detail.countryEvidence} />
          </details>
        </section>
        <section>
          <h3>用户选择的商品</h3>
          <div className="diag-item-list">
            {detail.items.map((item, i) => {
              const resolved = object(
                  array(catalog.resolved).find((p) => object(p).code === item.code),
                ),
                product = object(resolved.product),
                name = object(product.name);
              return (
                <div key={`${item.code}-${i}`}>
                  <div>
                    <strong>{String(name.en ?? item.code)}</strong>
                    <small className="code">
                      {item.code}
                      {product.variantId ? ` · ${product.variantId}` : ""}
                    </small>
                  </div>
                  <span className="numbers">× {item.quantity}</span>
                  <span>
                    {typeof product.unitPriceCents === "number"
                      ? `${product.currency} ${(product.unitPriceCents / 100).toFixed(2)}`
                      : "尚未取得价格"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="muted small">
            价格为本次服务端查询快照；Shopify 最终结账价格仍由 Shopify 确定。
          </p>
        </section>
        <section>
          <h3>Shopify 返回结果</h3>
          <dl className="detail-grid">
            <dt>HTTP 状态</dt>
            <dd>{String(response.status ?? "尚未收到响应")}</dd>
            <dt>请求编号</dt>
            <dd className="code">{String(response.requestId ?? "未提供")}</dd>
            <dt>返回数量</dt>
            <dd>{typeof cart.totalQuantity === "number" ? cart.totalQuantity : "未提供"}</dd>
            <dt>结账域名</dt>
            <dd className="code">{detail.redirectHost ?? "未生成"}</dd>
          </dl>
          {(warnings.length > 0 || userErrors.length > 0) && (
            <div className="inline-note">
              {[...userErrors, ...warnings].map((value, i) => {
                const item = object(value);
                return (
                  <p key={i}>
                    <strong>{String(item.code ?? "SHOPIFY_ERROR")}</strong>
                    <br />
                    {String(item.message ?? "请查看响应明细")}
                  </p>
                );
              })}
            </div>
          )}
          {lines.length > 0 && (
            <details>
              <summary>查看 Shopify 实际购物车商品（{lines.length} 行）</summary>
              <Json value={lines} />
            </details>
          )}
          {object(object(cart.lines).pageInfo).hasNextPage === true && (
            <p className="reason">返回行存在分页，当前响应并非完整商品清单。</p>
          )}
          <p className="muted small">
            Shopify 警告会完整保留在响应中；本次诊断功能不新增购买拦截规则。
          </p>
        </section>
        <section>
          <h3>链路事件</h3>
          <ol className="diag-timeline">
            {detail.events.map((event) => (
              <li key={event.id}>
                <span className="diag-dot" />
                <div>
                  <strong>{eventLabels[event.type] ?? event.type}</strong>
                  <small>
                    {time(event.at)} · +{Math.max(0, event.at - detail.createdAt)} ms
                    {event.type.startsWith("client_") || event.type === "redirect_requested"
                      ? " · 浏览器报告"
                      : " · 服务端记录"}
                  </small>
                  <details>
                    <summary>查看阶段数据</summary>
                    <Json value={event.data} />
                  </details>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h3>完整链接与原始响应</h3>
          <p className="muted small">
            加密保留至 {time(detail.sensitiveExpiresAt)}
            。查看会记录管理员审计；链接可能已失效，也可能影响现有购物车，请仅用于排查。
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          {!revealed ? (
            <button
              disabled={busy || detail.sensitiveExpiresAt <= Date.now()}
              onClick={() => void reveal()}
            >
              {detail.sensitiveExpiresAt <= Date.now()
                ? "完整数据已过期"
                : busy
                  ? "正在解密…"
                  : "查看完整链接与响应"}
            </button>
          ) : (
            <div className="diag-sensitive">
              {revealed.checkoutUrl ? (
                <>
                  <label>
                    Shopify 原始结账链接
                    <textarea readOnly value={revealed.checkoutUrl} rows={3} />
                  </label>
                  <button onClick={() => void copy()}>复制结账链接</button>
                </>
              ) : (
                <p>本次尝试未生成跳转链接。</p>
              )}
              <details>
                <summary>查看原始 Shopify 响应</summary>
                <Json value={revealed.responses} />
              </details>
            </div>
          )}
        </section>
      </div>
    </dialog>
  );
}

export function CheckoutDiagnostics() {
  const [data, setData] = useState<DiagnosticList | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState("");
  const [country, setCountry] = useState(""),
    [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [parameters, setParameters] = useState(""),
    [revision, setRevision] = useState(0),
    [detail, setDetail] = useState<DiagnosticDetail | null>(null),
    [opening, setOpening] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const detailRequest = useRef<AbortController | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const dateRangeError = from && to && from > to ? "结束日期不能早于开始日期" : "";
  const hasFilters = Boolean(query || country || status || from || to || parameters);
  const advancedCount = [country, status, from, to].filter(Boolean).length;
  const filterSummary = [
    country ? `国家 ${country.toUpperCase()}` : "",
    status ? `结果 ${statusLabels[status]}` : "",
    from ? `自 ${from}` : "",
    to ? `至 ${to}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQuery(p.get("query") ?? "");
    setCountry(p.get("country") ?? "");
    setStatus(p.get("status") ?? "");
    setFrom(p.get("dateFrom") ?? "");
    setTo(p.get("dateTo") ?? "");
    setParameters(p.toString());
    setReady(true);
    return () => detailRequest.current?.abort();
  }, []);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const p = new URLSearchParams(parameters);
    p.delete("dateFrom");
    p.delete("dateTo");
    void request(`?${p}`, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError((e as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [parameters, revision, ready]);
  const apply = (e: FormEvent) => {
    e.preventDefault();
    if (dateRangeError) return;
    const p = new URLSearchParams();
    if (query.trim()) p.set("query", query.trim());
    if (country.trim()) p.set("country", country.trim().toUpperCase());
    if (status) p.set("status", status);
    if (from) {
      p.set("from", String(Date.parse(`${from}T00:00:00+08:00`)));
      p.set("dateFrom", from);
    }
    if (to) {
      p.set("to", String(Date.parse(`${to}T00:00:00+08:00`) + 86400000));
      p.set("dateTo", to);
    }
    p.set("page", "1");
    changeParameters(p);
  };
  const changeParameters = (p: URLSearchParams) => {
    setParameters(p.toString());
    window.history.replaceState(null, "", `${window.location.pathname}${p.size ? `?${p}` : ""}`);
  };
  const reset = () => {
    setQuery("");
    setCountry("");
    setStatus("");
    setFrom("");
    setTo("");
    changeParameters(new URLSearchParams());
  };
  const open = useCallback(async (row: DiagnosticSummary) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setOpening(row.id);
    setError("");
    try {
      const result = await request(`/${row.id}`, controller.signal);
      if (!controller.signal.aborted) setDetail(result);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setOpening(null);
    }
  }, []);
  return (
    <section className="checkout-diagnostics" aria-label="结账诊断记录">
      <div className="inline-note">
        <p>无需邮箱，查看每一次 Offy 结账准备。已生成链接不代表到达 Shopify 或付款成功。</p>
        <details>
          <summary>记录范围与保留期限</summary>
          <p>
            记录已收到的请求；Shop 原生购买不经过此链路。记录保留 30 天，完整链接与原始响应保留 7
            天。时间均为北京时间。
          </p>
        </details>
      </div>
      <form
        className="diagnostic-filters"
        onSubmit={apply}
        onInvalidCapture={() => setAdvancedOpen(true)}
      >
        <div className="diagnostic-query">
          <label className="diag-search">
            编号或商品
            <input
              aria-label="编号或商品"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索编号、商品名或 handle"
              maxLength={200}
            />
          </label>
          <button type="submit" className="primary" disabled={loading || Boolean(dateRangeError)}>
            筛选记录
          </button>
        </div>
        <div className="filter-panel-controls">
          <button
            type="button"
            className="filter-toggle"
            aria-expanded={advancedOpen}
            aria-controls="diagnostic-advanced"
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            更多筛选{advancedCount ? `（${advancedCount}项）` : ""}
            <span aria-hidden>{advancedOpen ? "⌃" : "⌄"}</span>
          </button>
          {hasFilters && (
            <button type="button" onClick={reset}>
              清空筛选
            </button>
          )}
        </div>
        {filterSummary && <p className="filter-summary">已选：{filterSummary}</p>}
        <div
          id="diagnostic-advanced"
          className={advancedOpen ? "diagnostic-advanced is-expanded" : "diagnostic-advanced"}
          role="group"
          aria-label="诊断高级筛选"
        >
          <label>
            国家代码
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="如 US"
              maxLength={2}
              pattern="[a-zA-Z]{2}"
            />
          </label>
          <label>
            准备结果
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部结果</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-date-range" role="group" aria-label="诊断日期范围">
            <label>
              开始日期
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              结束日期
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from || undefined}
                aria-invalid={Boolean(dateRangeError)}
                aria-describedby={dateRangeError ? "diagnostic-date-error" : undefined}
              />
            </label>
          </div>
        </div>
      </form>
      {dateRangeError && (
        <p className="message error" id="diagnostic-date-error" role="alert">
          {dateRangeError}。列表仍显示上次筛选结果，请先调整日期。
        </p>
      )}
      <div className="section-line">
        <div>
          <strong>{data ? `${data.total} 次结账尝试` : "结账尝试记录"}</strong>
          <small className="muted"> · 独立记录每次发起，不等同访客数或订单数</small>
        </div>
        <button disabled={loading} onClick={() => setRevision((r) => r + 1)}>
          {loading ? "读取中…" : "刷新记录"}
        </button>
      </div>
      {error && (
        <p role="alert" className="message error">
          {error}
        </p>
      )}
      {loading ? (
        <p className="empty" role="status">
          正在读取结账记录…
        </p>
      ) : !error && data && data.rows.length === 0 ? (
        <div className="empty">
          <h2>{parameters ? "没有符合筛选条件的记录" : "暂无结账记录"}</h2>
          <p>用户从 Offy 发起结账后，国家、商品和 Shopify 返回结果将在这里显示。</p>
        </div>
      ) : (
        !error &&
        data && (
          <>
            <div className="diagnostic-list">
              <div className="diagnostic-list-head" aria-hidden="true">
                <span>发起时间 / 编号</span>
                <span>选择的商品</span>
                <span>判定国家</span>
                <span>准备结果</span>
                <span>操作</span>
              </div>
              <div role="list">
                {data.rows.map((row) => (
                  <article role="listitem" className="diagnostic-row" key={row.id}>
                    <div>
                      <strong className="numbers">{time(row.createdAt)}</strong>
                      <small className="code">{row.id.slice(0, 8).toUpperCase()}</small>
                    </div>
                    <div className="diag-products">
                      {row.items.map((item, i) => (
                        <p key={`${item.code}-${i}`}>
                          {row.itemNames?.[item.code] ?? item.code} × {item.quantity}
                          {row.itemNames?.[item.code] && (
                            <small className="code">{item.code}</small>
                          )}
                        </p>
                      ))}
                    </div>
                    <div>
                      <strong>{countryName(row.country)}</strong>
                      <small>{sourceLabel(row.countryEvidence.source)}</small>
                    </div>
                    <div>
                      <span
                        className={`badge ${row.status === "failed" || row.status === "client_failed" ? "warn" : ""}`}
                      >
                        {statusLabels[row.status]}
                      </span>
                      {(row.warningCount ?? 0) > 0 && (
                        <small className="reason">Shopify 警告 {row.warningCount} 条</small>
                      )}
                      <small>
                        {row.error
                          ? (reasonLabels[row.error] ?? row.error)
                          : row.durationMs === null
                            ? "尚无最终结果"
                            : `${row.durationMs} ms · 未确认付款`}
                      </small>
                    </div>
                    <div>
                      <button
                        onClick={(e) => {
                          opener.current = e.currentTarget;
                          e.currentTarget.focus();
                          void open(row);
                        }}
                        disabled={opening === row.id}
                      >
                        {opening === row.id ? "读取中…" : "查看详情"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="diagnostic-pagination">
              <span>
                第 {data.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))} 页 · 每页{" "}
                {data.pageSize} 条
              </span>
              <div>
                <button
                  disabled={data.page <= 1}
                  onClick={() => {
                    const p = new URLSearchParams(parameters);
                    p.set("page", String(data.page - 1));
                    changeParameters(p);
                  }}
                >
                  上一页
                </button>
                <button
                  disabled={data.page * data.pageSize >= data.total}
                  onClick={() => {
                    const p = new URLSearchParams(parameters);
                    p.set("page", String(data.page + 1));
                    changeParameters(p);
                  }}
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )
      )}
      {detail && (
        <AttemptDialog
          key={detail.id}
          detail={detail}
          opener={opener.current}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}
