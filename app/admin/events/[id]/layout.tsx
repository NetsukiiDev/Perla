// Centralizes the per-event authorization gate for every page nested under
// events/[id]/* (including the doubly-nested participant-detail page) — a
// notFound() thrown here blocks rendering of all descendant pages. Each leaf
// page still does its own Prisma fetch for display data; this only decides
// whether the request is allowed to proceed at all.
import { requireEventAccessPage } from "@/lib/admin-guard";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireEventAccessPage(id);
  return children;
}
