import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { toCents } from "@/lib/money";
import { createSample } from "@/lib/samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const a = await requirePerm("billing");
  if ("error" in a) return a.error;
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const rows = await query(
    `select i.id, i.invoice_no, i.total_cents, i.discount_cents, i.created_at,
            p.name as patient_name, p.patient_code,
            coalesce((select sum(amount_cents) from payments where invoice_id = i.id),0)::int as paid_cents
     from invoices i join orders o on o.id = i.order_id join patients p on p.id = o.patient_id
     where $1 = '' or p.name ilike $2 or p.patient_code ilike $2 or i.invoice_no ilike $2
     order by i.id desc limit 200`,
    [q, `%${q}%`]
  );
  return NextResponse.json({ invoices: rows });
}

// Create an order (tests and/or panels) for a patient plus its invoice.
export async function POST(req: NextRequest) {
  const a = await requirePerm("billing");
  if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const err = (m: string) => NextResponse.json({ error: m }, { status: 400 });
  const patientId = Number(b.patient_id);
  const testIds: number[] = Array.isArray(b.test_ids) ? b.test_ids.map(Number).filter(Number.isInteger) : [];
  const panelIds: number[] = Array.isArray(b.panel_ids) ? b.panel_ids.map(Number).filter(Number.isInteger) : [];
  const discount = b.discount === undefined || b.discount === "" ? 0 : toCents(b.discount);
  if (!Number.isInteger(patientId)) return err("Choose a patient");
  if (discount === null) return err("Discount must be a number like 5.00");
  if (!testIds.length && !panelIds.length) return err("Choose at least one test or profile");

  const c = await pool.connect();
  try {
    await c.query("begin");
    const pt = await c.query("select 1 from patients where id = $1", [patientId]);
    if (!pt.rowCount) { await c.query("rollback"); return err("Patient not found"); }
    const t = await c.query(
      `select id, price_cents from tests where active and id in (
         select unnest($1::int[]) union
         select test_id from panel_tests where panel_id = any($2::int[]))`,
      [testIds, panelIds]
    );
    if (!t.rowCount) { await c.query("rollback"); return err("No active tests selected"); }
    const subtotal = t.rows.reduce((s: number, r: any) => s + r.price_cents, 0);
    if (discount > subtotal) { await c.query("rollback"); return err("Discount cannot exceed the subtotal"); }
    const o = await c.query(
      "insert into orders (patient_id, total_cents, created_by) values ($1,$2,$3) returning id",
      [patientId, subtotal - discount, a.user.id]
    );
    await c.query(
      "insert into order_items (order_id, test_id, price_cents) select $1, id, price_cents from tests where id = any($2::int[])",
      [o.rows[0].id, t.rows.map((r: any) => r.id)]
    );
    const inv = await c.query(
      `insert into invoices (invoice_no, order_id, subtotal_cents, discount_cents, total_cents, created_by)
       values ('INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 6, '0'), $1,$2,$3,$4,$5)
       returning id, invoice_no`,
      [o.rows[0].id, subtotal, discount, subtotal - discount, a.user.id]
    );
    const sample = await createSample(c, o.rows[0].id, "Blood", a.user.id);
    await c.query("commit");
    return NextResponse.json({ invoice: inv.rows[0], sample }, { status: 201 });
  } catch {
    await c.query("rollback").catch(() => {});
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
  } finally {
    c.release();
  }
}
