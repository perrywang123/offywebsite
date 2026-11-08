"use client";
import { useEffect, useState } from "react";
import type { landingMetrics } from "@/server/collabs/landing";
type Metrics = ReturnType<typeof landingMetrics>;
const time = (at: number) => new Date(at).toLocaleString("zh-CN", { timeZone: "UTC" }) + " UTC";
export function CollabsLandingMetrics({
  initial,
  load,
}: {
  initial: Metrics;
  load: (days: number) => Promise<Metrics>;
}) {
  const [data, setData] = useState(initial),
    [selected, setSelected] = useState(initial.groups[0]?.dtId ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setData(initial), [initial]);
  const current = data.groups.find((g) => g.dtId === selected) ?? data.groups[0],
    max = Math.max(1, ...(current?.daily.map((d) => d.pv ?? 0) ?? []));
  async function period(days: number) {
    setBusy(true);
    setError("");
    try {
      setData(await load(days));
    } catch {
      setError("暂时无法刷新落地统计，保留上次读取结果。请重试。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="collabs-observation" aria-label="Offy 推广落地统计">
      <div className="collabs-section-head">
        <div>
          <p className="eyebrow">OFFY / 推广落地</p>
          <h2>推广落地浏览与访客</h2>
          <p className="muted">
            按官方 dt_id 汇总已允许分析的 Offy 页面浏览。短链跳转不重复加进 PV，亦不等于 Collabs
            官方 Visits。
          </p>
        </div>
        <label className="collabs-period">
          统计周期
          <select
            aria-label="落地统计周期"
            value={data.days}
            disabled={busy}
            onChange={(e) => void period(Number(e.target.value))}
          >
            {[7, 30, 90].map((n) => (
              <option key={n} value={n}>
                最近 {n} 天
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="message error">
          {error}
        </p>
      )}
      {busy && <p role="status">正在刷新落地统计…</p>}
      {!current ? (
        <p className="collabs-empty">
          建立包含真实 dt_id 的合作链接后，可在此查看落地 PV 与浏览器 UV。
        </p>
      ) : (
        <>
          <div className="collabs-link-picker" role="group" aria-label="选择推广追踪组">
            {data.groups.map((g) => (
              <button
                type="button"
                key={g.dtId}
                aria-pressed={g.dtId === current.dtId}
                onClick={() => setSelected(g.dtId)}
              >
                <strong>
                  {g.names.length === 1 ? g.names[0] : g.names.length ? "共享追踪组" : "历史追踪组"}
                </strong>
                <span>
                  dt_id={g.dtId}
                  {!g.enabled ? " · 已停用" : ""}
                </span>
                <small>
                  {g.aliases.length
                    ? g.aliases.map((a) => `/r/${a}`).join("、")
                    : "已无当前绑定别名"}
                </small>
              </button>
            ))}
          </div>
          {current.aliases.length > 1 && (
            <p className="muted">
              多个历史别名共用同一追踪组，以下数据只汇总一次，不能区分具体下单短链。
            </p>
          )}
          <div className="collabs-link-evidence">
            <div className="collabs-metric-row">
              <div>
                <span>期间落地浏览 PV</span>
                <strong>{current.periodPv}</strong>
              </div>
              <div>
                <span>期间去重访客 UV（浏览器）</span>
                <strong>{current.periodUv}</strong>
              </div>
              <div>
                <span>采集以来累计 PV</span>
                <strong>{current.totalPv}</strong>
              </div>
            </div>
            <p className="muted">
              {data.from} — {data.to} · UTC 按日汇总
              <br />
              今日 PV {current.todayPv} · 今日 UV {current.todayUv}
              <br />
              {current.firstAt === null ? (
                "尚未收到已允许分析的落地浏览；采集前历史未知。"
              ) : (
                <>
                  首笔采集：{time(current.firstAt)}
                  <br />
                  最近浏览：{time(current.lastAt!)}
                </>
              )}
            </p>
            <div
              className="collabs-daily-bars"
              aria-label="每日落地 PV 趋势，精确 PV 与 UV 见下方明细"
            >
              {current.daily.map((d) => (
                <div
                  key={d.day}
                  className={d.pv === null ? "is-unknown" : ""}
                  title={`${d.day}：${d.pv === null ? "未采集" : `PV ${d.pv} / UV ${d.uv ?? 0}`}`}
                >
                  <span style={{ height: d.pv ? `${Math.max(3, (d.pv / max) * 100)}%` : "0" }} />
                </div>
              ))}
            </div>
            <div className="collabs-chart-caption">
              <span>{data.from}</span>
              <span>空白斜纹：未采集</span>
              <span>{data.to}</span>
            </div>
            <details>
              <summary>查看落地每日明细</summary>
              <p className="muted">未采集日期按 0 显示；期间 UV 独立去重，不是每日 UV 相加。</p>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="落地每日 PV 与 UV 明细"
              >
                <table>
                  <thead>
                    <tr>
                      <th>日期（UTC）</th>
                      <th>落地 PV</th>
                      <th>浏览器 UV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.daily.map((d) => (
                      <tr key={d.day}>
                        <td>{d.day}</td>
                        <td>{d.pv ?? 0}</td>
                        <td>{d.uv ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </>
      )}
      <p className="muted collabs-observation-note">
        UV 去重的是浏览器，不等于准确真人数；跨设备、无痕、清除或限制 Cookie
        会影响识别。拒绝分析或脚本被拦截时可能未采集。访客标识及去重明细最多保留 90
        天，撤回许可会移除对应 UV 明细。仅覆盖在 Offy 的落地页，不含仅在 Shopify
        域名内的访问；不用于重新计佣。
      </p>
    </section>
  );
}
