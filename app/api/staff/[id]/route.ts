import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Change role, active flag or reset password.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("staff");
  if ("error" in a) return a.error;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const notes: string[] = [];
  if (id === a.user.id && ((b.role && b.role !== a.user.role) || b.active === false))
    return NextResponse.json({ error: "You cannot change your own role or deactivate yourself" }, { status: 400 });
  if (b.role !== undefined) {
    if (!(b.role in ROLE_PERMISSIONS)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    await query("update users set role = $2 where id = $1", [id, b.role]);
    notes.push(`role=${b.role}`);
  }
  if (typeof b.active === "boolean") {
    await query("update users set active = $2 where id = $1", [id, b.active]);
    notes.push(`active=${b.active}`);
  }
  if (b.password !== undefined) {
    if (String(b.password).length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    await query("update users set password_hash = $2 where id = $1", [id, await bcrypt.hash(String(b.password), 10)]);
    notes.push("password reset");
  }
  if (!notes.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const rows = await query("select id, email, name, role, active, created_at from users where id = $1", [id]);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await audit(a.user, "update", "staff", id, notes.join(", "));
  return NextResponse.json({ user: rows[0] });
}
