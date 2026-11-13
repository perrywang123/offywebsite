"use client";
import type { attributionState } from "@/server/collabs/events";
import type { listCreators } from "@/server/collabs/service";
import { decimal } from "@/server/kol/money";
type State = ReturnType<typeof attributionState>;
const time = (at: number) => new Date(at).toLocaleString("zh-CN");
const money = (amount: number, currency: string) => `${currency} ${decimal(amount, currency)}`;
const financial: Record<string, string> = {
  PAID: "已付款",
  PENDING: "待付款",
  AUTHORIZED: "已授权",
  PARTIALLY_PAID: "部分付款",
  PARTIALLY_REFUNDED: "部分退款",
  REFUNDED: "已退款",
  VOIDED: "已作废",
  UNKNOWN: "未知",
};
export function CollabsAttribution({
  data,
  links,
  busy,
  bind,
}: {
  data: State;
  links: Array<ReturnType<typeof listCreators>[number] & { archivedAt?: number }>;
  busy: boolean;
  bind: (nativeId: string, creatorId: string) => Promise<void>;
}) {
  const availableLinks = links.filter((l) => !l.archivedAt);
  return (
    <section className="collabs-observation" aria-label="官方归属自动同步">
      <div className="collabs-section-head">
        <div>
          <p className="eyebrow">SHOPIFY FLOW / 官方归属事件</p>
          <h2>官方转化与订单核对</h2>
          <p className="muted">
            收到 Collabs 的 Order Attributed
            后自动入库，后台只读核对订单。新事件开始接收后，不会自动回填历史订单。
          </p>
        </div>
      </div>
      {!data.events.length ? (
        <div className="collabs-empty">
          <h3>尚未收到官方归属事件</h3>
          <p className="muted">
            需在 Shopify Flow 启用 Offy
            同步流程；这不代表没有销售或佣金。历史账单仍可在下方导入核对。
          </p>
        </div>
      ) : (
        <>
          <div className="collabs-report-list">
            {data.creators.map((c) => {
              const link = links.find((l) => l.id === c.creatorId),
                s = c.snapshot;
              return (
                <article className="collabs-creator-card" key={c.nativeId}>
                  <strong>
                    {link?.name ??
                      ([s.firstName, s.lastName].filter(Boolean).join(" ") ||
                        s.primaryUsername ||
                        `创作者 ${c.nativeId}`)}
                  </strong>
                  <p className="muted">
                    官方唯一编号：{c.nativeId}
                    <br />
                    官方快照发送于 {time(c.flowSentAt)}
                    <br />
                    最近接收于 {time(c.lastReceivedAt)}
                  </p>
                  <dl className="collabs-native-stats">
                    <div>
                      <dt>官方累计 Visits</dt>
                      <dd>{c.linkVisits ?? "未提供"}</dd>
                    </div>
                    <div>
                      <dt>官方累计归属订单</dt>
                      <dd>{c.salesNumber ?? "未提供"}</dd>
                    </div>
                  </dl>
                  <p className="muted">
                    仅为归属事件携带的累计快照，访问发生后不会单独推送更新，不能按当前筛选周期或多次快照相加。
                  </p>
                  <details>
                    <summary>查看累计金额原始字段</summary>
                    <p>币种未由此事件提供，暂不折算成金额，也不作为本笔佣金或已付款金额。</p>
                    <p>
                      salesCumulativeCents：{s.salesCumulativeCents ?? "未提供"}
                      <br />
                      commissionCumulativeCents：{s.commissionCumulativeCents ?? "未提供"}
                    </p>
                    <p className="muted">
                      官方结算金额、冻结及付款状态请查看 Collabs 或导入官方报告。
                    </p>
                  </details>
                  {link ? (
                    <p>
                      已关联 /r/{link.alias}
                      {link.archivedAt ? "（已归档，历史归属保留）" : ""}
                    </p>
                  ) : (
                    <div className="collabs-flow-binding">
                      <p className="message">待关联 Offy 合作记录</p>
                      <p className="muted">
                        先在 Collabs 核对该编号对应的创作者，再关联一次。不会按名称、邮箱或 dt_id
                        猜测。
                      </p>
                      {availableLinks.length > 0 && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            void bind(c.nativeId, String(f.get("creatorId")));
                          }}
                        >
                          <label>
                            关联的推广短链
                            <select name="creatorId" required defaultValue="">
                              <option value="" disabled>
                                选择已核实的合作记录
                              </option>
                              {availableLinks.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name} · /r/{l.alias}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button disabled={busy}>确认关联</button>
                        </form>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <p className="table-scroll-hint">
            订单明细较宽，可左右滑动；使用键盘聚焦表格区域后可横向滚动。
          </p>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="最近官方归属订单">
            <table>
              <thead>
                <tr>
                  <th>官方归属订单</th>
                  <th>创作者</th>
                  <th>Shopify 当前订单事实</th>
                  <th>核对状态</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((e) => {
                  const native = data.creators.find((c) => c.nativeId === e.nativeId),
                    link = links.find((l) => l.id === native?.creatorId);
                  return (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.orderName}</strong>
                        <small>接收：{time(e.receivedAt)}</small>
                        <small>Flow 发送：{time(e.flowSentAt)}</small>
                      </td>
                      <td>
                        {link?.name ?? `官方编号 ${e.nativeId}`}
                        <small>{link ? `/r/${link.alias}` : "待关联；官方归属仍保留"}</small>
                      </td>
                      <td>
                        {e.order ? (
                          <>
                            {financial[e.order.financialStatus] ?? e.order.financialStatus}
                            <small>当前订单总额 {money(e.order.total, e.order.currency)}</small>
                            {e.order.refundedTotal !== undefined && (
                              <small>
                                累计退款 {money(e.order.refundedTotal, e.order.currency)}
                              </small>
                            )}
                            {e.order.canceled && <small>订单已取消</small>}
                          </>
                        ) : (
                          "尚无可核对订单事实"
                        )}
                      </td>
                      <td>
                        {e.error ? (
                          <>
                            <span className="message error">
                              {e.error === "order_not_found_in_accessible_range"
                                ? "当前权限范围未找到订单"
                                : e.error === "order_identity_mismatch"
                                  ? "订单身份不一致"
                                  : "Shopify 查询暂不可用"}
                            </span>
                            <small>后台将重试，不代表未付款</small>
                          </>
                        ) : e.checkedAt ? (
                          "已只读核对"
                        ) : (
                          "等待后台查询"
                        )}
                        {e.checkedAt && <small>{time(e.checkedAt)}</small>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted">
            显示最近 100 条归属关系。退款与取消只提示核对，不代表 Collabs
            已撤佣；买家已付款也不能证明 KOL 已到账。
          </p>
        </>
      )}
    </section>
  );
}
