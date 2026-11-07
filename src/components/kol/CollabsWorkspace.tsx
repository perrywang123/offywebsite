"use client";
import { COLLABS_CONTACT_EMAIL } from "@/lib/collabs/content";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { parseCsv, reportFields, type ReportInput, type ReportField } from "@/lib/collabs/reports";
import { decimal } from "@/server/kol/money";
import type { listCreators, listReports, reportDetail } from "@/server/collabs/service";
type Creator = ReturnType<typeof listCreators>[number];
type Batch = ReturnType<typeof listReports>[number];
type Detail = ReturnType<typeof reportDetail>;
type State = {
  creators: Creator[];
  reports: Batch[];
  officialAdmin: string;
  creatorPortal: string;
};
const fields: Record<ReportField, string> = {
  creator: "创作者标识",
  orderId: "Shopify 订单 GID",
  orderName: "订单号（如 #1040）",
  currency: "币种",
  sales: "来源销售额",
  commission: "来源佣金",
  fee: "来源手续费",
  payout: "来源付款金额",
  status: "来源状态",
  occurredAt: "来源时间",
  reference: "账单或付款参考号",
};
const errors: Record<string, string> = {
  collabs_not_enabled: "尚未启用 Collabs 模式",
  report_too_large: "文件不能超过 2 MiB",
  report_too_many_rows: "每次最多导入 2000 行，请按时间拆分",
  invalid_csv: "CSV 格式无效，请使用官方导出的原始 CSV",
  mapping_column_reused: "同一列不能重复映射",
  mapping_header_missing: "映射列不在文件中",
  currency_required: "请映射实际币种列，不能根据店铺币种推算",
  amount_required: "至少映射一个金额字段",
  order_identity_required: "逐笔报告需要订单号或 Shopify GID",
  creator_required: "创作者汇总需要映射创作者列",
  invalid_report_period: "请填写有效且顺序正确的报告起止日",
  source_confirmation_required: "请确认文件来源",
  report_overlap_confirmation_required:
    "已有报告覆盖该时间段。请选择被替代报告，或明确保留两个快照",
  creator_identity_immutable: "已建档的别名和来源标识不能转给他人",
  already_reserved: "别名或来源标识已被占用",
  invalid_superseded_report: "被替代报告必须是同类型、时间有重叠的有效报告",
  invalid_official_link: "请粘贴本店 Offy 或本店 myshopify.com 的 Collabs 官方链接",
  official_redirect_missing:
    "Shopify 未返回此个性化链接的有效跳转，请从 Collabs 复制包含 dt_id 的完整链接后重试",
  official_tracking_required: "链接缺少 Collabs 追踪参数，请从 Collabs 原样复制",
  invalid_storefront_target: "链接跳转目标不安全",
  invalid_report_money: "金额格式与所选数字格式不符",
  money_precision: "金额小数位超过该币种精度",
  unsupported_currency: "来源币种暂不支持",
  invalid_input: "请检查字段格式（推广别名限小写字母、数字和连字符）",
  operation_failed: "操作未完成，请检查源数据后重试",
};
async function api(path = "", body?: unknown) {
  const response = await fetch(
    `/api/admin/kol/collabs${path}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "content-type": "application/json", "x-offy-csrf": "1" },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(errors[result.error] ?? "操作未完成，请检查输入或连接后重试");
  return result;
}
const date = (n: number) => new Date(n).toLocaleString("zh-CN");
const money = (n: number | null, c: string) => (n === null ? "未提供" : `${c} ${decimal(n, c)}`);
function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="collabs-empty">
      <h3>{title}</h3>
      <p className="muted">{children}</p>
    </div>
  );
}
export function CollabsWorkspace({ siteUrl }: { siteUrl: string }) {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [panel, setPanel] = useState<"import" | "creator" | null>(null),
    [creator, setCreator] = useState<Creator | null>(null),
    [detail, setDetail] = useState<Detail | null>(null);
  const load = useCallback(async () => {
    try {
      setState(await api());
    } catch {
      setError("暂时无法读取 Collabs 记录，请重试。");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function run(action: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作未完成");
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    await run(async () => setDetail(await api(`/reports/${id}`)));
  }
  const check = detail?.checks[0];
  return (
    <section className="collabs-workspace" aria-label="Collabs 核对工作台">
      <div className="collabs-policy">
        <div>
          <p className="eyebrow">SHOPIFY COLLABS / 结算来源</p>
          <h2>官方计佣，Offy 核对</h2>
          <p>Collabs 原生归因 · 自动结算 · 邀请制 · 30 天冻结</p>
          <p className="muted">
            合作联系邮箱：<a href={`mailto:${COLLABS_CONTACT_EMAIL}`}>{COLLABS_CONTACT_EMAIL}</a>
          </p>
          <p className="muted">
            Offy 不生成应付佣金，不登记第二次付款。KOL
            在官方门户查看自己的转化与佣金；此处展示管理员导入的报告快照及核对证据。
          </p>
        </div>
        <div className="collabs-actions">
          <a
            className="button"
            href={state?.officialAdmin ?? "https://admin.shopify.com/"}
            target="_blank"
            rel="noreferrer"
          >
            打开 Collabs ↗
          </a>
          <a href="https://collabs.shopify.com/" target="_blank" rel="noreferrer">
            KOL 官方门户 ↗
          </a>
        </div>
      </div>
      {error && (
        <div className="message error" role="alert">
          {error}
          <button
            onClick={() => {
              setError("");
              void load();
            }}
          >
            重新读取
          </button>
        </div>
      )}
      {!state && !error && <p role="status">正在读取报告和合作记录…</p>}
      {state && (
        <>
          <div className="collabs-section-head">
            <div>
              <h2>报告与账单核对</h2>
              <p className="muted">
                人工导入，非实时同步。每份报告独立查看，重叠快照不会叠加成总佣金。
              </p>
            </div>
            <button
              className="primary"
              onClick={() => {
                setPanel(panel === "import" ? null : "import");
                setError("");
              }}
              disabled={busy}
            >
              {panel === "import" ? "收起导入" : "导入报告"}
            </button>
          </div>
          {panel === "import" && (
            <ReportImporter
              reports={state.reports}
              busy={busy}
              onImport={async (report, confirmed, allowOverlap, supersedes) => {
                await run(async () => {
                  const batch = await api("/import", {
                    report,
                    confirmed,
                    allowOverlap,
                    supersedes: supersedes || undefined,
                  });
                  await load();
                  setPanel(null);
                  setDetail(await api(`/reports/${batch.id}`));
                });
              }}
            />
          )}
          {!state.reports.length ? (
            <Empty title="尚未导入官方报表">
              从 Collabs
              导出报告后，在此映射实际字段并预览。没有报告代表数据未知，不代表销售额或佣金为零。
            </Empty>
          ) : (
            <div className="collabs-report-list">
              {state.reports.map((report) => (
                <button
                  key={report.id}
                  className="collabs-report-card"
                  onClick={() => void open(report.id)}
                  aria-pressed={detail?.id === report.id}
                >
                  <span className="eyebrow">
                    {report.kind === "sales"
                      ? "销售与佣金"
                      : report.kind === "billing"
                        ? "账单"
                        : "付款记录"}{" "}
                    · {report.status === "superseded" ? "已被替代" : "有效快照"}
                  </span>
                  <strong>{report.filename}</strong>
                  <span>
                    {report.periodFrom} — {report.periodTo}
                  </span>
                  <small>
                    {report.rowCount} 行 · 导入于 {date(report.createdAt)} ·{" "}
                    {report.granularity === "order"
                      ? "逐笔"
                      : report.granularity === "creator"
                        ? "达人汇总"
                        : "期间汇总"}
                  </small>
                </button>
              ))}
            </div>
          )}
          {detail && (
            <section className="collabs-detail" aria-label="报告详情">
              <div className="collabs-section-head">
                <div>
                  <h2>{detail.filename}</h2>
                  <p className="muted">
                    导入人 {detail.actor} · {date(detail.createdAt)} · 原始文件 SHA-256
                  </p>
                  <code className="collabs-digest">{detail.fileSha}</code>
                </div>
                <button onClick={() => setDetail(null)}>关闭详情</button>
              </div>
              <p className="message">
                以下金额和状态来自管理员导入的文件，未经 Shopify API 认证为 Collabs
                实时账本。空白字段显示“未提供”；付款标签不证明 KOL 已到账。
                {detail.status === "superseded" && " 此报告已被替代，仅作历史证据。"}
              </p>
              <div className="collabs-totals">
                {detail.totals.map((t) => (
                  <div key={t.currency}>
                    <strong>{t.currency} / 来源汇总</strong>
                    {(["sales", "commission", "fee", "payout"] as const).map((f) => (
                      <p key={f}>
                        {fields[f]} <b>{money(t[f], t.currency)}</b>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
              {!!detail.warnings.length && (
                <p className="message error">
                  {detail.warnings.includes("duplicate_source_rows")
                    ? "存在重复订单行，请核对是否为调整明细。 "
                    : ""}
                  {detail.warnings.includes("incomplete_amounts")
                    ? "部分金额缺失，对应汇总不完整。"
                    : ""}
                </p>
              )}
              <div className="collabs-section-head">
                <div>
                  <h3>只读核对 Shopify 订单</h3>
                  <p className="muted">
                    不重新计算 Collabs 佣金，不修改订单、优惠码或付款。最多每次核对 2000
                    行，逐笔查询可能需要数分钟。
                  </p>
                </div>
                <button
                  disabled={busy || detail.status !== "active"}
                  onClick={() =>
                    void run(async () => {
                      let offset = 0,
                        previousId: string | undefined;
                      do {
                        const result = await api("/reconcile", {
                          id: detail.id,
                          offset,
                          previousId,
                        });
                        previousId = result.id;
                        offset = result.nextOffset ?? 0;
                        setDetail(await api(`/reports/${detail.id}`));
                        if (result.interrupted) break;
                      } while (offset);
                    })
                  }
                >
                  {busy ? "正在核对…" : "开始只读核对"}
                </button>
              </div>
              {check ? (
                <>
                  <p>
                    最近核对 {date(check.checkedAt)} · 已检查 {check.rowsChecked}/{detail.rowCount}{" "}
                    行（{check.complete ? "本轮完成" : "本轮未完成"}） · 已核实身份的订单{" "}
                    {check.verifiedOrders} · 提示 {check.findings.length} · 历史核对{" "}
                    {detail.checks.length} 次
                  </p>
                  {!check.findings.length && check.complete ? (
                    <p className="message">
                      本次已执行的检查未发现差异；不代表已验证 Collabs
                      归因规则、佣金计算或付款到账。
                    </p>
                  ) : (
                    <div className="collabs-findings">
                      {check.findings.map((f) => (
                        <article key={f.key}>
                          <span className="eyebrow">
                            {f.row ? `CSV 第 ${f.row} 行` : "报告级提示"}
                          </span>
                          <p>{f.detail}</p>
                          {detail.reviews
                            .filter((r) => r.checkId === check.id && r.findingKey === f.key)
                            .map((r) => (
                              <p className="muted" key={r.id}>
                                复核：{r.reason} · {date(r.createdAt)}
                              </p>
                            ))}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const form = e.currentTarget,
                                reason = String(new FormData(form).get("reason") ?? "");
                              void run(async () => {
                                await api("/review", {
                                  checkId: check.id,
                                  findingKey: f.key,
                                  reason,
                                });
                                setDetail(await api(`/reports/${detail.id}`));
                                form.reset();
                              });
                            }}
                          >
                            <label>
                              追加复核说明
                              <input
                                name="reason"
                                required
                                maxLength={1000}
                                placeholder="记录复核依据，不改写官方金额"
                              />
                            </label>
                            <button disabled={busy}>保存说明</button>
                          </form>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="muted">尚未核对。未提供数据与未完成检查会明确列出。</p>
              )}
              <div className="table-scroll" tabIndex={0} role="region" aria-label="来源明细">
                <table>
                  <thead>
                    <tr>
                      <th>来源达人 / 订单</th>
                      <th>销售额</th>
                      <th>佣金</th>
                      <th>手续费 / 付款</th>
                      <th>来源状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.rows.map((row, i) => (
                      <tr key={i}>
                        <td>
                          {row.creator ?? "未提供"}
                          <small>{row.orderName ?? row.orderId ?? "汇总记录"}</small>
                        </td>
                        <td>{money(row.sales, row.currency)}</td>
                        <td>{money(row.commission, row.currency)}</td>
                        <td>
                          {money(row.fee, row.currency)}
                          <small>{money(row.payout, row.currency)}</small>
                        </td>
                        <td>
                          {row.status ?? "未提供"}
                          <small>{row.reference}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <div className="collabs-section-head">
            <div>
              <h2>合作链接索引</h2>
              <p className="muted">
                在 Collabs 邀请并分配计划后，复制官方链接到此处。暂停仅关闭 Offy
                短链，终止佣金关系需在 Collabs 操作。
              </p>
            </div>
            <button
              onClick={() => {
                setCreator(null);
                setPanel(panel === "creator" ? null : "creator");
              }}
            >
              新增链接记录
            </button>
          </div>
          {panel === "creator" && (
            <form
              className="collabs-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run(async () => {
                  await api("/creators", {
                    id: creator?.id,
                    name: f.get("name"),
                    alias: f.get("alias"),
                    creatorKey: String(f.get("creatorKey") ?? "").trim() || null,
                    officialLink: f.get("officialLink"),
                    enabled: f.get("enabled") === "on",
                  });
                  setPanel(null);
                  await load();
                });
              }}
            >
              <div className="collabs-form-grid">
                <label>
                  达人名称
                  <input name="name" required maxLength={100} defaultValue={creator?.name} />
                </label>
                <label>
                  固定推广别名
                  <input
                    name="alias"
                    required
                    pattern="[a-z0-9][a-z0-9-]{1,48}"
                    defaultValue={creator?.alias}
                    readOnly={!!creator}
                  />
                  <small>{siteUrl}/r/别名</small>
                </label>
                <label>
                  报告中的创作者标识（可后补）
                  <input
                    name="creatorKey"
                    maxLength={254}
                    defaultValue={creator?.creatorKey ?? ""}
                    readOnly={!!creator?.creatorKey}
                  />
                  <small>
                    {creator?.creatorKey
                      ? "已绑定来源报告标识，不能更改或清空"
                      : "尚无官方报告可先留空，取得真实报告后再绑定一次；不影响推广短链"}
                  </small>
                </label>
                <label>
                  Collabs 官方推广链接
                  <input
                    name="officialLink"
                    type="url"
                    required
                    defaultValue={creator?.officialLink}
                    placeholder={`${siteUrl}/discount/…?dt_id=…`}
                  />
                </label>
              </div>
              <label className="collabs-checkbox">
                <input name="enabled" type="checkbox" defaultChecked={creator?.enabled ?? true} />
                启用 Offy 短链
              </label>
              <div className="collabs-actions">
                <button className="primary" disabled={busy}>
                  保存链接记录
                </button>
                <button type="button" onClick={() => setPanel(null)}>
                  取消
                </button>
              </div>
            </form>
          )}
          {!state.creators.length ? (
            <Empty title="尚未关联 Collabs 合作链接">
              KOL 的邀请、佣金比例、专属优惠码和自动付款在 Collabs
              管理。这里建立报告标识与官方链接的对应关系。
            </Empty>
          ) : (
            <div className="collabs-report-list">
              {state.creators.map((c) => (
                <article className="collabs-creator-card" key={c.id}>
                  <strong>{c.name}</strong>
                  <p className="muted">
                    {c.creatorKey
                      ? `来源标识：${c.creatorKey}`
                      : "报告标识待绑定 · 暂不进行按创作者核对"}
                  </p>
                  <p>
                    {c.enabled ? "短链已启用" : "短链已停用"} · {siteUrl}/r/{c.alias}
                  </p>
                  <a href={c.officialLink} target="_blank" rel="noreferrer">
                    官方推广链接 ↗
                  </a>
                  <button
                    onClick={() => {
                      setCreator(c);
                      setPanel("creator");
                    }}
                  >
                    编辑链接
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
function ReportImporter({
  reports,
  busy,
  onImport,
}: {
  reports: Batch[];
  busy: boolean;
  onImport: (
    report: ReportInput,
    confirmed: boolean,
    allowOverlap: boolean,
    supersedes: string,
  ) => Promise<void>;
}) {
  const [csv, setCsv] = useState(""),
    [filename, setFilename] = useState(""),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<ReportInput["mapping"]>({}),
    [preview, setPreview] = useState<ReturnType<
      typeof import("@/lib/collabs/reports").previewReport
    > | null>(null),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget),
      report = {
        filename,
        csv,
        mapping,
        kind: data.get("kind"),
        granularity: data.get("granularity"),
        periodFrom: data.get("from"),
        periodTo: data.get("to"),
        numberFormat: data.get("numberFormat"),
        salesBasis: data.get("salesBasis"),
      } as ReportInput;
    try {
      if (!preview) {
        setPreview(await api("/preview", report));
        return;
      }
      await onImport(
        report,
        data.get("confirmed") === "on",
        data.get("overlap") === "on",
        String(data.get("supersedes") ?? ""),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法预览");
    }
  }
  return (
    <form
      className="collabs-form"
      onSubmit={(e) => void submit(e)}
      onChange={() => setPreview(null)}
    >
      <h3>导入 Collabs 报告快照</h3>
      <p className="muted">
        请从官方后台导出 CSV，先选择字段，再预览。不会向 Collabs
        写入数据，不会触发付款。仅导入核对必需的列，原文件加密保存。
      </p>
      <label>
        官方导出的 CSV（最大 2 MiB / 2000 行）
        <input
          type="file"
          accept=".csv,text/csv"
          required
          onChange={async (e) => {
            setError("");
            setPreview(null);
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 2097152) throw new Error(errors.report_too_large);
              const text = await file.text(),
                parsed = parseCsv(text);
              setCsv(text);
              setFilename(file.name);
              setHeaders(parsed.headers);
              setMapping({});
            } catch (err) {
              setHeaders([]);
              setCsv("");
              setError(
                err instanceof Error ? (errors[err.message] ?? err.message) : "无法读取 CSV",
              );
            }
          }}
        />
      </label>
      <div className="collabs-form-grid">
        <label>
          报告类型
          <select name="kind">
            <option value="sales">销售 / 佣金</option>
            <option value="billing">Shopify / Collabs 账单</option>
            <option value="payout">Collabs 付款报告</option>
          </select>
        </label>
        <label>
          真实来源粒度
          <select name="granularity">
            <option value="order">逐笔订单</option>
            <option value="creator">每位达人汇总</option>
            <option value="period">期间汇总</option>
          </select>
        </label>
        <label>
          报告起日
          <input name="from" type="date" required />
        </label>
        <label>
          报告止日
          <input name="to" type="date" required />
        </label>
        <label>
          数字格式
          <select name="numberFormat">
            <option value="dot">1,234.56（小数点）</option>
            <option value="comma">1.234,56（小数逗号）</option>
          </select>
        </label>
        <label>
          来源销售额口径
          <select name="salesBasis">
            <option value="unspecified">未确认，暂不比较销售额</option>
            <option value="order-total">当前订单总额（含运费与税）</option>
            <option value="merchandise-net">商品税前净额（需独立证据）</option>
          </select>
        </label>
      </div>
      {!!headers.length && (
        <>
          <h4>映射原始字段</h4>
          <p className="muted">
            不猜测字段含义。付款金额与佣金金额分开；币种和订单标识必须来自实际报告。
          </p>
          <div className="collabs-form-grid">
            {reportFields.map((f) => (
              <label key={f}>
                {fields[f]}
                <select
                  value={mapping[f] ?? ""}
                  onChange={(e) => setMapping({ ...mapping, [f]: e.target.value || undefined })}
                >
                  <option value="">来源未提供</option>
                  {headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </>
      )}
      <label>
        替代同类型旧报告（可选）
        <select name="supersedes">
          <option value="">保留为独立快照</option>
          {reports
            .filter((r) => r.status === "active")
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.filename} / {r.periodFrom} — {r.periodTo}
              </option>
            ))}
        </select>
      </label>
      <label className="collabs-checkbox">
        <input name="overlap" type="checkbox" />
        若与其他有效报告重叠，确认仅作独立快照保留，不叠加结算
      </label>
      <label className="collabs-checkbox">
        <input name="confirmed" type="checkbox" required />
        我确认文件来自 Shopify / Collabs，所选期间、币种、口径及字段映射与原报告一致
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <div className="message">
          <p>
            预览通过：{preview.rows.length} 行 · {preview.totals.map((t) => t.currency).join(" / ")}{" "}
            · {preview.warnings.length ? "存在需人工复核的缺失值或重复行" : "未发现格式提示"}
          </p>
          <p>
            首行：{preview.rows[0].creator ?? "未提供达人"} /{" "}
            {preview.rows[0].orderName ?? "无订单号"} · 来源佣金{" "}
            {money(preview.rows[0].commission, preview.rows[0].currency)}
          </p>
        </div>
      )}
      <button className="primary" disabled={busy || !csv}>
        {busy ? "正在保存…" : preview ? "确认导入此快照" : "校验并预览"}
      </button>
    </form>
  );
}
