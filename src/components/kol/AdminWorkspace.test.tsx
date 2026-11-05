import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const route = vi.hoisted(() => ({ pathname: "/admin/orders" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/server/kol/auth", () => ({ requireIngress: vi.fn() }));
vi.mock("@/app/admin/admin.css", () => ({}));
vi.mock("./AdminConsole", () => ({
  AdminConsole: ({ view }: { view: string }) => <h1>{view}</h1>,
}));
import AdminLayout from "@/app/admin/layout";
import AdminPage from "@/app/admin/[[...section]]/page";
import { AdminWorkspace } from "./AdminWorkspace";
import { requireIngress } from "@/server/kol/auth";
beforeEach(() => {
  route.pathname = "/admin/orders";
});
it("hosts the console in the shared guarded layout and leaves valid leaf pages empty", async () => {
  const child = await AdminPage({ params: Promise.resolve({ section: ["orders"] }) });
  expect(child).toBeNull();
  const layout = await AdminLayout({ children: child });
  render(layout.props.children.props.children);
  expect(screen.getByRole("heading", { name: "orders" })).toBeInTheDocument();
  expect(requireIngress).toHaveBeenCalled();
});
it("keeps unknown routes outside the console and still rejects them on the server", async () => {
  route.pathname = "/admin/orders/unknown";
  render(
    <AdminWorkspace>
      <h1>not found</h1>
    </AdminWorkspace>,
  );
  expect(screen.getByRole("heading", { name: "not found" })).toBeInTheDocument();
  await expect(
    AdminPage({ params: Promise.resolve({ section: ["orders", "unknown"] }) }),
  ).rejects.toThrow("NEXT_NOT_FOUND");
});
