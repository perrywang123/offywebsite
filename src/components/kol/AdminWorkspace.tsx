"use client";

import { usePathname } from "next/navigation";
import { AdminConsole } from "./AdminConsole";

/** Shared layout lifetime keeps authenticated state in memory across section navigation. */
export function AdminWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const match = /^\/admin(?:\/(partners|codes|orders|settlements|checkouts))?\/?$/.exec(pathname);
  if (!match) return children;
  return (
    <AdminConsole
      view={
        (match[1] ?? "partners") as "partners" | "codes" | "orders" | "settlements" | "checkouts"
      }
    />
  );
}
