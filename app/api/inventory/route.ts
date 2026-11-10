import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { INV_COLS, parseItem } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await requirePerm("inventory");
  if ("error" in a) return a.error;
  const items = await query(`select ${INV_COLS} from inventory_items order by name`);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const a = await requirePerm("inventory");
  if ("error" in a) return a.error;
  const p = parseItem(await req.json().catch(() => ({})));
  if ("error" in p) return NextResponse.json({ error: p.error }, { status: 400 });
  const r = await query(
    `insert into inventory_items (name, category, unit, quantity, min_stock, expiry_date, lot_no, supplier)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning ${INV_COLS}`,
    p.v
  );
  return NextResponse.json({ item: r[0] }, { status: 201 });
}
