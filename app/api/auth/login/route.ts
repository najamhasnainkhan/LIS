import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { COOKIE, signSession, ensureBootstrapUsers, tooMany, clearAttempts } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    const key = `${email}|${req.headers.get("x-forwarded-for") || ""}`;
    if (tooMany(key)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

    await ensureBootstrapUsers();
    const rows = await query<any>("select * from users where email = $1 and active = true", [email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    clearAttempts(key);
    const token = signSession({ id: u.id, email: u.email, name: u.name, role: u.role });
    const res = NextResponse.json({ ok: true, role: u.role });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
      path: "/",
      maxAge: 8 * 3600,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
