import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const a = await requirePerm("audit");
  if ("error" in a) return a.error;
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const entity = (sp.get("entity") || "").trim();
  const logs = await query(
    `select id, user_name, action, entity, entity_id, detail, created_at from audit_logs
     where ($1 = '' or entity = $1)
       and ($2 = '' or user_name ilike $3 or action ilike $3 or detail ilike $3 or entity_id ilike $3)
     order by id desc limit 300`,
    [entity, q, `%${q}%`]
  );
  return NextResponse.json({ logs });
}
