import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { CollabsLinkMetrics } from "./CollabsLinkMetrics";
const metrics = {
  days: 7,
  from: "2026-11-02",
  to: "2026-11-08",
  timezone: "UTC" as const,
  links: [
    {
      id: "a",
      name: "Perry",
      alias: "perry-test",
      enabled: true,
      total: 4,
      periodTotal: 4,
      firstAt: 1794096000000,
      lastAt: 1794096000000,
      daily: [
        { day: "2026-11-07", count: null },
        { day: "2026-11-08", count: 4 },
      ],
    },
    {
      id: "b",
      name: "No observations",
      alias: "maya",
      enabled: false,
      total: 0,
      periodTotal: 0,
      firstAt: null,
      lastAt: null,
      daily: [{ day: "2026-11-08", count: null }],
    },
  ],
};
it("shows per-link source, collection boundary and accessible daily evidence without presenting unknown visits as zero", async () => {
  const user = userEvent.setup();
  render(<CollabsLinkMetrics initial={metrics} load={async () => metrics} />);
  expect(screen.getByRole("heading", { name: "Offy 短链打开次数" })).toBeInTheDocument();
  expect(screen.getByText(/不等于独立访客/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /perry-test/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await user.click(screen.getByRole("button", { name: /maya/ }));
  expect(screen.getByText("尚未记录到有效打开")).toBeInTheDocument();
  expect(screen.queryByText("累计 0 次")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /perry-test/ }));
  await user.click(screen.getByText("查看每日明细"));
  expect(screen.getByRole("cell", { name: "未采集" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "4" })).toBeInTheDocument();
});
it("keeps existing evidence visible on a failed period refresh", async () => {
  const user = userEvent.setup();
  render(
    <CollabsLinkMetrics
      initial={metrics}
      load={async () => {
        throw new Error("network");
      }}
    />,
  );
  await user.selectOptions(screen.getByLabelText("统计周期"), "30");
  expect(await screen.findByRole("alert")).toHaveTextContent("保留上次读取结果");
  expect(screen.getByText("累计 4 次")).toBeInTheDocument();
});
