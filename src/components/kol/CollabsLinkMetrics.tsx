"use client";
import { useEffect, useState } from "react";
import type { linkMetrics } from "@/server/collabs/links";
type Metrics = ReturnType<typeof linkMetrics>;
const time = (at: number) => new Date(at).toLocaleString("zh-CN", { timeZone: "UTC" }) + " UTC";
export function CollabsLinkMetrics({
  initial,
  load,
}: {
  initial: Metrics;
  load: (days: number) => Promise<Metrics>;
}) {
  const [data, setData] = useState(initial),
    [selected, setSelected] = useState(initial.links[0]?.id ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setData(initial), [initial]);
  const current = data.links.find((l) => l.id === selected) ?? data.links[0];
  const max = Math.max(1, ...(current?.daily.map((d) => d.count ?? 0) ?? []));
  async function period(days: number) {
    setBusy(true);
    setError("");
    try {
      setData(await load(days));
    } catch {
      setError("暂时无法刷新统计，保留上次读取结果。请重试。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="collabs-observation" aria-label="Offy 短链统计">
      <div className="collabs-section-head">
        <div>
          <p className="eyebrow">OFFY / 访问观察</p>
          <h2>Offy 短链打开次数</h2>
          <p className="muted">
            有效跳转请求数，不等于独立访客，也不是 Collabs Visits。重复打开会重复计数。
          </p>
        </div>
        <label className="collabs-period">
          统计周期
          <select
            value={data.days}
            disabled={busy}
            onChange={(e) => void period(Number(e.target.value))}
          >
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                最近 {d} 天
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
      {busy && <p role="status">正在刷新统计…</p>}
      {!current ? (
        <p className="collabs-empty">建立合作链接后，可在此查看每条短链的打开次数。</p>
      ) : (
        <>
          <div className="collabs-link-picker" role="group" aria-label="选择推广短链">
            {data.links.map((l) => (
              <button
                key={l.id}
                aria-pressed={l.id === current.id}
                onClick={() => setSelected(l.id)}
              >
                <strong>{l.name}</strong>
                <span>
                  /r/{l.alias}
                  {!l.enabled ? " · 已停用" : ""}
                </span>
                <small>{l.firstAt === null ? "尚未采集" : `累计 ${l.total} 次`}</small>
              </button>
            ))}
          </div>
          {current.firstAt === null ? (
            <div className="collabs-empty">
              <h3>尚未记录到有效打开</h3>
              <p className="muted">
                统计从功能上线后的首个有效打开开始；此前历史未知，不能视为零访问。
              </p>
            </div>
          ) : (
            <div className="collabs-link-evidence">
              <div className="collabs-metric-row">
                <div>
                  <span>今日已记录（UTC）</span>
                  <strong>
                    {current.daily.at(-1)?.count ?? 0}
                    <small> 次打开</small>
                  </strong>
                </div>
                <div>
                  <span>所选周期已记录</span>
                  <strong>
                    {current.periodTotal}
                    <small> 次打开</small>
                  </strong>
                </div>
                <div>
                  <span>采集以来累计</span>
                  <strong>
                    {current.total}
                    <small> 次打开</small>
                  </strong>
                </div>
              </div>
              <p className="muted">
                {data.from} — {data.to} · UTC 按日汇总
                <br />
                首笔采集：{time(current.firstAt)}
                <br />
                最近打开：{time(current.lastAt!)}
              </p>
              <div className="collabs-daily-bars" aria-label="每日打开趋势，精确值见下方每日明细">
                {current.daily.map((d) => (
                  <div
                    key={d.day}
                    className={d.count === null ? "is-unknown" : ""}
                    title={`${d.day}：${d.count === null ? "未采集" : `${d.count} 次`}`}
                  >
                    <span
                      style={{ height: d.count ? `${Math.max(3, (d.count / max) * 100)}%` : "0" }}
                    />
                  </div>
                ))}
              </div>
              <div className="collabs-chart-caption">
                <span>{data.from}</span>
                <span>空白斜纹：未采集</span>
                <span>{data.to}</span>
              </div>
              <details>
                <summary>查看每日明细</summary>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="短链每日打开明细"
                >
                  <table>
                    <thead>
                      <tr>
                        <th>日期（UTC）</th>
                        <th>打开请求数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.daily.map((d) => (
                        <tr key={d.day}>
                          <td>{d.day}</td>
                          <td>{d.count === null ? "未采集" : d.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </>
      )}
      <p className="muted collabs-observation-note">
        已排除
        HEAD、常见预取与机器人预览；无法识别的自动请求仍可能计入。采集前的日期未补造历史，首笔所在日可能只覆盖部分时间。计数采用尽力写入，异常时可能少计，不作为佣金结算依据。
      </p>
    </section>
  );
}
