"use client";
import { useCallback, useEffect, useState } from "react";
import type { listMetaEvents } from "@/server/meta/store";
type Evidence = ReturnType<typeof listMetaEvents> & {
  config: {
    enabled: boolean;
    pixelId: string;
    capi: boolean;
    catalogCount: number;
    simulation?: boolean;
    testMode: boolean;
  };
};
const labels: Record<string, string> = {
  observed: "已记录观察",
  unconfigured: "CAPI 未启用或未配置",
  pending: "等待发送／重试",
  sending: "发送中",
  sent: "CAPI 已接收",
  failed: "发送终止",
};
export function MetaDiagnostics() {
  const [data, setData] = useState<Evidence>(),
    [name, setName] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(page),
        ...(name ? { name } : {}),
        ...(status ? { status } : {}),
      });
      const response = await fetch(`/api/admin/kol/meta?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      setError("广告诊断暂时读取失败，请重试；不会影响独立站下单。");
    } finally {
      setLoading(false);
    }
  }, [name, status, page]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section aria-label="Meta 广告诊断">
      <div className="section-line">
        <div>
          <h2>站内漏斗与发送状态</h2>
          <p className="muted">本地观察与 Meta 接收回执；不代表广告归因、订单或佣金。</p>
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
            Purchase 由 Shopify 官方集成负责，真实购买与跨域广告归因仍需在 Meta 核验。
          </div>
          <p>
            <a href="https://eventsmanager.facebook.com/" target="_blank" rel="noreferrer">
              事件管理工具 ↗
            </a>
            　
            <a
              href="https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1301113714798915"
              target="_blank"
              rel="noreferrer"
            >
              广告投放效果 ↗
            </a>
          </p>
        </>
      )}
      <div className="toolbar meta-filters">
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
            {["PageView", "ViewContent", "AddToCart", "InitiateCheckout"].map((n) => (
              <option key={n}>{n}</option>
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
      {!data && !error && <p role="status">正在读取诊断…</p>}
      {data?.rows.length === 0 && (
        <div className="empty">
          <h3>暂无匹配事件</h3>
          <p>从追踪启用后且许可允许的真实浏览开始采集；未接入或未许可不代表没有访问。</p>
        </div>
      )}
      <div className="meta-records">
        {data?.rows.map((row) => (
          <article key={row.id} className="meta-record">
            <div className="section-line">
              <strong>{row.name}</strong>
              <span>{labels[row.status] ?? row.status}</span>
            </div>
            <p className="muted">
              {new Date(row.createdAt).toLocaleString("zh-CN")} · {row.pagePath}
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
                <dd>
                  {Object.entries(row.source)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(" · ") || "无可识别来源标签"}
                </dd>
                <dt>匹配信息</dt>
                <dd>
                  广告点击标识：{row.hasFbc ? "有" : "无"}；浏览器标识：{row.hasFbp ? "有" : "无"}
                </dd>
                <dt>浏览器</dt>
                <dd>
                  {row.pixelAttempted ? "已调用 Pixel（平台接收另行核对）" : "未成功调用 Pixel"}
                </dd>
                <dt>CAPI 尝试</dt>
                <dd>
                  {row.attempts} 次{row.lastError ? ` · ${row.lastError}` : ""}
                </dd>
                <dt>事件编号</dt>
                <dd>{row.id}</dd>
                <dt>结账诊断编号</dt>
                <dd>{row.attemptId ?? "未关联"}</dd>
              </dl>
            </details>
          </article>
        ))}
      </div>
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
