import { notFound } from "next/navigation";
import { AdminConsole } from "@/components/kol/AdminConsole";
export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const section = (await params).section ?? [],
    view = section[0] ?? "partners";
  if (section.length > 1 || !["partners", "codes", "orders", "settlements"].includes(view))
    notFound();
  return <AdminConsole view={view as "partners" | "codes" | "orders" | "settlements"} />;
}
