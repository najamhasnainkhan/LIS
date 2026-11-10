import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pathologist approves or rejects a submitted result.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("results.verify");
  if ("error" in a) return a.error;
  const id = Number(params.id);
  const b = await req.json().catch(() => ({}));
  const approve = b.action === "approve";
  if (!Number.isInteger(id) || (!approve && b.action !== "reject"))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const note = String(b.note ?? "").trim().slice(0, 500);
  if (!approve && !note) return NextResponse.json({ error: "Add a note explaining the rejection" }, { status: 400 });
  const rows = await query(
    `update results set status = $2, verified_by = $3, review_note = $4, updated_at = now()
     where id = $1 and status = 'submitted' returning id, sample_id`,
    [id, approve ? "approved" : "rejected", a.user.id, approve ? null : note]
  );
  if (!rows.length) return NextResponse.json({ error: "Result is not waiting for review" }, { status: 409 });
  await audit(a.user, approve ? "approve" : "reject", "result", id, `sample ${rows[0].sample_id}`);
  const sid = rows[0].sample_id;
  let completed = false;
  if (approve && sid) {
    const done = await query(
      `update samples set status = 'completed', completed_at = now()
       where id = $1 and status <> 'completed'
         and not exists (select 1 from results where sample_id = $1 and status <> 'approved') returning order_id`,
      [sid]
    );
    if (done.length) {
      completed = true;
      await query(
        `update orders set status = 'completed' where id = $1
         and not exists (select 1 from results r join order_items oi on oi.id = r.order_item_id
                         where oi.order_id = $1 and r.status <> 'approved')`,
        [done[0].order_id]
      );
    }
  }
  return NextResponse.json({ ok: true, sample_completed: completed });
}
