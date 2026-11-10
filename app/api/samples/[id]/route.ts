import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Advance a sample: collected -> received -> processing. "Completed" is set
// automatically once the pathologist approves every result.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("samples");
  if ("error" in a) return a.error;
  const id = Number(params.id);
  const b = await req.json().catch(() => ({}));
  const next: Record<string, [string, string]> = { receive: ["collected", "received"], process: ["received", "processing"] };
  const t = next[b.action];
  if (!Number.isInteger(id) || !t) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const rows = await query(
    `update samples set status = $3, received_at = case when $3 = 'received' then now() else received_at end
     where id = $1 and status = $2 returning id, status`,
    [id, t[0], t[1]]
  );
  if (!rows.length) return NextResponse.json({ error: `Sample must be ${t[0]} to ${b.action}` }, { status: 409 });
  return NextResponse.json({ sample: rows[0] });
}
