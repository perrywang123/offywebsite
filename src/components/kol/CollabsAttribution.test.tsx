import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CollabsAttribution } from "./CollabsAttribution";
it("shows an honest waiting state and leaves historical and payout data unknown", () => {
  render(
    <CollabsAttribution
      data={{ creators: [], events: [] }}
      links={[]}
      busy={false}
      bind={async () => {}}
    />,
  );
  expect(screen.getByText("尚未收到官方归属事件")).toBeInTheDocument();
  expect(screen.getByText(/不会自动回填历史订单/)).toBeInTheDocument();
});
it("separates official cumulative snapshots from Shopify refund facts, without guessing a commission currency", () => {
  const data = {
    creators: [
      {
        nativeId: "123",
        creatorId: null,
        flowSentAt: 1,
        firstReceivedAt: 1,
        lastReceivedAt: 1,
        salesNumber: 1,
        linkVisits: 5,
        snapshot: {
          firstName: "Maya",
          lastName: null,
          primaryUsername: "maya",
          salesNumber: 1,
          linkVisitsCumulative: 5,
          salesCumulativeCents: 4706,
          commissionCumulativeCents: 471,
        },
      },
    ],
    events: [
      {
        id: "event",
        nativeId: "123",
        orderId: "gid://shopify/Order/1",
        orderName: "#1001",
        orderCreatedAt: "2026-11-08T00:00:00Z",
        flowSentAt: 1,
        receivedAt: 1,
        order: {
          id: "gid://shopify/Order/1",
          name: "#1001",
          currency: "HKD",
          total: 36900,
          refundedTotal: 36900,
          refunded: true,
          canceled: false,
          financialStatus: "REFUNDED",
        },
        checkedAt: 2,
        nextAt: 1,
        leaseUntil: 0,
        attempts: 0,
        error: null,
      },
    ],
  };
  render(<CollabsAttribution data={data} links={[]} busy={false} bind={async () => {}} />);
  expect(screen.getByText(/币种未由此事件提供/)).toBeInTheDocument();
  expect(screen.queryByText(/USD 4.71/)).not.toBeInTheDocument();
  expect(screen.getByText("已退款")).toBeInTheDocument();
  expect(screen.getByText("待关联 Offy 合作记录")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /付款|撤佣/ })).not.toBeInTheDocument();
});
