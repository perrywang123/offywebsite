import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { CollabsLandingMetrics } from "./CollabsLandingMetrics";
const metrics = {
  days: 7,
  from: "2026-11-02",
  to: "2026-11-08",
  timezone: "UTC" as const,
  retentionDays: 90,
  source: "offy_consented_landing" as const,
  groups: [
    {
      dtId: "3689395",
      aliases: ["perry-test", "legacy-test"],
      names: ["Perry", "Internal test"],
      enabled: true,
      totalPv: 7,
      firstAt: 1794096000000,
      lastAt: 1794096000000,
      periodPv: 5,
      periodUv: 2,
      todayPv: 3,
      todayUv: 2,
      daily: [
        { day: "2026-11-07", pv: null, uv: null },
        { day: "2026-11-08", pv: 3, uv: 2 },
      ],
    },
  ],
};
it("shows one dt_id group and distinct period UV separately from redirect and official figures", async () => {
  const user = userEvent.setup();
  render(<CollabsLandingMetrics initial={metrics} load={async () => metrics} />);
  expect(screen.getByRole("heading", { name: "推广落地浏览与访客" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /dt_id=3689395/ })).toHaveLength(1);
  expect(screen.getByText(/多个历史别名共用同一追踪组/)).toBeInTheDocument();
  expect(screen.getByText("5")).toBeInTheDocument();
  expect(screen.getByText(/浏览器，不等于准确真人数/)).toBeInTheDocument();
  await user.click(screen.getByText("查看落地每日明细"));
  expect(screen.getAllByRole("cell", { name: "0" })).toHaveLength(2);
  expect(screen.getByText(/不是每日 UV 相加/)).toBeInTheDocument();
});
it("preserves prior observations on a failed period reload", async () => {
  const user = userEvent.setup();
  render(
    <CollabsLandingMetrics
      initial={metrics}
      load={async () => {
        throw new Error("offline");
      }}
    />,
  );
  await user.selectOptions(screen.getByLabelText("落地统计周期"), "30");
  expect(await screen.findByRole("alert")).toHaveTextContent("保留上次读取结果");
  expect(screen.getByText("5")).toBeInTheDocument();
});
