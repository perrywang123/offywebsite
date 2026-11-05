import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireIngress } from "@/server/kol/auth";
import { AdminWorkspace } from "@/components/kol/AdminWorkspace";
import "./admin.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Offy · 合作账簿",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    requireIngress(await headers());
  } catch {
    notFound();
  }
  return (
    <html lang="zh-CN">
      <body>
        <AdminWorkspace>{children}</AdminWorkspace>
      </body>
    </html>
  );
}
