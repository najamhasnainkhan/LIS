import type { PoolClient } from "pg";

// Create a sample (with a generated SMP-YYYY-000001 code) for an order and
// attach a draft result row to each ordered test that has none yet.
export async function createSample(c: PoolClient, orderId: number, type: string, userId: number) {
  const s = await c.query(
    `with n as (select nextval('samples_id_seq')::int as id)
     insert into samples (id, sample_code, order_id, sample_type, status, collected_at)
     select id, 'SMP-' || to_char(now(),'YYYY') || '-' || lpad(id::text, 6, '0'), $1, $2, 'collected', now() from n
     returning id, sample_code`,
    [orderId, type || "Blood"]
  );
  await c.query(
    `insert into results (order_item_id, sample_id, status, entered_by)
     select oi.id, $2, 'draft', null from order_items oi
     where oi.order_id = $1 and not exists (select 1 from results r where r.order_item_id = oi.id)`,
    [orderId, s.rows[0].id]
  );
  return s.rows[0] as { id: number; sample_code: string };
}
