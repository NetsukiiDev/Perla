import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { getParticipantView } from "@/lib/admin-participant-view";
import { codeAccessUrl } from "@/lib/code-access-link";
import { AdminContainer } from "@/components/admin/AdminContainer";
import { ParticipantDetail } from "@/components/admin/ParticipantDetail";

export const dynamic = "force-dynamic";

function requestBaseUrl(headersList: Headers): string | null {
  const host = headersList.get("host");
  if (!host) return null;

  const forwardedProto = headersList.get("x-forwarded-proto");
  if (forwardedProto) return `${forwardedProto.split(",")[0].trim()}://${host}`;

  const referer = headersList.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${host}`;
    } catch {
      // fall through
    }
  }

  return `https://${host}`;
}

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string; participantId: string }>;
}) {
  await requireAdminPage();

  const { id, participantId } = await params;

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant || participant.eventId !== id) notFound();

  const view = await getParticipantView(participantId);
  if (!view) notFound();
  const headersList = await headers();
  const baseUrl = requestBaseUrl(headersList);
  const accessUrl = view.code && baseUrl ? codeAccessUrl(baseUrl, view.code) : null;

  return (
    <AdminContainer>
      <Link
        href={`/admin/events/${id}/participants`}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Partecipanti
      </Link>
      <div className="mb-6 mt-2">
        <h1 className="text-xl font-semibold">{view.code ?? "Codice"}</h1>
        {view.displayName && <p className="text-sm text-muted">{view.displayName}</p>}
      </div>
      <ParticipantDetail accessUrl={accessUrl} participant={view} />
    </AdminContainer>
  );
}
