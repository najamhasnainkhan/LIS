import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { toCents } from "@/lib/money";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("catalog.write");
  if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const price = b.price === undefined ? null : toCents(b.price);
  if (b.price !== undefined && price === null)
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  const rows = await query(
    `update tests set
       price_cents = coalesce($2, price_cents),
       reference_range = case when $3::boolean then $4 else reference_range end,
       unit = case when $5::boolean then $6 else unit end,
       active = coalesce($7, active)
     where id = $1 returning id`,
    [
      Number(params.id), price,
      b.reference_range !== undefined, String(b.reference_range ?? "").trim() || null,
      b.unit !== undefined, String(b.unit ?? "").trim() || null,
      typeof b.active === "boolean" ? b.active : null,
    ]
  );
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
