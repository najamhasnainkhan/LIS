import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { createSample } from "@/lib/samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const a = await requirePerm("samples");
  if ("error" in a) return a.error;
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const status = (req.nextUrl.searchParams.get("status") || "").trim();
  const samples = await query(
    `select s.id, s.sample_code, s.sample_type, s.status, s.collected_at, s.received_at, s.completed_at, s.order_id,
            p.name as patient_name, p.patient_code,
            coalesce((select json_agg(json_build_object(
               'result_id', r.id, 'test_name', t.name, 'unit', t.unit, 'reference_range', t.reference_range,
               'value', r.value, 'flag', r.flag, 'status', r.status, 'review_note', r.review_note) order by r.id)
              from results r join order_items oi on oi.id = r.order_item_id join tests t on t.id = oi.test_id
              where r.sample_id = s.id), '[]'::json) as results
     from samples s join orders o on o.id = s.order_id join patients p on p.id = o.patient_id
     where ($1 = '' or p.name ilike $2 or p.patient_code ilike $2 or s.sample_code ilike $2)
       and ($3 = '' or s.status = $3)
     order by s.id desc limit 200`,
    [q, `%${q}%`, status]
  );
  const unsampled = await query(
    `select o.id, o.created_at, p.name as patient_name, p.patient_code
     from orders o join patients p on p.id = o.patient_id
     where not exists (select 1 from samples s where s.order_id = o.id) order by o.id desc limit 50`
  );
  return NextResponse.json({ samples, unsampled });
}

// Record collection of a new sample for an order that has none.
export async function POST(req: NextRequest) {
  const a = await requirePerm("samples");
  if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const orderId = Number(b.order_id);
  if (!Number.isInteger(orderId)) return NextResponse.json({ error: "Choose an order" }, { status: 400 });
  const c = await pool.connect();
  try {
    await c.query("begin");
    const o = await c.query("select 1 from orders where id = $1", [orderId]);
    if (!o.rowCount) { await c.query("rollback"); return NextResponse.json({ error: "Order not found" }, { status: 404 }); }
    const s = await createSample(c, orderId, String(b.sample_type || "Blood").slice(0, 40), a.user.id);
    await c.query("commit");
    return NextResponse.json({ sample: s }, { status: 201 });
  } catch {
    await c.query("rollback").catch(() => {});
    return NextResponse.json({ error: "Could not create sample" }, { status: 500 });
  } finally {
    c.release();
  }
}
