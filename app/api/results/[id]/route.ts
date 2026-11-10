import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Technician enters (save) or submits a result for pathologist review.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("results.enter");
  if ("error" in a) return a.error;
  const id = Number(params.id);
  const b = await req.json().catch(() => ({}));
  const value = String(b.value ?? "").trim().slice(0, 500);
  const flag = ["", "normal", "low", "high", "critical"].includes(b.flag) ? b.flag : "";
  const submit = b.action === "submit";
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  if (submit && !value) return NextResponse.json({ error: "Enter a value before submitting" }, { status: 400 });
  const rows = await query(
    `update results r set value = $2, flag = $3, status = $4, entered_by = $5, updated_at = now(), review_note = null
     from samples s
     where r.id = $1 and s.id = r.sample_id and s.status in ('received','processing') and r.status in ('draft','rejected')
     returning r.id, r.status, r.sample_id`,
    [id, value, flag || null, submit ? "submitted" : "draft", a.user.id]
  );
  if (!rows.length) {
    return NextResponse.json({ error: "Sample must be received and the result not yet submitted" }, { status: 409 });
  }
  await query("update samples set status = 'processing' where id = $1 and status = 'received'", [rows[0].sample_id]);
  await audit(a.user, submit ? "submit" : "save", "result", id, `sample ${rows[0].sample_id}`);
  return NextResponse.json({ result: rows[0] });
}
