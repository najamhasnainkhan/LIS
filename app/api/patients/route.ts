import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { parsePatient } from "@/lib/patient";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const a = await requirePerm("patients.read");
  if ("error" in a) return a.error;
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const like = `%${q}%`;
  const rows = await query(
    `select id, patient_code, name, dob, gender, phone, email, address, created_at
     from patients
     where $1 = '' or name ilike $2 or patient_code ilike $2 or phone ilike $2 or email ilike $2
     order by id desc limit 200`,
    [q, like]
  );
  return NextResponse.json({ patients: rows });
}

export async function POST(req: NextRequest) {
  const a = await requirePerm("patients.write");
  if ("error" in a) return a.error;
  const p = parsePatient(await req.json().catch(() => ({})));
  if ("error" in p) return NextResponse.json({ error: p.error }, { status: 400 });
  const d = p.data;
  const rows = await query(
    `insert into patients (patient_code, name, dob, gender, phone, email, address, created_by)
     values ('PAT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('patient_seq')::text, 6, '0'),
             $1,$2,$3,$4,$5,$6,$7)
     returning id, patient_code, name, dob, gender, phone, email, address, created_at`,
    [d.name, d.dob, d.gender, d.phone, d.email, d.address, a.user.id]
  );
  await audit(a.user, "create", "patient", rows[0].id, String(rows[0].patient_code));
  return NextResponse.json({ patient: rows[0] }, { status: 201 });
}
