import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { toCents } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("billing");
  if ("error" in a) return a.error;
  const id = Number(params.id);
  const inv = await query(
    `select i.id, i.invoice_no, i.subtotal_cents, i.discount_cents, i.total_cents, i.created_at,
            p.name as patient_name, p.patient_code, o.id as order_id
     from invoices i join orders o on o.id = i.order_id join patients p on p.id = o.patient_id
     where i.id = $1`, [id]);
  if (!inv.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await query(
    `select t.code, t.name, oi.price_cents from order_items oi join tests t on t.id = oi.test_id
     where oi.order_id = $1 order by t.name`, [inv[0].order_id]);
  const payments = await query(
    `select id, amount_cents, method, note, created_at from payments where invoice_id = $1 order by id`, [id]);
  const paid = payments.reduce((s: number, p: any) => s + p.amount_cents, 0);
  return NextResponse.json({
    invoice: { ...inv[0], paid_cents: paid, balance_cents: inv[0].total_cents - paid },
    items, payments,
  });
}

// Change the discount; total is recomputed and must not drop below what is already paid.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("billing");
  if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const d = toCents(b.discount);
  if (d === null) return NextResponse.json({ error: "Invalid discount" }, { status: 400 });
  const rows = await query(
    `update invoices i set discount_cents = $2, total_cents = subtotal_cents - $2
     where i.id = $1 and $2 <= subtotal_cents
       and subtotal_cents - $2 >= coalesce((select sum(amount_cents) from payments where invoice_id = i.id),0)
     returning id`, [Number(params.id), d]);
  if (!rows.length)
    return NextResponse.json({ error: "Discount is too large or below the amount already paid" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
