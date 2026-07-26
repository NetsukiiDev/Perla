// GET /api/admin/branch — current branch + available branches
// PUT /api/admin/branch — switch branch (git checkout + pull, rebuild in prod)
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { getBranches, switchBranch } from "@/lib/self-update";
import { writeAccessLog } from "@/lib/access-log";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const res = await getBranches();
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }
  return NextResponse.json(res.data);
}

export async function PUT(req: Request) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => null)) as { branch?: string } | null;
  const branch = body?.branch?.trim();
  if (!branch) {
    return NextResponse.json({ error: "missing_branch" }, { status: 400 });
  }

  const res = await switchBranch(branch);
  if (!res.ok) {
    console.error("[branch] switch failed:", res.error);
    return NextResponse.json({ error: res.error }, { status: 500 });
  }

  await writeAccessLog({ type: "admin_action", metadata: { action: `Branch cambiata su ${branch}` } });
  return NextResponse.json({ ok: true, branch });
}
