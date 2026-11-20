"use client";

import { useEffect, useState } from "react";
import type {
  readMetaOrderEvidence,
  orderReconciliationFilter,
} from "@/server/meta/reconciliation";
import type { ShopifyOrderSource } from "@/server/meta/shopify-order-source";
import type { z } from "zod";
import { decimal } from "@/server/kol/money";

type Result = Awaited<ReturnType<typeof readMetaOrderEvidence>>;
type Scope = Pick<
  z.infer<typeof orderReconciliationFilter>,
  "from" | "to" | "adId" | "campaignId" | "source" | "includeTests"
>;
type DateBasis = "checkout" | "payment";
const adsUrl = "https://adsmanager.facebook.com/adsmanager/manage/ads?act=1301113714798915";

const statusLabels: Record<string, string> = {
  PAID: "已付款",
  PARTIALLY_PAID: "部分付款",
  PARTIALLY_REFUNDED: "部分退款",
  REFUNDED: "已退款",
  PENDING: "待付款",
  AUTHORIZED: "已授权",
  VOIDED: "已作废",
  UNKNOWN: "状态未知",
};
export const orderStatusLabel = (status: string) => statusLabels[status] ?? status;
export const metaEvidenceTime = (at: number) =>
  new Date(at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });

const shopifyLookupMessages = {
  not_found: "未找到匹配的 Shopify 订单。请核对订单号。",
  not_configured: "Shopify Admin API 尚未配置，暂时无法查订单来源。",
  unavailable: "Shopify 访问记录暂时读取失败，请重试。",
  outside_range: "这笔 Shopify 订单超出最近 30 天的查询范围。",
};
const journeyMessages = {
  pending: "Shopify 正在准备此次转化的访问记录。",
  partial: "Shopify 提供的访问记录不完整，暂时无法确认广告 ID。",
  conflict: "Shopify 记录了多个广告 ID，本次成交来源未确认。",
  complete: "",
};

function ShopifyOrderEvidence({
  order,
  hasLocalOrder,
  copyAdId,
}: {
  order: Extract<ShopifyOrderSource, { status: "found" }>;
  hasLocalOrder: boolean;
  copyAdId: (id: string) => void;
}) {
  const { ad } = order;
  return (
    <article
      className="meta-order meta-order-source"
      aria-label={`${order.orderName} Shopify 访问记录`}
    >
      <div className="section-line">
        <strong>{hasLocalOrder ? "Shopify 访问记录" : order.orderName}</strong>
        <span>
          {order.test ? "测试 · " : ""}
          {order.canceled ? "已取消 · " : ""}
          {orderStatusLabel(order.financialStatus)}
        </span>
      </div>
      <div className="meta-order-ad">
        <div>
          {ad ? (
            <>
              <span>Shopify 访问记录中的广告 ID</span> <strong>{ad.id}</strong>
              <p className="muted">{[ad.source, ad.medium].filter(Boolean).join(" / ")}</p>
            </>
          ) : (
            <strong>
              {order.hasMetaClick ? "有 Meta 点击标识 · 广告 ID 缺失" : "广告来源未确认"}
            </strong>
          )}
          {journeyMessages[order.journey] && (
            <p className="muted">{journeyMessages[order.journey]}</p>
          )}
        </div>
        {ad && (
          <button type="button" onClick={() => copyAdId(ad.id)}>
            复制广告 ID
          </button>
        )}
      </div>
      <dl className="meta-order-facts">
        {order.salesChannel && (
          <div>
            <dt>销售渠道</dt>
            <dd>{order.salesChannel}</dd>
          </div>
        )}
        <div>
          <dt>Shopify 下单时间</dt>
          <dd>{metaEvidenceTime(order.placedAt)}</dd>
        </div>
        {ad && (
          <div>
            <dt>广告访问时间</dt>
            <dd>{metaEvidenceTime(ad.at)}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export function MetaOrderReconciliation({ scope, revision }: { scope: Scope; revision: number }) {
  const [draft, setDraft] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [basis, setBasis] = useState<DateBasis>("checkout");
  const [position, setPosition] = useState({ filter: "", page: 1 });
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<
    { request: string; data: Result } | { request: string; error: true }
  >();
  const params = new URLSearchParams({
    ...(scope.includeTests ? { includeTests: "true" } : {}),
    ...(orderNumber
      ? { orderNumber }
      : {
          basis,
          ...(scope.from ? { from: scope.from } : {}),
          ...(scope.to ? { to: scope.to } : {}),
          ...(scope.campaignId ? { campaignId: scope.campaignId } : {}),
          ...(scope.adId ? { adId: scope.adId } : {}),
          ...(scope.source && scope.source !== "all" ? { source: scope.source } : {}),
        }),
  });
  const filter = params.toString();
  const page = position.filter === filter ? position.page : 1;
  params.set("page", String(page));
  const query = params.toString(),
    request = `${query}:${revision}:${retry}`;
  const current = state?.request === request ? state : undefined;
  const result = current && "data" in current ? current.data : undefined;
  const shopify = result?.shopifyLookup;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/admin/kol/meta/orders?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("order_source_unavailable");
        const data: Result = await response.json();
        if (!controller.signal.aborted) setState({ request, data });
      } catch {
        if (!controller.signal.aborted) setState({ request, error: true });
      }
    }
    void load();
    return () => controller.abort();
  }, [query, request]);

  async function copyAdId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setMessage(`已复制广告 ID ${id}`);
    } catch {
      setMessage("无法自动复制，请选中广告 ID 后复制。");
    }
  }

  return (
    <div className="meta-order-reconciliation">
      <div className="toolbar meta-order-toolbar">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setOrderNumber(draft.trim());
            setPosition({ filter: "", page: 1 });
            setRetry((value) => value + 1);
            setMessage("");
          }}
        >
          <label htmlFor="meta-order-number">Shopify 订单号</label>
          <div className="meta-order-query">
            <input
              id="meta-order-number"
              type="search"
              placeholder="例如 #1234"
              maxLength={100}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="primary" type="submit" disabled={!draft.trim()}>
              查询订单
            </button>
            {orderNumber && (
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  setOrderNumber("");
                  setPosition({ filter: "", page: 1 });
                  setMessage("");
                }}
              >
                清除
              </button>
            )}
          </div>
        </form>
        {!orderNumber && (
          <label>
            订单日期口径
            <select
              value={basis}
              onChange={(event) => {
                setBasis(event.target.value === "payment" ? "payment" : "checkout");
                setPosition({ filter: "", page: 1 });
                setMessage("");
              }}
            >
              <option value="checkout">按结账日期</option>
              <option value="payment">按付款日期</option>
            </select>
          </label>
        )}
        <a className="button" href={adsUrl} target="_blank" rel="noreferrer">
          打开 Meta 广告 ↗
        </a>
      </div>
      <p className="muted meta-filter-note">
        {orderNumber
          ? "订单号查询覆盖最近 30 天。"
          : "列表沿用上方筛选。输入订单号可查看最近 30 天的 Offy 或 Shopify 来源证据。"}
        时间均为北京时间。
        {basis === "payment" && !orderNumber && " 仅显示已取得 Shopify 付款时间的订单。"}
      </p>
      {message && <p role="status">{message}</p>}
      {!current && <p role="status">读取订单证据中…</p>}
      {current && "error" in current && (
        <div className="toolbar">
          <p role="alert">订单证据暂时读取失败。</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            重试
          </button>
        </div>
      )}
      {result && (
        <>
          {!orderNumber &&
            result.currencies.map((currency) => (
              <p key={currency.currency}>
                <strong>{currency.currency}</strong> · {currency.orders} 笔有付款历史且未取消的订单
                · 总额 {decimal(currency.totalMinor, currency.currency)} · 已退款{" "}
                {decimal(currency.refundedMinor, currency.currency)}
              </p>
            ))}
          {result.total > 0 && !orderNumber && (
            <p className="muted" role="status">
              共 {result.total} 笔匹配订单
            </p>
          )}
          {!result.total && !shopify && (
            <p className="muted" role="status">
              {orderNumber
                ? `未找到 ${orderNumber} 的关联证据。请核对 Shopify 订单号和同步状态。`
                : "当前筛选范围内暂无关联订单。可调整日期或直接查订单号。"}
            </p>
          )}
          <div className="meta-orders">
            {result.rows.map((order) => {
              const { source } = order;
              const adId = source.ad_id;
              const labels = [source.utm_source, source.utm_medium].filter(Boolean).join(" / ");
              return (
                <article
                  className="meta-order meta-order-source"
                  key={order.orderId}
                  aria-label={order.orderName}
                >
                  <div className="section-line">
                    <strong>{order.orderName}</strong>
                    <span>
                      {order.test ? "测试 · " : ""}
                      {order.canceled ? "已取消 · " : ""}
                      {orderStatusLabel(order.financialStatus)}
                    </span>
                  </div>
                  <div className="meta-order-ad">
                    <div>
                      {adId ? (
                        <>
                          <span>Offy 结账记录中的广告 ID</span> <strong>{adId}</strong>
                        </>
                      ) : (
                        <strong>
                          {order.hasFbc ? "有 Meta 点击标识 · 广告 ID 缺失" : "广告来源证据不足"}
                        </strong>
                      )}
                      {labels && <p className="muted">{labels}</p>}
                    </div>
                    {adId && (
                      <button type="button" onClick={() => void copyAdId(adId)}>
                        复制广告 ID
                      </button>
                    )}
                  </div>
                  <dl className="meta-order-facts">
                    <div>
                      <dt>结账时间</dt>
                      <dd>{metaEvidenceTime(order.checkoutAt)}</dd>
                    </div>
                    <div>
                      <dt>Shopify 付款时间</dt>
                      <dd>{order.paidAt ? metaEvidenceTime(order.paidAt) : "暂无已确认时间"}</dd>
                    </div>
                    {source.campaign_id && (
                      <div>
                        <dt>广告系列 ID</dt>
                        <dd>{source.campaign_id}</dd>
                      </div>
                    )}
                    {source.adset_id && (
                      <div>
                        <dt>广告组 ID</dt>
                        <dd>{source.adset_id}</dd>
                      </div>
                    )}
                    <div>
                      <dt>订单总额</dt>
                      <dd>
                        {decimal(order.totalMinor, order.currency)} {order.currency}
                      </dd>
                    </div>
                    {order.refundedMinor > 0 && (
                      <div>
                        <dt>已退款</dt>
                        <dd>
                          {decimal(order.refundedMinor, order.currency)} {order.currency}
                        </dd>
                      </div>
                    )}
                  </dl>
                </article>
              );
            })}
            {shopify?.status === "found" && (
              <ShopifyOrderEvidence
                order={shopify}
                hasLocalOrder={result.rows.length > 0}
                copyAdId={(id) => void copyAdId(id)}
              />
            )}
            {shopify && shopify.status !== "found" && (
              <p className="muted" role="status">
                {shopifyLookupMessages[shopify.status]}
              </p>
            )}
          </div>
          {result.total > result.pageSize && (
            <div className="toolbar-actions" aria-label="订单分页">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPosition({ filter, page: page - 1 })}
              >
                上一页
              </button>
              <button
                type="button"
                disabled={result.total <= page * result.pageSize}
                onClick={() => setPosition({ filter, page: page + 1 })}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
