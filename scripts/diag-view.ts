// Throwaway diagnostic: proves getParticipantView decrypts the last known
// position against the live DB. Run: npx tsx scripts/diag-view.ts <participantId>
import "dotenv/config";
import { prisma } from "@/lib/db";
import { encryptCoord } from "@/lib/crypto";
import { getParticipantView } from "@/lib/admin-participant-view";

async function main() {
  const pid = process.argv[2];
  const before = await getParticipantView(pid);
  console.log("PRIMA:", { code: before?.code, status: before?.displayStatus, pos: before?.lastLocation });

  const p = await prisma.participant.findUnique({
    where: { id: pid },
    include: { inviteCodes: { take: 1, orderBy: { createdAt: "desc" } } },
  });
  const codeId = p!.inviteCodes[0].id;
  const now = new Date();
  const session = await prisma.session.create({
    data: {
      inviteCodeId: codeId,
      participantId: pid,
      sessionTokenHash: "diag" + Date.now(),
      deviceTokenHash: "diagdev",
      status: "active",
      currentStep: 3,
      startedAt: now,
      lastSeenAt: now,
    },
  });
  await prisma.locationUpdate.create({
    data: {
      sessionId: session.id,
      latEncrypted: encryptCoord(43.78),
      lngEncrypted: encryptCoord(11.25),
      expiresAt: new Date(now.getTime() + 3600e3),
    },
  });

  const after = await getParticipantView(pid);
  console.log("DOPO:", {
    code: after?.code,
    status: after?.displayStatus,
    step: `${after?.currentStep}/${after?.stepsCount}`,
    pos: after?.lastLocation,
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
