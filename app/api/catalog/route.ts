import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { toCents } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await requirePerm("catalog.read");
  if ("error" in a) return a.error;
  const categories = await query("select id, name from test_categories order by name");
  const tests = await query(
    `select t.id, t.code, t.name, t.category_id, c.name as category, t.price_cents, t.unit, t.reference_range, t.active
     from tests t left join test_categories c on c.id = t.category_id order by t.name`
  );
  const panels = await query(
    `select p.id, p.code, p.name, p.active,
       coalesce(array_agg(pt.test_id) filter (where pt.test_id is not null), '{}') as test_ids
     from panels p left join panel_tests pt on pt.panel_id = p.id group by p.id order by p.name`
  );
  return NextResponse.json({ categories, tests, panels });
}

const bad = (m: string) => NextResponse.json({ error: m }, { status: 400 });
const dup = (e: any) =>
  e?.code === "23505" ? bad("That code or name already exists") : null;

export async function POST(req: NextRequest) {
  const a = await requirePerm("catalog.write");
  if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const str = (v: unknown) => String(v ?? "").trim();
  try {
    if (b.kind === "category") {
      if (!str(b.name)) return bad("Name is required");
      const r = await query("insert into test_categories (name) values ($1) returning id, name", [str(b.name)]);
      return NextResponse.json({ category: r[0] }, { status: 201 });
    }
    if (b.kind === "test") {
      const price = toCents(b.price);
      if (!str(b.code) || !str(b.name)) return bad("Code and name are required");
      if (price === null) return bad("Price must be a number like 12.50");
      const cat = b.category_id ? Number(b.category_id) : null;
      const r = await query(
        `insert into tests (code, name, category_id, category, price_cents, unit, reference_range)
         values ($1,$2,$3,(select name from test_categories where id = $3),$4,$5,$6) returning id`,
        [str(b.code).toUpperCase(), str(b.name), cat, price, str(b.unit) || null, str(b.reference_range) || null]
      );
      return NextResponse.json({ test: r[0] }, { status: 201 });
    }
    if (b.kind === "panel") {
      const ids: number[] = Array.isArray(b.test_ids) ? b.test_ids.map(Number).filter(Number.isInteger) : [];
      if (!str(b.code) || !str(b.name)) return bad("Code and name are required");
      if (!ids.length) return bad("Pick at least one test for the profile");
      const c = await pool.connect();
      try {
        await c.query("begin");
        const p = await c.query("insert into panels (code, name) values ($1,$2) returning id", [str(b.code).toUpperCase(), str(b.name)]);
        await c.query(
          "insert into panel_tests (panel_id, test_id) select $1, unnest($2::int[]) on conflict do nothing",
          [p.rows[0].id, ids]
        );
        await c.query("commit");
        return NextResponse.json({ panel: p.rows[0] }, { status: 201 });
      } catch (e) {
        await c.query("rollback");
        throw e;
      } finally {
        c.release();
      }
    }
    return bad("Unknown kind");
  } catch (e: any) {
    return dup(e) ?? NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
