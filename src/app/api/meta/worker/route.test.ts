// @vitest-environment node
import { expect, it, vi } from "vitest";
const run = vi.hoisted(() => vi.fn().mockResolvedValue({ processed: 0, state: "ready" }));
vi.mock("@/lib/env", () => ({
  env: { KOL_WORKER_SECRET: "local-only-worker-secret-000000000000" },
}));
vi.mock("@/server/meta/runtime", () => ({ runMetaWorker: run }));
import { POST } from "./route";
it("requires internal authentication before processing a queue", async () => {
  expect(
    (await POST(new Request("http://localhost/api/meta/worker", { method: "POST" }))).status,
  ).toBe(404);
  expect(run).not.toHaveBeenCalled();
  expect(
    (
      await POST(
        new Request("http://localhost/api/meta/worker", {
          method: "POST",
          headers: { authorization: "Bearer local-only-worker-secret-000000000000" },
        }),
      )
    ).status,
  ).toBe(200);
  expect(run).toHaveBeenCalledTimes(1);
});
