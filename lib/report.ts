import { query } from "./db";

export interface ReportLine {
  test: string; value: string; unit: string; range: string; flag: "normal" | "low" | "high" | "critical" | "";
}
export interface Report {
  sample_code: string; sample_type: string | null; collected_at: string | null; completed_at: string | null;
  patient: { name: string; code: string; dob: string | null; gender: string | null; phone: string | null };
  lines: ReportLine[]; pending: number; verifiers: string[]; generated_at: string;
}

// Compare a numeric value against a range like "4.0 - 11.0", "<5", ">=10", "up to 200".
export function flagFor(value: string, range: string | null, stored: string | null): ReportLine["flag"] {
  const keep = (["normal", "low", "high", "critical"].includes(stored ?? "") ? stored : "") as ReportLine["flag"];
  if (stored === "critical") return "critical";
  const v = parseFloat(value.replace(",", "."));
  if (!range || Number.isNaN(v)) return keep;
  const r = range.replace(/,/g, ".");
  let m = r.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/);
  if (m) { const lo = +m[1], hi = +m[2]; return v < lo ? "low" : v > hi ? "high" : "normal"; }
  m = r.match(/(?:<=?|up to|below)\s*(-?\d+(?:\.\d+)?)/i);
  if (m) return v > +m[1] ? "high" : "normal";
  m = r.match(/(?:>=?|above|over)\s*(-?\d+(?:\.\d+)?)/i);
  if (m) return v < +m[1] ? "low" : "normal";
  return keep;
}

export async function getReport(sampleId: number): Promise<Report | null> {
  const s = await query(
    `select s.sample_code, s.sample_type, s.collected_at, s.completed_at,
            p.name, p.patient_code, p.dob, p.gender, p.phone
     from samples s join orders o on o.id = s.order_id join patients p on p.id = o.patient_id where s.id = $1`,
    [sampleId]
  );
  if (!s.length) return null;
  const rs = await query(
    `select t.name as test, r.value, t.unit, t.reference_range, r.flag, r.status, u.name as verifier
     from results r join order_items oi on oi.id = r.order_item_id join tests t on t.id = oi.test_id
     left join users u on u.id = r.verified_by
     where r.sample_id = $1 order by r.id`,
    [sampleId]
  );
  const approved = rs.filter((r: any) => r.status === "approved");
  if (!approved.length) return null;
  const x: any = s[0];
  const iso = (d: any) => (d ? new Date(d).toISOString() : null);
  return {
    sample_code: x.sample_code, sample_type: x.sample_type, collected_at: iso(x.collected_at), completed_at: iso(x.completed_at),
    patient: {
      name: x.name, code: x.patient_code, gender: x.gender, phone: x.phone,
      dob: x.dob ? new Date(x.dob).toISOString().slice(0, 10) : null,
    },
    lines: approved.map((r: any) => ({
      test: r.test, value: r.value ?? "", unit: r.unit ?? "", range: r.reference_range ?? "",
      flag: flagFor(r.value ?? "", r.reference_range, r.flag),
    })),
    pending: rs.length - approved.length,
    verifiers: Array.from(new Set(approved.map((r: any) => r.verifier).filter(Boolean))) as string[],
    generated_at: new Date().toISOString(),
  };
}

export function ageOf(dob: string | null): string {
  if (!dob) return "—";
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return `${a} y`;
}
