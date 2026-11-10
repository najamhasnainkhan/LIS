import Link from "next/link";
import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getUser();
  if (!user || !can(user.role, "reports")) return <p className="text-red-600">No access.</p>;
  const q = (searchParams.q || "").trim();
  const rows = await query(
    `select s.id, s.sample_code, s.status, s.completed_at, p.name, p.patient_code,
            count(*) filter (where r.status = 'approved') as approved, count(r.id) as total
     from samples s join orders o on o.id = s.order_id join patients p on p.id = o.patient_id
     join results r on r.sample_id = s.id
     where ($1 = '' or p.name ilike $2 or p.patient_code ilike $2 or s.sample_code ilike $2)
     group by s.id, p.name, p.patient_code
     having count(*) filter (where r.status = 'approved') > 0
     order by s.id desc limit 200`,
    [q, `%${q}%`]
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Lab reports</h1>
      <form className="flex items-end gap-2">
        <label className="text-sm">Search
          <input name="q" defaultValue={q} className="input" placeholder="Sample ID, patient name or ID" /></label>
        <button className="btn">Search</button>
      </form>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50"><tr><th className="p-2">Sample</th><th>Patient</th><th>Approved</th><th>Completed</th><th></th></tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono">{r.sample_code}</td>
                <td>{r.name} ({r.patient_code})</td>
                <td>{r.approved}/{r.total}</td>
                <td>{r.completed_at ? new Date(r.completed_at).toLocaleDateString("en-GB") : "In progress"}</td>
                <td className="space-x-2 p-2">
                  <Link className="btn-secondary" href={`/reports/${r.id}`}>View / print</Link>
                  <a className="btn" href={`/api/reports/${r.id}/pdf`}>Download PDF</a>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-3 text-slate-500">No approved results yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
