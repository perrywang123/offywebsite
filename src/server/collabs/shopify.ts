import { z } from "zod";
import type { ReportRow } from "@/lib/collabs/reports";
import { adminRequest } from "../kol/shopify";
import { minor } from "../kol/money";
import type { OrderEvidence } from "./service";
const boundedFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)])
      : AbortSignal.timeout(8000),
  });
const fields = `id name cancelledAt displayFinancialStatus currentTotalPriceSet { presentmentMoney { amount currencyCode } } totalRefundedSet { presentmentMoney { amount currencyCode } }`;
const schema = z.object({
  id: z.string(),
  name: z.string(),
  cancelledAt: z.string().nullable(),
  displayFinancialStatus: z.string().nullable(),
  currentTotalPriceSet: z.object({
    presentmentMoney: z.object({ amount: z.string(), currencyCode: z.string() }),
  }),
  totalRefundedSet: z.object({
    presentmentMoney: z.object({ amount: z.string(), currencyCode: z.string() }),
  }),
});
/** Only read order facts. No tags, notes, refunds, discount writes, or payout mutation. */
export async function lookupOrder(
  row: Pick<ReportRow, "orderId" | "orderName">,
): Promise<OrderEvidence | null> {
  let raw: unknown;
  if (row.orderId) {
    if (!/^gid:\/\/shopify\/Order\/\d+$/.test(row.orderId)) throw new Error("invalid_order_id");
    const data = await adminRequest<{ order: unknown }>(
      `query CollabsOrder($id:ID!){order(id:$id){${fields}}}`,
      { id: row.orderId },
      boundedFetch,
    );
    raw = data.order;
  } else {
    const name = row.orderName;
    if (!name || name.length > 100) return null;
    const query = `name:"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    const data = await adminRequest<{ orders: { nodes: unknown[] } }>(
      `query CollabsOrderName($query:String!){orders(first:2,query:$query){nodes{${fields}}}}`,
      { query },
      boundedFetch,
    );
    const candidates = data.orders.nodes.map((n) => schema.parse(n)).filter((o) => o.name === name);
    if (candidates.length !== 1) return null;
    raw = candidates[0];
  }
  if (!raw) return null;
  const o = schema.parse(raw),
    money = o.currentTotalPriceSet.presentmentMoney,
    refund = o.totalRefundedSet.presentmentMoney;
  return {
    id: o.id,
    name: o.name,
    currency: money.currencyCode,
    total: minor(money.amount, money.currencyCode),
    canceled: !!o.cancelledAt,
    refunded: minor(refund.amount, refund.currencyCode) > 0,
    refundedTotal:
      refund.currencyCode === money.currencyCode
        ? minor(refund.amount, refund.currencyCode)
        : undefined,
    financialStatus: o.displayFinancialStatus ?? "UNKNOWN",
  };
}
