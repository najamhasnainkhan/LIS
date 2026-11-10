import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { toCents } from "@/lib/money";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const METHODS = ["cash", "card", "upi", "bank", "other"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("billing");
  if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const amt = toCents(b.amount);
  const method = METHODS.includes(b.method) ? b.method : "cash";
  if (!amt || amt <= 0) return NextResponse.json({ error: "Enter an amount greater than 0" }, { status: 400 });
  const c = await pool.connect();
  try {
    await c.query("begin");
    const inv = await c.query("select total_cents from invoices where id = $1 for update", [Number(params.id)]);
    if (!inv.rowCount) { await c.query("rollback"); return NextResponse.json({ error: "Not found" }, { status: 404 }); }
    const paid = await c.query("select coalesce(sum(amount_cents),0)::int as s from payments where invoice_id = $1", [Number(params.id)]);
    const balance = inv.rows[0].total_cents - paid.rows[0].s;
    if (amt > balance) {
      await c.query("rollback");
      return NextResponse.json({ error: "Payment exceeds the outstanding balance" }, { status: 400 });
    }
    await c.query(
      "insert into payments (invoice_id, amount_cents, method, note, created_by) values ($1,$2,$3,$4,$5)",
      [Number(params.id), amt, method, String(b.note ?? "").trim() || null, a.user.id]
    );
    await c.query("commit");
    await audit(a.user, "payment", "invoice", params.id, `${method} ${amt} cents`);
    return NextResponse.json({ ok: true, balance_cents: balance - amt }, { status: 201 });
  } catch {
    await c.query("rollback").catch(() => {});
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  } finally {
    c.release();
  }
}
