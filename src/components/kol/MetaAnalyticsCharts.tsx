"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  analyticsColors,
  analyticsLabels,
  analyticsMetrics,
  analyticsPercent,
  type AnalyticsMetric,
  type AnalyticsStage,
} from "@/lib/meta/analytics";
import type { MetaAnalyticsData } from "@/server/meta/analytics";
import type { evidenceOverview } from "@/server/meta/evidence";

type Props = {
  data: MetaAnalyticsData;
  enabled: boolean;
  ordersConfigured: boolean;
  sync: ReturnType<typeof evidenceOverview>["sync"];
  busy?: boolean;
  onStage: (stage: AnalyticsStage) => void;
  onAd: (id: string | null) => void;
};
const count = (n: number) => n.toLocaleString("zh-CN");
const seriesStyle = (color: string) => ({ "--meta-series": color }) as CSSProperties;
const reportUrl =
  "https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1301113714798915";
const stages: { stage: AnalyticsStage; metric: AnalyticsMetric | "paid"; label: string }[] = [
  { stage: "view", metric: "PageView", label: "访问" },
  { stage: "content", metric: "ViewContent", label: "商品浏览" },
  { stage: "checkout", metric: "CheckoutReady", label: "结账准备" },
  { stage: "paid", metric: "paid", label: "关联付款" },
];

export function MetaAnalyticsCharts({
  data,
  enabled,
  ordersConfigured,
  sync,
  busy,
  onStage,
  onAd,
}: Props) {
  const [metric, setMetric] = useState<AnalyticsMetric>("PageView");
  const [unit, setUnit] = useState<"browsers" | "events">("browsers");
  const [selectedDay, setSelectedDay] = useState("");
  const [width, setWidth] = useState(800);
  const chart = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = chart.current;
    if (!element) return;
    const measure = () =>
      setWidth(Math.max(260, Math.round(element.getBoundingClientRect().width || 800)));
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const syncIssue = !ordersConfigured
    ? "Shopify Admin 未配置，付款证据未知。"
    : sync?.lastError
      ? "订单同步异常，付款证据暂不可确认。"
      : !sync?.lastSuccess
        ? "等待首次订单读取，付款证据未知。"
        : sync.scanning
          ? "订单分页读取中，付款证据尚未完整更新。"
          : sync.lastSuccess < data.generatedAt - 45 * 60000 ||
              sync.lastSuccess > data.generatedAt + 300000
            ? "订单证据已过期，请等待重新同步。"
            : "";
  const paid: number | null = syncIssue ? null : data.funnel.paid;
  const point = data.daily.find((d) => d.day === selectedDay) ?? data.daily.at(-1);
  const values = data.daily.map((d) => d.metrics[metric][unit]);
  const color = analyticsColors[metric];
  const top = Math.max(4, Math.ceil(Math.max(0, ...values) / 4) * 4);
  const height = 195,
    left = 34,
    right = 16,
    plotHeight = 150;
  const x = (i: number) => left + ((width - left - right) * i) / Math.max(1, values.length - 1);
  const y = (v: number) => 12 + plotHeight * (1 - v / top);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const capi = data.health.capi;
  const stepValue = (stage: AnalyticsStage) => (stage === "paid" ? paid : data.funnel[stage]);
  const rangeText = `${new Date(data.range.from).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })} – ${new Date(Math.max(data.range.from, data.range.to - 1)).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  return (
    <div className="meta-viz">
      <p className="meta-viz-scope muted">
        图表范围：{rangeText} · Asia/Shanghai · 按保留记录统计
        {new Date(data.generatedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }) ===
        data.daily.at(-1)?.day
          ? " · 今日尚未结束"
          : ""}
      </p>
      {!enabled && (
        <p className="message">站内追踪未启用；已有历史记录可核对，不代表当前仍在采集。</p>
      )}
      <section className="meta-viz-kpis" aria-label="本期概览">
        {analyticsMetrics.map((key) => (
          <div key={key} style={seriesStyle(analyticsColors[key])}>
            <span>
              <i aria-hidden="true" />
              {analyticsLabels[key]}访客
            </span>
            <strong>{count(data.totals[key].browsers)}</strong>
            <small>{count(data.totals[key].events)} 次保留事件</small>
            <small>{key === "AddToCart" ? "可跳过，不作必经步骤" : "本期各阶段独立去重"}</small>
          </div>
        ))}
        <div style={seriesStyle(analyticsColors.paid)}>
          <span>
            <i aria-hidden="true" />
            漏斗关联付款访客
          </span>
          <strong>{paid === null ? "—" : count(paid)}</strong>
          <small>
            {paid === null ? "等待有效订单证据" : `${count(data.funnel.orders)} 笔付款历史订单`}
          </small>
          <small>完整观察链路 · 含后续退款</small>
        </div>
      </section>
      <p className="meta-viz-caption">
        访客按浏览器标识去重，不等于实际人数。概览各阶段独立统计，可能多于下方完整链路漏斗；受许可、拦截、跨设备、撤回和保留上限影响。
      </p>
      <section className="meta-viz-panel meta-viz-trend" aria-label="访问与关键行为趋势">
        <div className="meta-viz-head">
          <div>
            <h3>访问与关键行为趋势</h3>
            <p>按日查看变化，切换指标后独立显示。</p>
          </div>
          <div className="meta-viz-tabs" aria-label="趋势统计口径">
            {(["browsers", "events"] as const).map((u) => (
              <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}>
                {u === "browsers" ? "浏览器数" : "事件次数"}
              </button>
            ))}
          </div>
        </div>
        <div className="meta-viz-metrics" aria-label="趋势指标">
          {analyticsMetrics.map((key) => (
            <button
              key={key}
              type="button"
              style={seriesStyle(analyticsColors[key])}
              aria-pressed={metric === key}
              onClick={() => setMetric(key)}
            >
              <i aria-hidden="true" />
              {analyticsLabels[key]}
            </button>
          ))}
        </div>
        <div ref={chart} className="meta-viz-chart">
          {data.daily.length ? (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`${analyticsLabels[metric]}每日${unit === "browsers" ? "浏览器数" : "次数"}趋势`}
            >
              <title>按保留记录统计；下方每日数值表提供精确值，零记录不证明无实际访问。</title>
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line
                    x1={left}
                    x2={width - right}
                    y1={y((top * i) / 4)}
                    y2={y((top * i) / 4)}
                    stroke="var(--line)"
                    strokeDasharray="3 4"
                  />
                  <text x={left - 8} y={y((top * i) / 4) + 4} textAnchor="end">
                    {count((top * i) / 4)}
                  </text>
                </g>
              ))}
              <polygon
                points={`${left},${y(0)} ${points} ${x(values.length - 1)},${y(0)}`}
                fill={color}
                opacity=".045"
              />
              <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" />
              {data.daily.map((day, i) => (
                <g key={day.day}>
                  <circle
                    cx={x(i)}
                    cy={y(values[i])}
                    r={point?.day === day.day ? 5 : 3}
                    stroke={color}
                    fill={point?.day === day.day ? color : "white"}
                    strokeWidth="2"
                    tabIndex={0}
                    role="button"
                    aria-label={`${day.day} ${analyticsLabels[metric]} ${values[i]}${unit === "browsers" ? "个浏览器" : "次"}`}
                    onMouseEnter={() => setSelectedDay(day.day)}
                    onFocus={() => setSelectedDay(day.day)}
                    onClick={() => setSelectedDay(day.day)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedDay(day.day);
                      }
                    }}
                  >
                    <title>
                      {day.day}：{values[i]}
                    </title>
                  </circle>
                  {(data.daily.length <= 7 ||
                    i % Math.ceil(data.daily.length / 6) === 0 ||
                    i === data.daily.length - 1) && (
                    <text x={x(i)} y={height - 6} textAnchor="middle">
                      {day.day.slice(5).replace("-", "/")}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          ) : (
            <div className="empty">当前范围没有可显示的日期。</div>
          )}
        </div>
        <div className="meta-viz-chart-foot">
          <span>每日去重数不可相加为周期去重数；0 表示无匹配保留记录。</span>
          <output aria-live="polite">
            {point
              ? `${point.day} · ${analyticsLabels[metric]} ${count(point.metrics[metric][unit])} ${unit === "browsers" ? "个浏览器" : "次"}`
              : "—"}
          </output>
        </div>
        <details className="meta-viz-daily">
          <summary>查看每日数值</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>日期（上海）</th>
                  <th>
                    {analyticsLabels[metric]}
                    {unit === "browsers" ? "浏览器数" : "次数"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((d) => (
                  <tr key={d.day}>
                    <td>{d.day}</td>
                    <td>{count(d.metrics[metric][unit])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <div className="meta-viz-grid">
        <section className="meta-viz-panel" aria-label="站内转化漏斗">
          <div className="meta-viz-head">
            <div>
              <h3>站内转化漏斗</h3>
              <p>同一批浏览器，按事件先后顺序观察。</p>
            </div>
            <span className="badge">浏览器去重</span>
          </div>
          <div className="meta-viz-funnel-total">
            <span>访问 → 关联付款</span>
            <strong>{analyticsPercent(paid, data.funnel.view, 2)}</strong>
          </div>
          {stages.map((s, i) => {
            const value = stepValue(s.stage),
              previous = i ? stepValue(stages[i - 1].stage) : data.funnel.view;
            return (
              <div key={s.stage}>
                {i > 0 && (
                  <p className="meta-viz-step-rate">
                    ↓ 上一步继续比例 <b>{analyticsPercent(value, previous ?? 0)}</b>
                  </p>
                )}
                <button
                  type="button"
                  className="meta-viz-stage"
                  aria-label={`查看${s.label}阶段证据，${value === null ? "未知" : value + "个浏览器"}`}
                  disabled={busy || value === null || value === 0}
                  onClick={() => onStage(s.stage)}
                >
                  <span>
                    <small>0{i + 1}</small>
                    {s.label}
                  </span>
                  <span className="meta-viz-track">
                    <i
                      style={{
                        ...seriesStyle(analyticsColors[s.metric]),
                        width:
                          value === null || !data.funnel.view
                            ? "0%"
                            : `${(100 * value) / data.funnel.view}%`,
                      }}
                    />
                  </span>
                  <strong>
                    {value === null ? "—" : count(value)}
                    <small>{analyticsPercent(value, data.funnel.view)}</small>
                  </strong>
                </button>
                {s.stage === "content" && (
                  <div className="meta-viz-branch">
                    <span>↳ 可选路径</span>
                    <button
                      type="button"
                      disabled={busy || !data.funnel.cart}
                      onClick={() => onStage("cart")}
                    >
                      {count(data.funnel.cart)} 有加购
                    </button>
                    <span>Buy Now 可跳过加购</span>
                  </div>
                )}
              </div>
            );
          })}
          {syncIssue && (
            <p className="meta-viz-warning" role="status">
              {syncIssue}
            </p>
          )}
          <p className="meta-viz-footnote">
            点击阶段查看同队列证据。漏斗仅包含所选窗口内完整的前置观测；同路径首屏允许最多 2
            秒初始化顺序偏差，缺失事件不补造。结账准备不等于已进入
            Shopify；付款记录含后续退款，排除取消{data.scope?.includeTests ? "" : "/测试"}
            ，不等于净成交或 Meta 归因。
          </p>
        </section>
        <section className="meta-viz-panel" aria-label="采集与同步状态">
          <div className="meta-viz-head">
            <div>
              <h3>采集与同步状态</h3>
              <p>与用户转化分开核对。</p>
            </div>
          </div>
          <div className="meta-viz-health">
            <div>
              <span>加购 CAPI 接收</span>
              <strong>
                {analyticsPercent(capi.sent, capi.total)}
                {capi.total > 0 ? " 已接收" : ""}
              </strong>
            </div>
            <div className="meta-viz-delivery" aria-hidden="true">
              {(
                [
                  [capi.sent, "var(--green)"],
                  [capi.pending, "var(--amber)"],
                  [capi.failed, "var(--red)"],
                ] as const
              ).map(([n, c]) => (
                <i
                  key={c}
                  style={{ width: `${capi.total ? (100 * n) / capi.total : 0}%`, background: c }}
                />
              ))}
            </div>
            <p>
              {capi.total
                ? `${count(capi.sent)} 已接收 · ${count(capi.pending)} 待发送/重试 · ${count(capi.failed)} 终止`
                : "暂无应发送的加购任务，不计算成功率。"}
            </p>
            <p>{count(capi.unconfigured)} 条加购在未配置时记录，未计入发送任务分母。</p>
          </div>
          <div className="meta-viz-health">
            <div>
              <span>广告来源可识别</span>
              <strong>
                {count(data.health.labelledVisitors)} / {count(data.health.visitBrowsers)}
              </strong>
            </div>
            <p>带广告 ID 的访问浏览器 / 本范围访问浏览器</p>
            <p>未记录 ID 不能直接视为自然流量。</p>
          </div>
          <div className="meta-viz-health">
            <div>
              <span>Shopify 订单证据</span>
              <strong className={syncIssue ? "warning" : "good"}>
                {syncIssue ? "待核对" : "已同步"}
              </strong>
            </div>
            <p>
              {sync?.lastSuccess
                ? `最近成功 ${new Date(sync.lastSuccess).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`
                : "尚无成功同步记录"}
            </p>
            <p>完成扫描后每 15 分钟检查；旧证据可在下方查看。</p>
          </div>
          <p className="meta-viz-footnote">
            CAPI 已接收不代表广告归因成功。Shopify 官方负责结账和 Purchase；广告花费、CPA、ROAS
            与最终归因购买请在{" "}
            <a href={reportUrl} target="_blank" rel="noreferrer">
              Meta 报表 ↗
            </a>{" "}
            查看。
          </p>
        </section>
      </div>
      <section className="meta-viz-panel" aria-label="按广告核对链路">
        <div className="meta-viz-head">
          <div>
            <h3>按广告核对链路</h3>
            <p>每行均为该记录来源下的完整观察队列；点击查看对应范围。</p>
          </div>
          <small>
            {data.ads.length} / {data.adGroupCount} 组
          </small>
        </div>
        <p className="meta-table-hint">左右滑动查看完整广告明细。</p>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="广告来源明细，可横向滚动"
        >
          <table>
            <thead>
              <tr>
                <th>记录的广告来源</th>
                <th>访问</th>
                <th>商品浏览</th>
                <th>可选加购</th>
                <th>结账准备</th>
                <th>关联付款</th>
                <th>证据</th>
              </tr>
            </thead>
            <tbody>
              {data.ads.map((a) => (
                <tr key={a.adId ?? "unlabelled"}>
                  <td>
                    <strong>{a.adId ?? "未记录广告 ID"}</strong>
                    <small>{a.adId ? "本地来源证据，非最终归因" : "不能直接视为自然流量"}</small>
                  </td>
                  <td>{count(a.funnel.view)}</td>
                  <td>{count(a.funnel.content)}</td>
                  <td>{count(a.funnel.cart)}</td>
                  <td>{count(a.funnel.checkout)}</td>
                  <td>{syncIssue ? "—" : count(a.funnel.paid)}</td>
                  <td>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`核对${a.adId ?? "未记录广告 ID"} 的链路`}
                      onClick={() => onAd(a.adId)}
                    >
                      查看链路 ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.ads.length && <p className="empty">暂无匹配的来源记录。</p>}
        <p className="meta-viz-footnote">
          同一浏览器可能出现在多个广告分组，不能将各组去重数相加。最多显示访问队列最大的 20
          组，可按广告 ID 精确查询。金额在订单证据中按币种分别核对。
        </p>
      </section>
    </div>
  );
}
