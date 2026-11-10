import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "./db";
import { can, Permission } from "./permissions";

export const COOKIE = "lims_session";

export interface SessionUser { id: number; email: string; name: string; role: string }

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set. Add it in Secrets.");
  return s;
}

export function signSession(u: SessionUser): string {
  return jwt.sign(u, secret(), { expiresIn: "8h" });
}

// Reads the signed cookie and re-checks the user in the database.
export async function getUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const p = jwt.verify(token, secret()) as SessionUser;
    const rows = await query<SessionUser>(
      "select id, email, name, role from users where id = $1 and active = true",
      [p.id]
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// For route handlers: returns the user or an error response.
export async function requirePerm(
  perm: Permission
): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (!can(user.role, perm)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

const BOOTSTRAP = [
  ["admin@lab.local", "Admin", "admin"],
  ["reception@lab.local", "Receptionist", "receptionist"],
  ["tech@lab.local", "Lab Technician", "technician"],
  ["pathologist@lab.local", "Pathologist", "pathologist"],
];

// On an empty database, create one starter account per role.
export async function ensureBootstrapUsers() {
  const [{ n }] = await query<{ n: string }>("select count(*) as n from users");
  if (Number(n) > 0) return;
  const hash = await bcrypt.hash(process.env.BOOTSTRAP_PASSWORD || "ChangeMe123!", 10);
  for (const [email, name, role] of BOOTSTRAP) {
    await query(
      "insert into users (email, name, password_hash, role) values ($1,$2,$3,$4) on conflict (email) do nothing",
      [email, name, hash, role]
    );
  }
}

const attempts = new Map<string, { n: number; t: number }>();
export function tooMany(key: string): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.t > 15 * 60_000) { attempts.set(key, { n: 1, t: now }); return false; }
  a.n++;
  return a.n > 8;
}
export function clearAttempts(key: string) { attempts.delete(key); }
