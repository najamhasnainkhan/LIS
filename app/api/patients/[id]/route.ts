import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { parsePatient } from "@/lib/patient";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = "id, patient_code, name, dob, gender, phone, email, address, created_at";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("patients.read");
  if ("error" in a) return a.error;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await query(`select ${COLS} from patients where id = $1`, [id]);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await audit(a.user, "view", "patient", id, String(rows[0].patient_code));
  return NextResponse.json({ patient: rows[0] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("patients.write");
  if ("error" in a) return a.error;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const p = parsePatient(await req.json().catch(() => ({})));
  if ("error" in p) return NextResponse.json({ error: p.error }, { status: 400 });
  const d = p.data;
  const rows = await query(
    `update patients set name=$1, dob=$2, gender=$3, phone=$4, email=$5, address=$6, updated_at=now()
     where id=$7 returning ${COLS}`,
    [d.name, d.dob, d.gender, d.phone, d.email, d.address, id]
  );
  if (rows[0]) await audit(a.user, "update", "patient", id, String(rows[0].patient_code));
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ patient: rows[0] });
}
