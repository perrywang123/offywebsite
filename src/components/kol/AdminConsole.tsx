"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Snapshot } from "@/server/kol/snapshot";
import type { Cooperation } from "@/server/kol/core";
import type { Campaign } from "@/server/kol/codes";
import { decimal } from "@/server/kol/money";
import { CheckoutDiagnostics } from "./CheckoutDiagnostics";
type View = "partners" | "codes" | "orders" | "settlements" | "checkouts";
type ConfirmationAction = { kind: string; id: string; title: string };
type Filters = {
  query: string;
  kolFilter: string;
  currencyFilter: string;
  statusFilter: string;
  from: string;
  to: string;
};
type Data = Snapshot & { admin: { email: string }; siteUrl: string; settlementsEnabled: boolean };
type Partner = Snapshot["partners"][number];
const nav = [
  ["partners", "01", "合作达人"],
  ["codes", "02", "优惠码管理"],
  ["orders", "03", "订单佣金"],
  ["settlements", "04", "月度结算"],
  ["checkouts", "05", "结账诊断"],
] as const;
const labels: Record<string, string> = {
  active: "合作中",
  scheduled: "未开始",
  expired: "已到期",
  paused: "已暂停",
  draft: "草稿",
  verified: "已核验",
  unattributed: "无链接归因",
  review: "待核查",
  bound: "已绑定",
  ended: "绑定已结束",
  queued: "等待同步",
  sending: "提交中",
  pending: "同步中",
  uncertain: "待远端核对",
  failed: "同步失败",
  locked: "已锁定",
  needs_review: "需重建核对",
  paid: "已登记付款",
  canceled: "已取消",
  ACTIVE: "活动中",
  EXPIRED: "已到期",
  SCHEDULED: "未开始",
};
const errorLabels: Record<string, string> = {
  invalid_credentials: "邮箱或密码错误",
  login_throttled: "尝试次数过多，请15分钟后重试",
  invalid_input: "请检查表单内容",
  already_reserved: "别名或代码已被占用",
  code_not_found: "Shopify中未找到此码",
  write_discounts_required: "缺少write_discounts权限，仍可绑定已有码",
  no_available_entries: "该币种暂无已解冻、未结算的佣金条目",
  settlement_launch_gate_disabled: "正式结算开关尚未开启",
  invalid_settlement_state: "当前批次状态不允许此操作",
  reconciliation_required: "需要重新核对订单后再操作",
  settlement_changed: "订单或批次已变化，请取消并重建草稿",
  campaign_not_eligible: "该活动不可追加代码，请选择有效的原生活动",
  code_reserved: "此代码已被占用，历史码不能转给另一位KOL",
  shopify_admin_not_configured: "Shopify Admin连接尚未配置",
  shopify_admin_credentials_incomplete: "Shopify应用凭据不完整，请同时配置Client ID和Client Secret",
  shopify_admin_auth_network_error: "暂时无法获取Shopify令牌，系统会稍后重试",
  shopify_admin_auth_invalid_response:
    "Shopify令牌响应异常，系统会稍后重试；持续失败时请检查应用配置",
  shopify_admin_auth_unsafe_origin: "Shopify店铺域名配置无效，请使用本店的myshopify.com域名",
  shopify_admin_network_error: "Shopify连接失败，请稍后重试",
  shopify_admin_http_401: "Shopify认证失败，请检查应用凭据或手动令牌是否有效",
  shopify_admin_graphql_error: "Shopify查询失败，请检查权限及API版本",
  order_unavailable_or_scope: "订单读取失败，请检查订单权限（超过60天需历史权限）",
  cooperation_not_eligible: "合作已暂停或到期，不能发码",
  operation_failed: "操作未完成，请核对状态后重试",
};
function errorLabel(reason: string) {
  if (/^shopify_admin_auth_http_\d+$/.test(reason))
    return "Shopify令牌获取失败，请检查应用安装和服务器凭据；系统会稍后重试";
  return errorLabels[reason] || reason;
}
const fieldLabels: Record<string, string> = {
  name: "KOL 名称",
  alias: "推广别名",
  platform: "平台",
  email: "联系邮箱",
  socialUrl: "社媒主页",
  rate: "自定义佣金",
  startsAt: "合作开始日",
  endsAt: "合作结束日",
  target: "链接打开页面",
  status: "合作状态",
  contractUrl: "合同链接",
  contractStatus: "签署状态",
  videos: "视频交付",
  payout: "收款备注",
  notes: "合作备注",
};
function date(value: number | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "—";
}
function money(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return "—";
  try {
    return `${currency} ${decimal(value, currency)}`;
  } catch {
    return "—";
  }
}
function effectiveStatus(p: Partner) {
  if (p.status !== "active") return p.status;
  const now = Date.now();
  if (now < Date.parse(`${p.terms.startsAt}T00:00:00+08:00`)) return "scheduled";
  if (now >= Date.parse(`${p.terms.endsAt}T00:00:00+08:00`) + 86400000) return "expired";
  return "active";
}
function Badge({ status }: { status: string }) {
  return (
    <span
      className={`badge ${["verified", "bound", "paid", "ACTIVE"].includes(status) ? "good" : ["failed", "review", "needs_review", "uncertain"].includes(status) ? "warn" : ""}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
async function api(path: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(`/api/admin/kol/${path}`, {
    method: body === undefined ? "GET" : "POST",
    cache: "no-store",
    headers: body === undefined ? {} : { "Content-Type": "application/json", "x-offy-csrf": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
  const data = await response.json().catch(() => ({ error: "operation_failed" }));
  if (!response.ok) {
    const details =
      data.error === "invalid_input" && Array.isArray(data.details)
        ? data.details
            .filter(
              (d: { field?: string; message?: string }) =>
                typeof d.message === "string" && typeof d.field === "string",
            )
            .map(
              (d: { field: string; message: string }) =>
                `${fieldLabels[d.field] ?? "表单"}：${d.message}`,
            )
            .join("；")
        : "";
    throw Object.assign(new Error(details || errorLabel(data.error ?? "") || "连接失败"), {
      status: response.status,
    });
  }
  return data;
}
function Dialog({
  title,
  onClose,
  children,
  error,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  error?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    d?.showModal?.();
    return () => {
      d?.close?.();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (error) ref.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
  }, [error]);
  return (
    <dialog
      ref={ref}
      className="admin-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>
      {error && (
        <p className="dialog-content error" role="alert" tabIndex={-1}>
          {error}
        </p>
      )}
      {children}
    </dialog>
  );
}
export function AdminConsole({ view }: { view: View }) {
  const [data, setData] = useState<Data | null>(null),
    [login, setLogin] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(false);
  const stateRequest = useRef<AbortController | null>(null);
  const hasSnapshot = useRef(false);
  const [filters, setFilters] = useState<Partial<Record<View, Partial<Filters>>>>({});
  const [orderFiltersOpen, setOrderFiltersOpen] = useState(false);
  const {
    query = "",
    kolFilter = "",
    currencyFilter = "",
    statusFilter = "",
    from = "",
    to = "",
  } = filters[view] ?? {};
  const setFilter = (field: keyof Filters, value: string) =>
    setFilters((previous) => ({ ...previous, [view]: { ...previous[view], [field]: value } }));
  const hasFilters = Object.values(filters[view] ?? {}).some(Boolean);
  const clearFilters = () => setFilters((previous) => ({ ...previous, [view]: {} }));
  const [editor, setEditor] = useState<Partner | "new" | null>(null),
    [detail, setDetail] = useState<Partner | null>(null),
    [codeMode, setCodeMode] = useState<"bind" | "generate" | null>(null),
    [candidateCode, setCandidateCode] = useState(""),
    [connection, setConnection] = useState<{
      scopes: string[];
      campaigns: { nodes: Campaign[]; truncated: boolean };
    } | null>(null),
    [connectionError, setConnectionError] = useState(""),
    [showHealth, setShowHealth] = useState(false),
    [settleForm, setSettleForm] = useState(false);
  const [action, setAction] = useState<ConfirmationAction | null>(null);
  const openAction = (value: ConfirmationAction) => {
    setError("");
    setAction(value);
  };
  const closeDialogs = useCallback(() => {
    setEditor(null);
    setDetail(null);
    setCodeMode(null);
    setCandidateCode("");
    setConnection(null);
    setConnectionError("");
    setShowHealth(false);
    setSettleForm(false);
    setAction(null);
  }, []);
  const expireSession = useCallback(() => {
    hasSnapshot.current = false;
    setLogin(true);
    setData(null);
    setFilters({});
    closeDialogs();
  }, [closeDialogs]);
  const refresh = useCallback(async () => {
    stateRequest.current?.abort();
    const controller = new AbortController();
    stateRequest.current = controller;
    setRefreshing(true);
    try {
      const d = await api("state", undefined, controller.signal);
      if (controller.signal.aborted) return;
      hasSnapshot.current = true;
      setData(d);
      setLogin(false);
      setError("");
    } catch (e) {
      if (controller.signal.aborted) return;
      if ((e as { status?: number }).status === 401) {
        expireSession();
      } else
        setError(
          `${hasSnapshot.current ? "刷新失败，当前显示上次读取的数据" : "连接失败"}：${(e as Error).message}`,
        );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [expireSession]);
  useEffect(() => {
    closeDialogs();
    setError("");
    setNotice("");
    void refresh();
    return () => stateRequest.current?.abort();
  }, [view, refresh, closeDialogs]);
  const operate = async (path: string, body: unknown, message: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await api(path, body);
      setNotice(result.busy ? "同步任务正在运行，请稍后刷新" : message);
      await refresh();
      return result;
    } catch (e) {
      if ((e as { status?: number }).status === 401) {
        stateRequest.current?.abort();
        expireSession();
      }
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  const loadConnection = async () => {
    setConnectionError("");
    try {
      setConnection(await api("connection"));
    } catch (e) {
      setConnection(null);
      setConnectionError((e as Error).message);
    }
  };
  const openCode = (mode: "bind" | "generate") => {
    setError("");
    setCandidateCode("");
    setCodeMode(mode);
    void loadConnection();
  };
  const openSettlement = () => {
    setError("");
    setSettleForm(true);
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("已复制到剪贴板");
    } catch {
      setError("复制失败，请在详情中选取文本复制。");
    }
  };
  const loginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const result = await operate("login", Object.fromEntries(f), "登录成功");
    if (result) setLogin(false);
  };
  if (loading)
    return (
      <div className="standalone">
        <p className="wordmark">OFFY / PARTNERS</p>
        <h1>正在连接合作账簿…</h1>
      </div>
    );
  if (login)
    return (
      <main className="standalone">
        <p className="wordmark">OFFY / PARTNERS</p>
        <h1>合作账簿</h1>
        <p className="muted">仅限品牌管理员。请输入管理员账号。</p>
        <form onSubmit={loginSubmit} className="login-form">
          <label>
            管理员邮箱
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            密码
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "验证中…" : "登录后台"}
          </button>
        </form>
      </main>
    );
  if (!data)
    return (
      <main className="standalone">
        <p className="wordmark">OFFY / PARTNERS</p>
        <h1>暂时无法读取账簿</h1>
        <p role="alert">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            void refresh();
          }}
        >
          重新连接
        </button>
      </main>
    );
  const name = (id: string | null) => data.partners.find((p) => p.id === id)?.name ?? "—";
  const title = nav.find((n) => n[0] === view)!;
  const partners = data.partners.filter(
    (p) =>
      !query ||
      [p.name, p.alias, p.terms.email].join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const dateRangeError = from && to && from > to ? "付款止日不能早于付款起日" : "";
  const orderFilterCount = [kolFilter, currencyFilter, statusFilter, from, to].filter(
    Boolean,
  ).length;
  const orderFilterSummary = [
    kolFilter ? `达人 ${name(kolFilter)}` : "",
    currencyFilter ? `币种 ${currencyFilter}` : "",
    statusFilter ? `状态 ${labels[statusFilter]}` : "",
    from ? `付款自 ${from}` : "",
    to ? `至 ${to}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const orders = data.orders.filter(
    (o) =>
      (!kolFilter || o.kolId === kolFilter) &&
      (!currencyFilter || o.currency === currencyFilter) &&
      (!statusFilter || o.status === statusFilter) &&
      (!query || o.name.toLowerCase().includes(query.toLowerCase())) &&
      (!from || (o.paidAt ?? 0) >= Date.parse(`${from}T00:00:00+08:00`)) &&
      (!to || (o.paidAt ?? 0) < Date.parse(`${to}T00:00:00+08:00`) + 86400000),
  );
  const codes = data.codes.filter(
    (c) => !query || `${name(c.kolId)} ${c.normalized}`.toLowerCase().includes(query.toLowerCase()),
  );
  const settlements = data.settlements.filter(
    (s) =>
      !query || `${name(s.kolId)} ${s.month} ${s.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const actionTarget = action?.kind.startsWith("codes/")
    ? data.codes.find((c) => c.id === action.id)
    : undefined;
  const actionOrder = action?.kind.startsWith("orders/")
    ? data.orders.find((o) => o.id === action.id)
    : undefined;
  const actionSettlement = action?.kind.startsWith("settlements/")
    ? data.settlements.find((s) => s.id === action.id)
    : undefined;
  const pack = (p: Partner) => {
    const c = data.codes.find(
      (c) =>
        effectiveStatus(p) === "active" &&
        c.kolId === p.id &&
        c.status === "bound" &&
        c.remoteStatus === "ACTIVE",
    );
    return `${p.name} × OFFY\n合作状态：${labels[effectiveStatus(p)]}（非有效合作不可对外推广）\n推广链接：${data.siteUrl}/r/${p.alias}\n${c ? `粉丝优惠码：${c.normalized}\n权益以Shopify结账为准（最近核验 ${date(c.syncedAt)}）` : "尚无已核验的活动中优惠码"}\n合作佣金：${p.rateBps / 100}%（仅当次有效链接session成交；按税前商品净额）\n合作日期：${p.terms.startsAt} — ${p.terms.endsAt}`;
  };
  return (
    <div
      className="admin-shell"
      onClickCapture={(event) => {
        const button = (event.target as Element).closest("button");
        if (button && !button.closest("dialog")) button.focus({ preventScroll: true });
      }}
    >
      <aside className="sidebar">
        <Link className="wordmark" href="/admin">
          OFFY<span>PARTNER LEDGER</span>
        </Link>
        <p className="sidebar-label">品牌合作管理</p>
        <nav aria-label="后台导航">
          {nav.map(([key, num, label]) => (
            <Link key={key} href={`/admin/${key}`} aria-current={view === key ? "page" : undefined}>
              <span>{num}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            当次链接归因
            <br />
            Shopify 事实账本
          </p>
          <small>{data.admin.email}</small>
          <button onClick={() => void operate("logout", {}, "已退出")}>退出登录 ↗</button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="page-heading">
          <div>
            <p className="eyebrow">
              OFFY / COLLABORATIONS <span>{title[1]}</span>
            </p>
            <h1>{title[2]}</h1>
            <p className="muted">
              {view === "partners"
                ? "一位达人，一份清晰可核对的合作。"
                : view === "codes"
                  ? "代码在这里绑定，粉丝权益由 Shopify 执行。"
                  : view === "orders"
                    ? "只有可核验的当次链接成交，才进入佣金账本。"
                    : view === "checkouts"
                      ? "从一次点击，到 Shopify 响应，每一步都有据可查。"
                      : "先核对，再锁单；线下付款，账内留痕。"}
            </p>
          </div>
          <div className="header-actions">
            <button
              className="connection-button"
              onClick={() => {
                setError("");
                setShowHealth(true);
                void loadConnection();
              }}
            >
              连接与同步 <span aria-hidden>↗</span>
            </button>
            <button className="mobile-logout" onClick={() => void operate("logout", {}, "已退出")}>
              退出登录
            </button>
          </div>
        </header>
        {data.health.shopifyAdminConfigured === false && (
          <p className="message" role="status">
            未配置 Shopify Admin
            连接凭据（应用凭据或手动令牌），订单同步与优惠码功能暂不可用。本地合作记录和结账诊断可正常查看。
          </p>
        )}
        {view === "checkouts" && <CheckoutDiagnostics />}
        {error && !editor && !detail && !codeMode && !settleForm && !action && !showHealth && (
          <div className="message error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="关闭错误">
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="message" role="status">
            {notice}
            <button onClick={() => setNotice("")} aria-label="关闭提示">
              ×
            </button>
          </div>
        )}
        {view !== "checkouts" && (
          <div className={view === "orders" ? "toolbar orders-toolbar" : "toolbar"}>
            <div className="search">
              <label htmlFor="admin-search">搜索</label>
              <input
                id="admin-search"
                placeholder={
                  view === "orders"
                    ? "搜索订单号"
                    : view === "codes"
                      ? "搜索达人 / 优惠码"
                      : view === "settlements"
                        ? "搜索达人 / 月份 / 批次"
                        : "搜索姓名 / 别名 / 邮箱"
                }
                value={query}
                onChange={(e) => setFilter("query", e.target.value)}
              />
            </div>
            <div className="toolbar-actions">
              {hasFilters && view !== "orders" && <button onClick={clearFilters}>清空筛选</button>}
              <button
                className="refresh-button"
                disabled={busy || refreshing}
                onClick={() => void refresh()}
              >
                {refreshing ? "更新中…" : "刷新数据"}
              </button>
              {view === "partners" && (
                <button
                  className="primary"
                  onClick={() => {
                    setError("");
                    setEditor("new");
                  }}
                >
                  ＋ 新增合作
                </button>
              )}
              {view === "codes" && (
                <>
                  <button onClick={() => openCode("bind")}>绑定已有码</button>
                  <button className="primary" onClick={() => openCode("generate")}>
                    生成新码并同步
                  </button>
                </>
              )}
              {view === "settlements" && (
                <button
                  className="primary"
                  disabled={!data.settlementsEnabled}
                  onClick={openSettlement}
                >
                  ＋ 创建月结草稿
                </button>
              )}
            </div>
          </div>
        )}
        {view === "partners" && (
          <>
            <div className="section-line">
              <p>
                {query
                  ? `匹配 ${partners.length} / 共 ${data.partners.length} 位合作达人`
                  : `${partners.length} 位合作达人`}
              </p>
              <small>访问为过滤后请求次数；到站按链路确认去重。访客自然人数不可确认。</small>
            </div>
            <div className="partner-list">
              {partners.length ? (
                partners.map((p) => (
                  <article className="partner-row" key={p.id}>
                    <div className="partner-identity">
                      <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
                      <div>
                        <button
                          className="text-button partner-name"
                          onClick={() => {
                            setError("");
                            setDetail(p);
                          }}
                        >
                          {p.name}
                        </button>
                        <p className="muted">
                          {p.terms.platform} / {p.alias}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Badge status={effectiveStatus(p)} />
                      <p className="muted small">
                        {p.terms.startsAt} — {p.terms.endsAt}
                      </p>
                    </div>
                    <div>
                      <small>自定义佣金</small>
                      <strong className="rate">
                        {p.rateBps / 100}
                        <span>%</span>
                      </strong>
                    </div>
                    <div>
                      <small>链接访问 / 到站</small>
                      <strong className="numbers">
                        {p.requests} <span>/ {p.landings}</span>
                      </strong>
                    </div>
                    <div className="partner-revenue">
                      <small>已核验商品净额 / 佣金</small>
                      {p.metrics.length ? (
                        p.metrics.map((m) => (
                          <p className="numbers" key={m.currency}>
                            {money(m.net, m.currency)}
                            <br />
                            <small>
                              佣金 {money(m.commission, m.currency)} · {m.orders} 单 / {m.sessions}{" "}
                              成交会话
                            </small>
                          </p>
                        ))
                      ) : (
                        <p className="muted">尚无已核验订单</p>
                      )}
                    </div>
                    <div className="row-actions">
                      <button
                        disabled={effectiveStatus(p) !== "active"}
                        onClick={() => void copy(pack(p))}
                      >
                        复制合作包 ↗
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setError("");
                          setEditor(p);
                        }}
                      >
                        编辑合作
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <Empty
                  title={query ? "未找到匹配的合作" : "还没有合作达人"}
                  text={
                    query
                      ? "更换关键词后再试。"
                      : "新增合作并填写自定义佣金，即可获得专属推广链接。"
                  }
                  onReset={query ? clearFilters : undefined}
                  action={
                    !query
                      ? {
                          label: "创建第一份合作",
                          run: () => {
                            setError("");
                            setEditor("new");
                          },
                        }
                      : undefined
                  }
                />
              )}
            </div>
          </>
        )}
        {view === "codes" && (
          <>
            <p className="inline-note">
              暂停合作或结束本地绑定，不会停用 Shopify
              优惠码。不同代码可能共享同一活动规则与总额度。
            </p>
            <div className="table-wrap" role="region" aria-label="优惠码清单" tabIndex={0}>
              <p className="table-scroll-hint">可左右滚动查看全部字段</p>
              <table role="table" aria-label="优惠码清单">
                <thead role="rowgroup">
                  <tr role="row">
                    <th role="columnheader">KOL / 优惠码</th>
                    <th role="columnheader">来源与状态</th>
                    <th role="columnheader">Shopify 活动摘要</th>
                    <th role="columnheader">最近核验</th>
                    <th role="columnheader">操作</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {codes.map((c) => (
                    <tr role="row" key={c.id}>
                      <td data-label="KOL / 优惠码" role="cell">
                        {name(c.kolId)}
                        <strong className="code">{c.normalized}</strong>
                      </td>
                      <td data-label="来源与状态" role="cell">
                        {c.source === "generated" ? "Offy生成" : "Shopify已有"}
                        <div>
                          <Badge status={c.status} /> <Badge status={c.remoteStatus} />
                        </div>
                      </td>
                      <td className="summary-cell" data-label="Shopify 活动摘要" role="cell">
                        {c.summary}
                        <small className="muted code">{c.campaignId}</small>
                      </td>
                      <td data-label="最近核验" role="cell">
                        {date(c.syncedAt)}
                      </td>
                      <td data-label="操作" role="cell">
                        <div className="table-actions">
                          <button
                            disabled={busy}
                            onClick={() =>
                              void operate("codes/refresh", { id: c.id }, "已重新核验Shopify状态")
                            }
                          >
                            核验状态
                          </button>
                          {c.status === "bound" && (
                            <>
                              <button onClick={() => void copy(c.normalized)}>复制代码</button>
                              <button
                                className="danger-button"
                                onClick={() =>
                                  openAction({
                                    kind: "codes/end",
                                    id: c.id,
                                    title: "结束本地绑定",
                                  })
                                }
                              >
                                结束绑定
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!codes.length && (
                <Empty
                  title={query ? "未找到匹配优惠码" : "尚未绑定优惠码"}
                  text={
                    query
                      ? "更换关键词，或清空筛选查看全部代码。"
                      : "可绑定Shopify已有码，或向已有活动追加一个唯一代码。"
                  }
                  onReset={query ? clearFilters : undefined}
                  action={
                    !query
                      ? {
                          label: "绑定 Shopify 优惠码",
                          run: () => openCode("bind"),
                        }
                      : undefined
                  }
                />
              )}
            </div>
            <section className="subsection">
              <div className="section-line">
                <h2>发码任务</h2>
                <button
                  disabled={busy}
                  onClick={() => void operate("sync", {}, "已执行一轮同步，请刷新查看任务结果")}
                >
                  核对任务
                </button>
              </div>
              <div className="table-wrap" role="region" aria-label="发码任务清单" tabIndex={0}>
                <p className="table-scroll-hint">可左右滚动查看全部字段</p>
                <table role="table" aria-label="发码任务清单">
                  <thead role="rowgroup">
                    <tr role="row">
                      <th role="columnheader">KOL / 候选码</th>
                      <th role="columnheader">任务状态</th>
                      <th role="columnheader">说明</th>
                      <th role="columnheader">操作</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {data.jobs.map((j) => (
                      <tr role="row" key={j.id}>
                        <td data-label="KOL / 候选码" role="cell">
                          {name(j.kolId)}
                          <strong className="code">{j.candidate}</strong>
                        </td>
                        <td data-label="任务状态" role="cell">
                          <Badge status={j.status} />
                        </td>
                        <td className="summary-cell" data-label="说明" role="cell">
                          {j.status === "bound"
                            ? "远端已确认并完成绑定"
                            : (j.error ?? "远端确认前不可分发；旧绑定继续保留")}
                          <small className="code muted">{j.id}</small>
                        </td>
                        <td data-label="操作" role="cell">
                          {j.status !== "bound" && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                void operate(
                                  "codes/retry",
                                  { id: j.id },
                                  "已安排使用原操作和原码再次核对",
                                )
                              }
                            >
                              重试 / 核对
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.jobs.length && (
                  <Empty
                    compact
                    title="没有发码任务"
                    text="只有生成新码需要异步同步；已有绑定会直接核验。"
                  />
                )}
              </div>
            </section>
          </>
        )}
        {view === "orders" && (
          <>
            <div className="filter-panel-controls">
              <button
                className="filter-toggle"
                type="button"
                aria-expanded={orderFiltersOpen}
                aria-controls="order-filters"
                onClick={() => setOrderFiltersOpen((open) => !open)}
              >
                筛选条件{orderFilterCount ? `（${orderFilterCount}项）` : ""}
                <span aria-hidden>{orderFiltersOpen ? "⌃" : "⌄"}</span>
              </button>
              {hasFilters && (
                <button type="button" onClick={clearFilters}>
                  清空筛选
                </button>
              )}
            </div>
            {orderFilterSummary && <p className="filter-summary">已选：{orderFilterSummary}</p>}
            <div
              id="order-filters"
              className={orderFiltersOpen ? "filters is-expanded" : "filters"}
              role="group"
              aria-label="订单高级筛选"
            >
              <label>
                合作达人
                <select value={kolFilter} onChange={(e) => setFilter("kolFilter", e.target.value)}>
                  <option value="">全部达人</option>
                  {data.partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                交易币种
                <select
                  value={currencyFilter}
                  onChange={(e) => setFilter("currencyFilter", e.target.value)}
                >
                  <option value="">全部币种（分开核算）</option>
                  {[...new Set(data.orders.map((o) => o.currency))].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                订单状态
                <select
                  value={statusFilter}
                  onChange={(e) => setFilter("statusFilter", e.target.value)}
                >
                  <option value="">全部状态</option>
                  {["verified", "review", "unattributed"].map((s) => (
                    <option key={s} value={s}>
                      {labels[s]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="filter-date-range" role="group" aria-label="付款日期范围">
                <label>
                  付款起日
                  <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => setFilter("from", e.target.value)}
                  />
                </label>
                <label>
                  付款止日
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    aria-invalid={Boolean(dateRangeError)}
                    aria-describedby={dateRangeError ? "order-date-error" : undefined}
                    onChange={(e) => setFilter("to", e.target.value)}
                  />
                </label>
              </div>
            </div>
            {dateRangeError && (
              <p id="order-date-error" role="alert" className="message error">
                {dateRangeError}。请调整日期或清空筛选。
              </p>
            )}
            {!dateRangeError && (
              <div className="table-wrap" role="region" aria-label="订单佣金清单" tabIndex={0}>
                <p className="table-scroll-hint">可左右滚动查看全部字段</p>
                <table role="table" aria-label="订单佣金清单">
                  <thead role="rowgroup">
                    <tr role="row">
                      <th role="columnheader">订单 / KOL</th>
                      <th role="columnheader">商品净额</th>
                      <th role="columnheader">比例快照 / 佣金</th>
                      <th role="columnheader">归因与核验</th>
                      <th role="columnheader">解冻时间</th>
                      <th role="columnheader">操作</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {orders.map((o) => (
                      <tr role="row" key={o.id}>
                        <td data-label="订单 / KOL" role="cell">
                          <strong>{o.name}</strong>
                          <p>{name(o.kolId)}</p>
                          <small className="muted">付款 {date(o.paidAt)}</small>
                        </td>
                        <td className="numbers" data-label="商品净额" role="cell">
                          {money(o.net, o.currency)}
                          <details>
                            <summary>计算依据</summary>
                            <pre>{JSON.stringify(JSON.parse(o.evidence), null, 2)}</pre>
                            <p className="small muted">
                              签名引用、服务端checkout及Shopify cart核验；优惠码不改变归属。
                            </p>
                          </details>
                        </td>
                        <td className="numbers" data-label="比例快照 / 佣金" role="cell">
                          {o.rateBps === null ? "—" : `${o.rateBps / 100}%`}
                          <strong>{money(o.commission, o.currency)}</strong>
                        </td>
                        <td data-label="归因与核验" role="cell">
                          <Badge status={o.status} />
                          {o.reason && <p className="reason">{o.reason}</p>}
                          <small className="muted">核验 {date(o.checkedAt)}</small>
                        </td>
                        <td data-label="解冻时间" role="cell">
                          {date(o.holdUntil)}
                        </td>
                        <td data-label="操作" role="cell">
                          <div className="table-actions">
                            <button
                              disabled={busy}
                              onClick={() =>
                                void operate(
                                  "orders/reconcile",
                                  { id: o.id },
                                  "已从Shopify重新读取订单",
                                )
                              }
                            >
                              重新核对
                            </button>
                            <button
                              onClick={() =>
                                openAction({
                                  kind: o.reason?.startsWith("manual_hold:")
                                    ? "orders/release"
                                    : "orders/hold",
                                  id: o.id,
                                  title: o.reason?.startsWith("manual_hold:")
                                    ? "解除人工冻结并核对"
                                    : "人工冻结待核查",
                                })
                              }
                            >
                              {o.reason?.startsWith("manual_hold:") ? "解除冻结" : "标记待核查"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!orders.length && (
                  <Empty
                    title={hasFilters ? "暂无匹配订单" : "暂无订单记录"}
                    text={
                      hasFilters
                        ? "请调整条件，或清空筛选查看全部订单。"
                        : "订单付款事实与归因验证完成后显示；使用优惠码本身不产生转化。"
                    }
                    onReset={hasFilters ? clearFilters : undefined}
                  />
                )}
              </div>
            )}
            {data.truncated && (
              <p className="inline-note">
                显示最近500笔核验记录。财务结算从完整账本选择，不受此列表限制。
              </p>
            )}
          </>
        )}
        {view === "settlements" && (
          <>
            {!data.settlementsEnabled && (
              <p className="inline-note">
                正式结算开关未开启。上线前需完成本店Shopify、税/币种、支付退款及部署验收。
              </p>
            )}
            <div className="section-line">
              <h2>未入批次余额</h2>
              <small>含冻结中条目与负调整；创建草稿时仅纳入已解冻且核验通过的金额。</small>
            </div>
            <div className="balance-list">
              {data.balances.map((b) => (
                <p key={b.kolId + b.currency}>
                  <span>{name(b.kolId)}</span>
                  <strong className="numbers">{money(b.amount, b.currency)}</strong>
                </p>
              ))}
              {!data.balances.length && <p className="muted">暂无未结余额</p>}
            </div>
            <div className="table-wrap" role="region" aria-label="月结批次清单" tabIndex={0}>
              <p className="table-scroll-hint">可左右滚动查看全部字段</p>
              <table role="table" aria-label="月结批次清单">
                <thead role="rowgroup">
                  <tr role="row">
                    <th role="columnheader">月份 / 达人</th>
                    <th role="columnheader">应付金额</th>
                    <th role="columnheader">状态</th>
                    <th role="columnheader">付款记录</th>
                    <th role="columnheader">操作</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {settlements.map((s) => (
                    <tr role="row" key={s.id}>
                      <td data-label="月份 / 达人" role="cell">
                        <strong>{s.month}</strong>
                        {name(s.kolId)}
                        <small className="code muted">{s.id.slice(0, 8)}</small>
                      </td>
                      <td className="numbers" data-label="应付金额" role="cell">
                        {money(s.total, s.currency)}
                        {s.total <= 0 && (
                          <small className="muted">负余额需追回或在后续正佣金中抵扣</small>
                        )}
                      </td>
                      <td data-label="状态" role="cell">
                        <Badge status={s.status} />
                      </td>
                      <td data-label="付款记录" role="cell">
                        {s.paymentRef ?? "—"}
                        <small className="muted">{date(s.paidAt)}</small>
                        {s.paymentNote && <p className="small">{s.paymentNote}</p>}
                      </td>
                      <td data-label="操作" role="cell">
                        <div className="table-actions">
                          <a
                            className="button"
                            href={`/api/admin/kol/settlements/${s.id}/csv`}
                            download
                          >
                            导出清单
                          </a>
                          {s.status === "draft" && s.total > 0 && (
                            <button
                              disabled={busy || !data.settlementsEnabled}
                              onClick={() =>
                                void operate(
                                  "settlements/lock",
                                  { id: s.id },
                                  "已重新核对并锁定批次",
                                )
                              }
                            >
                              核对并锁单
                            </button>
                          )}
                          {s.status === "locked" && s.total > 0 && (
                            <button
                              disabled={!data.settlementsEnabled}
                              onClick={() =>
                                openAction({
                                  kind: "settlements/pay",
                                  id: s.id,
                                  title: "登记线下付款",
                                })
                              }
                            >
                              登记付款
                            </button>
                          )}
                          {!["paid", "canceled"].includes(s.status) && (
                            <button
                              className="danger-button"
                              onClick={() =>
                                openAction({
                                  kind: "settlements/cancel",
                                  id: s.id,
                                  title: "取消草稿并释放条目",
                                })
                              }
                            >
                              取消 / 重建
                            </button>
                          )}
                          {s.status === "paid" && (
                            <button
                              onClick={() =>
                                openAction({
                                  kind: "settlements/correct",
                                  id: s.id,
                                  title: "更正付款凭证",
                                })
                              }
                            >
                              更正凭证
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!settlements.length && (
                <Empty
                  title={query ? "未找到匹配结算批次" : "还没有结算批次"}
                  text={
                    query
                      ? "更换关键词，或清空筛选查看全部批次。"
                      : "按达人和币种建立月结草稿。登记付款只记录线下凭证，不发起转账。"
                  }
                  onReset={query ? clearFilters : undefined}
                />
              )}
            </div>
          </>
        )}
        <footer className="admin-footer">
          <span>OFFY / 合作账簿</span>
          <span>
            {view === "checkouts"
              ? "时间 Asia/Shanghai · 记录30天 · 原文7天"
              : "时间 Asia/Shanghai · 金额按交易币种 · 付款后冻结30天"}
          </span>
        </footer>
      </main>
      {editor && (
        <Dialog
          error={error}
          title={editor === "new" ? "新增合作" : "编辑合作条款"}
          onClose={() => setEditor(null)}
        >
          <PartnerForm
            initial={editor === "new" ? undefined : editor.terms}
            referralUrl={editor === "new" ? undefined : `${data.siteUrl}/r/${editor.alias}`}
            busy={busy}
            onSubmit={async (value) => {
              const result = await operate(
                editor === "new" ? "partners" : `partners/${editor.id}`,
                value,
                "合作已保存，历史checkout比例保持原快照",
              );
              if (result) setEditor(null);
            }}
          />
        </Dialog>
      )}
      {detail && (
        <Dialog error={error} title={`${detail.name} · 合作详情`} onClose={() => setDetail(null)}>
          <div className="dialog-content">
            <Badge status={effectiveStatus(detail)} />
            <pre className="pack">{pack(detail)}</pre>
            <button
              className="primary"
              disabled={effectiveStatus(detail) !== "active"}
              onClick={() => void copy(pack(detail))}
            >
              复制合作包
            </button>
            <dl className="detail-grid">
              <dt>社媒</dt>
              <dd>
                {detail.terms.socialUrl ? (
                  <a href={detail.terms.socialUrl} target="_blank" rel="noreferrer">
                    {detail.terms.socialUrl}
                  </a>
                ) : (
                  "未填写"
                )}
              </dd>
              <dt>联系邮箱</dt>
              <dd>{detail.terms.email}</dd>
              <dt>合同</dt>
              <dd>
                {detail.terms.contractStatus || "未填写"}{" "}
                {detail.terms.contractUrl && (
                  <a href={detail.terms.contractUrl} target="_blank" rel="noreferrer">
                    查看引用 ↗
                  </a>
                )}
              </dd>
              <dt>视频交付</dt>
              <dd>{detail.terms.videos || "未填写"}</dd>
              <dt>收款备注</dt>
              <dd>{detail.terms.payout || "未填写"}</dd>
              <dt>合作备注</dt>
              <dd>{detail.terms.notes || "未填写"}</dd>
            </dl>
            <p className="inline-note">
              暂停/到期停止新链接归因；不自动停用Shopify优惠码。旧账与已创建有效checkout保留。
            </p>
            <h3>最近操作</h3>
            {data.audit
              .filter((a) => a.entity === detail.id)
              .map((a) => (
                <p key={a.id} className="small muted">
                  {date(a.createdAt)} · {a.action}
                </p>
              ))}
          </div>
        </Dialog>
      )}
      {codeMode && (
        <Dialog
          error={error}
          title={codeMode === "bind" ? "绑定 Shopify 已有码" : "生成新码并同步"}
          onClose={() => setCodeMode(null)}
        >
          <form
            className="dialog-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (
                await operate(
                  `codes/${codeMode}`,
                  f,
                  codeMode === "bind" ? "远端已核实并绑定" : "任务已保存，远端确认前不可分发",
                )
              )
                setCodeMode(null);
            }}
          >
            <div className="dialog-content form-grid">
              <label className="full">
                合作达人
                <select
                  name="kolId"
                  required
                  defaultValue=""
                  onChange={(e) => {
                    if (codeMode === "generate") {
                      const alias = data.partners.find((p) => p.id === e.target.value)?.alias;
                      if (alias)
                        setCandidateCode(
                          `${alias.toUpperCase()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
                        );
                    }
                  }}
                >
                  <option value="" disabled>
                    选择达人
                  </option>
                  {data.partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {labels[p.status]}
                    </option>
                  ))}
                </select>
              </label>
              {codeMode === "generate" && (
                <label className="full">
                  Shopify 已有活动
                  <select name="campaignId" required defaultValue="">
                    <option value="" disabled>
                      选择可追加代码的活动
                    </option>
                    {connection?.campaigns.nodes.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        disabled={c.type === "DiscountCodeApp" || c.status !== "ACTIVE"}
                      >
                        {c.title} · {c.summary}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="full">
                {codeMode === "bind" ? "已有优惠码" : "唯一候选码"}
                <input
                  name="code"
                  value={candidateCode}
                  onChange={(e) => setCandidateCode(e.target.value)}
                  required
                  minLength={3}
                  maxLength={64}
                  pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,63}"
                  placeholder={
                    codeMode === "generate" ? "例如 MAYA-OFFY-26" : "粘贴 Shopify 中的代码"
                  }
                />
              </label>
              <p className="inline-note full">
                {codeMode === "generate"
                  ? "向所选活动追加代码，所有KOL代码共享该活动规则、期限和可能的总额度。不会创建或编辑权益规则。同步中保留旧绑定。"
                  : "将先查询Shopify。规则、适用性和最终优惠由Shopify结账决定。"}
              </p>
              {connectionError && (
                <p role="alert" className="error full">
                  {connectionError}
                </p>
              )}
              {codeMode === "generate" &&
                connection &&
                !connection.scopes.includes("write_discounts") && (
                  <p className="error full">缺少 write_discounts 权限，请改用绑定已有码。</p>
                )}
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={() => setCodeMode(null)}>
                取消
              </button>
              <button
                className="primary"
                disabled={
                  busy ||
                  (codeMode === "generate" &&
                    (!connection || !connection.scopes.includes("write_discounts")))
                }
              >
                {busy ? "提交中…" : codeMode === "bind" ? "核验并绑定" : "确认创建同步任务"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {settleForm && (
        <Dialog error={error} title="创建月结草稿" onClose={() => setSettleForm(false)}>
          <form
            className="dialog-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await operate(
                  "settlements",
                  Object.fromEntries(new FormData(e.currentTarget)),
                  "已创建草稿，锁单前会再次核对Shopify",
                )
              )
                setSettleForm(false);
            }}
          >
            <div className="dialog-content form-grid">
              <label className="full">
                合作达人
                <select name="kolId" required defaultValue="">
                  <option value="" disabled>
                    选择达人
                  </option>
                  {data.partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                结算月份
                <input
                  name="month"
                  type="month"
                  required
                  defaultValue={new Date().toISOString().slice(0, 7)}
                />
              </label>
              <label>
                交易币种
                <select name="currency" required defaultValue="">
                  <option value="" disabled>
                    选择币种
                  </option>
                  {[...new Set(data.balances.map((b) => b.currency))].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <p className="inline-note full">
                选择该月及更早的未结正佣金，同时纳入现有负调整。仅已付款30天且核验通过的条目可加入，同一条目不能进入两个批次。
              </p>
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={() => setSettleForm(false)}>
                取消
              </button>
              <button className="primary" disabled={busy}>
                生成草稿
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {action && (
        <Dialog error={error} title={action.title} onClose={() => setAction(null)}>
          <form
            className="dialog-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (await operate(action.kind, { ...f, id: action.id }, "操作已记录，可在账簿中核对"))
                setAction(null);
            }}
          >
            <div className="dialog-content form-grid">
              <dl className="confirmation-target full">
                <dt>操作对象</dt>
                <dd>
                  {actionTarget ? (
                    <>
                      <strong>{actionTarget.normalized}</strong>
                      <span>{name(actionTarget.kolId)}</span>
                    </>
                  ) : actionOrder ? (
                    <>
                      <strong>{actionOrder.name}</strong>
                      <span>{name(actionOrder.kolId)}</span>
                    </>
                  ) : actionSettlement ? (
                    <>
                      <strong>{actionSettlement.month}</strong>
                      <span>{name(actionSettlement.kolId)}</span>
                    </>
                  ) : (
                    <span>{action.id}</span>
                  )}
                </dd>
                {(actionOrder || actionSettlement) && (
                  <>
                    <dt>{actionOrder ? "商品净额" : "应付金额"}</dt>
                    <dd className="numbers">
                      {actionOrder
                        ? money(actionOrder.net, actionOrder.currency)
                        : money(actionSettlement!.total, actionSettlement!.currency)}
                    </dd>
                  </>
                )}
                <dt>记录编号</dt>
                <dd className="code">{action.id}</dd>
              </dl>
              <p className="inline-note full">
                {action.kind === "codes/end"
                  ? "只结束Offy本地绑定，不会停用Shopify代码或活动。"
                  : action.kind === "settlements/pay"
                    ? "请先完成平台外付款。本操作重新核对订单后登记凭证，不会发起银行转账。"
                    : "操作保留审计记录；不删除历史账本。"}
              </p>
              {action.kind.startsWith("settlements/p") || action.kind === "settlements/correct" ? (
                <label className="full">
                  付款流水 / 凭证引用
                  <input name="reference" required maxLength={500} />
                </label>
              ) : null}
              <label className="full">
                {action.kind === "settlements/pay" ? "付款备注" : "操作原因"}
                <textarea name="reason" required maxLength={2000} />
              </label>
              {action.kind === "settlements/pay" && (
                <label className="checkbox full">
                  <input type="checkbox" required />
                  我已在平台外完成此批次付款，并核对金额与币种
                </label>
              )}
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={() => setAction(null)}>
                返回
              </button>
              <button
                className={
                  action.kind === "codes/end" || action.kind === "settlements/cancel"
                    ? "primary danger-button"
                    : "primary"
                }
                disabled={busy}
              >
                {busy
                  ? "核对中…"
                  : action.kind === "codes/end"
                    ? "确认结束绑定"
                    : action.kind === "settlements/cancel"
                      ? "确认取消批次"
                      : "确认并记录"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {showHealth && (
        <Dialog error={error} title="连接与同步" onClose={() => setShowHealth(false)}>
          <div className="dialog-content">
            <h3>Shopify Admin</h3>
            {connection ? (
              <p>已连接 · 权限：{connection.scopes.join("、")}</p>
            ) : (
              <p className={connectionError ? "error" : "muted"}>{connectionError || "读取中…"}</p>
            )}
            <dl className="detail-grid">
              <dt>worker 最近运行</dt>
              <dd>
                {date(data.health.worker?.at)}{" "}
                {data.health.worker?.error && (
                  <span className="error">{errorLabel(data.health.worker.error)}</span>
                )}
              </dd>
              <dt>最近完整增量扫描</dt>
              <dd>{date(data.health.lastFullScan)}</dd>
              <dt>收件箱</dt>
              <dd>
                {data.health.inbox.map((i) => `${i.status}: ${i.count}`).join(" / ") || "暂无事件"}
              </dd>
              <dt>归因采集告警</dt>
              <dd>
                {data.health.attributionError
                  ? JSON.stringify(data.health.attributionError)
                  : "暂无记录"}
              </dd>
            </dl>
            {data.health.failures.map((f) => (
              <p className="error small" key={f.id}>
                {f.error} · 重试 {f.attempts} 次
              </p>
            ))}
            <p className="inline-note">
              后台与独立站共用服务器数据库。订单与优惠由Shopify维护；事件入队后由持久化worker处理，漏事件由分页核对补齐。此处不修改店铺权限。
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={() => void operate("sync", {}, "已执行同步核对")}
            >
              执行一轮同步
            </button>
            <h3>最近审计</h3>
            <div className="audit-list">
              {data.audit.slice(0, 20).map((a) => (
                <p key={a.id}>
                  <span>{date(a.createdAt)}</span> {a.action}
                  <small>{a.entity}</small>
                </p>
              ))}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
function Empty({
  title,
  text,
  onReset,
  action,
  compact = false,
}: {
  title: string;
  text: string;
  onReset?: () => void;
  compact?: boolean;
  action?: { label: string; run: () => void };
}) {
  return (
    <div className={compact ? "empty compact" : "empty"}>
      <h3>{title}</h3>
      <p>{text}</p>
      {onReset && <button onClick={onReset}>清空筛选</button>}
      {action && (
        <button className="primary" onClick={action.run}>
          {action.label}
        </button>
      )}
    </div>
  );
}
function PartnerForm({
  initial,
  referralUrl,
  busy,
  onSubmit,
}: {
  initial?: Cooperation;
  referralUrl?: string;
  busy: boolean;
  onSubmit: (value: Cooperation) => Promise<void>;
}) {
  return (
    <form
      className="dialog-form"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(Object.fromEntries(new FormData(e.currentTarget)) as Cooperation);
      }}
    >
      <div className="dialog-content form-grid">
        <label className="full">
          KOL 名称
          <input name="name" required maxLength={120} defaultValue={initial?.name} />
        </label>
        <p className="inline-note full">
          {referralUrl ? (
            <>
              固定推广链接：<span className="referral-url">{referralUrl}</span>
              修改名称不会改变此链接。
            </>
          ) : (
            "保存后自动生成唯一推广链接，例如 /r/maya；同名会自动区分，无需填写推广别名。"
          )}
        </p>
        <label>
          平台
          <input
            name="platform"
            required
            maxLength={100}
            defaultValue={initial?.platform}
            placeholder="Instagram / YouTube"
          />
        </label>
        <label>
          联系邮箱
          <input type="email" name="email" required maxLength={254} defaultValue={initial?.email} />
        </label>
        <label className="full">
          社媒主页（可选）
          <input
            name="socialUrl"
            type="url"
            maxLength={1000}
            pattern="[Hh][Tt][Tt][Pp][Ss]://.*"
            defaultValue={initial?.socialUrl}
            placeholder="https://www.instagram.com/…（可留空）"
          />
        </label>
        <label>
          自定义佣金（%）
          <input
            name="rate"
            required
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={initial?.rate}
            placeholder="必填，例如 7.25"
          />
        </label>
        <label>
          合作状态
          <select name="status" defaultValue={initial?.status ?? "draft"}>
            <option value="draft">草稿</option>
            <option value="active">合作中</option>
            <option value="paused">已暂停</option>
          </select>
        </label>
        <label>
          合作开始日
          <input name="startsAt" type="date" required defaultValue={initial?.startsAt} />
        </label>
        <label>
          合作结束日
          <input name="endsAt" type="date" required defaultValue={initial?.endsAt} />
        </label>
        <label className="full">
          链接打开页面
          <select name="target" required defaultValue={initial?.target ?? "/products"}>
            <option value="/products">全部商品（/products）</option>
            <option value="/">首页（/）</option>
            {initial?.target && !["/", "/products"].includes(initial.target) && (
              <option value={initial.target}>当前页面（{initial.target}）</option>
            )}
          </select>
        </label>
        <p className="muted small full">
          粉丝点击推广链接后到达此页面；这里无需填写 /maya 等达人路径。
        </p>
        <details className="full">
          <summary>合同、视频与收款备注（可选）</summary>
          <div className="form-grid optional-fields">
            <label className="full">
              合同链接
              <input name="contractUrl" type="url" defaultValue={initial?.contractUrl} />
            </label>
            <label className="full">
              签署状态
              <input name="contractStatus" defaultValue={initial?.contractStatus} />
            </label>
            <label className="full">
              视频交付 / 已发布链接
              <textarea name="videos" defaultValue={initial?.videos} />
            </label>
            <label className="full">
              收款方式 / 脱敏账号
              <textarea name="payout" defaultValue={initial?.payout} />
            </label>
            <label className="full">
              合作备注
              <textarea name="notes" defaultValue={initial?.notes} />
            </label>
          </div>
        </details>
        <p className="inline-note full">
          0%为有效比例；改比例仅影响之后创建的checkout。别名一经创建保留，不转给其他KOL。暂停不会停用Shopify优惠码。
        </p>
      </div>
      <div className="dialog-actions">
        <button className="primary" disabled={busy}>
          {busy ? "保存中…" : "保存合作"}
        </button>
      </div>
    </form>
  );
}
