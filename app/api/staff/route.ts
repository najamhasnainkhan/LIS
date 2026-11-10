import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await requirePerm("staff");
  if ("error" in a) return a.error;
  const staff = await query("select id, email, name, role, active, created_at from users order by id");
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const a = await requirePerm("staff");
  if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim().slice(0, 100);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 200);
  const role = String(b.role ?? "");
  const password = String(b.password ?? "");
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  if (!(role in ROLE_PERMISSIONS)) return NextResponse.json({ error: "Choose a role" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  const rows = await query(
    `insert into users (email, name, password_hash, role) values ($1,$2,$3,$4)
     on conflict (email) do nothing returning id, email, name, role, active, created_at`,
    [email, name, hash, role]
  );
  if (!rows[0]) return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
  await audit(a.user, "create", "staff", rows[0].id, `${email} as ${role}`);
  return NextResponse.json({ user: rows[0] }, { status: 201 });
}
