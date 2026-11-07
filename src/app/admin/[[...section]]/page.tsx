import { notFound } from "next/navigation";
export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const section = (await params).section ?? [],
    view = section[0] ?? "partners";
  if (
    section.length > 1 ||
    !["collabs", "partners", "codes", "orders", "settlements", "checkouts"].includes(view)
  )
    notFound();
  // The shared layout owns the console; this leaf only validates direct URLs.
  return null;
}
