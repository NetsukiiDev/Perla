// POST /api/admin/update — admin-only. Triggers whichever "Update now"
// mechanism is configured (see lib/self-update.ts); returns 400 if neither
// DEPLOY_HOOK_URL nor SELF_UPDATE_ENABLED is set.
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { writeAccessLog } from "@/lib/access-log";
import { performUpdate, updateModeConfigured } from "@/lib/self-update";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const mode = updateModeConfigured();
  if (!mode) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  }

  const result = await performUpdate();

  await writeAccessLog({
    type: "admin_action",
    metadata: {
      action: "Aggiornamento avviato",
      detail: result.ok ? mode : `${mode} - fallito: ${result.error}`,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: "update_failed", detail: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode });
}
