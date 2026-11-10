import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { INV_COLS, parseItem } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("inventory");
  if ("error" in a) return a.error;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const p = parseItem(await req.json().catch(() => ({})));
  if ("error" in p) return NextResponse.json({ error: p.error }, { status: 400 });
  const r = await query(
    `update inventory_items set name=$2, category=$3, unit=$4, quantity=$5, min_stock=$6,
       expiry_date=$7, lot_no=$8, supplier=$9, updated_at=now() where id=$1 returning ${INV_COLS}`,
    [id, ...p.v]
  );
  if (!r[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: r[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("inventory");
  if ("error" in a) return a.error;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  await query("delete from inventory_items where id=$1", [id]);
  return NextResponse.json({ ok: true });
}
