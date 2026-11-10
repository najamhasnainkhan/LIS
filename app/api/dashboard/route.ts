import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await requirePerm("dashboard");
  if ("error" in a) return a.error;
  const [c] = await query(
    `select
      (select count(*) from patients)::int as patients,
      (select count(*) from results where status <> 'approved')::int as pending_tests,
      (select count(*) from samples where status = 'completed')::int as completed_reports,
      (select coalesce(sum(amount_cents),0) from payments where created_at::date = current_date)::int as revenue_today,
      (select count(*) from inventory_items where quantity <= min_stock
         or (expiry_date is not null and expiry_date <= current_date + 30))::int as inventory_alerts`
  );
  const revenue = await query(
    `select to_char(d, 'Mon DD') as day, coalesce(sum(p.amount_cents),0)::int as cents
     from generate_series(current_date - 13, current_date, '1 day') d
     left join payments p on p.created_at::date = d::date
     group by d order by d`
  );
  const workload = await query(
    `select status, count(*)::int as count from samples group by status order by status`
  );
  const registrations = await query(
    `select to_char(d, 'Mon DD') as day, count(p.id)::int as count
     from generate_series(current_date - 13, current_date, '1 day') d
     left join patients p on p.created_at::date = d::date
     group by d order by d`
  );
  return NextResponse.json({ counts: c, revenue, workload, registrations });
}
