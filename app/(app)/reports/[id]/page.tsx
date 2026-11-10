import Link from "next/link";
import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getReport, ageOf } from "@/lib/report";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-GB") : "—");
const cls: Record<string, string> = { low: "text-blue-700 font-bold", high: "text-red-700 font-bold", critical: "text-red-700 font-bold underline" };

export default async function ReportPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user || !can(user.role, "reports")) return <p className="text-red-600">No access.</p>;
  const id = Number(params.id);
  const r = Number.isInteger(id) ? await getReport(id) : null;
  if (!r) return <p>No approved results for this sample. <Link className="underline" href="/reports">Back</Link></p>;
  return (
    <div className="space-y-3">
      <div className="no-print flex gap-2">
        <Link className="btn-secondary" href="/reports">Back</Link>
        <PrintButton />
        <a className="btn" href={`/api/reports/${id}/pdf`}>Download PDF</a>
      </div>
      <article className="print-area mx-auto w-full max-w-3xl rounded border bg-white p-6 text-sm">
        <header className="mb-4 flex justify-between border-b-2 border-teal-700 pb-3">
          <div><h1 className="text-xl font-bold text-teal-800">Pathology Laboratory</h1><p>Laboratory Report</p></div>
          <p className="font-mono">{r.sample_code}</p>
        </header>
        <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1">
          <div><dt className="inline font-semibold">Patient: </dt><dd className="inline">{r.patient.name}</dd></div>
          <div><dt className="inline font-semibold">Sample ID: </dt><dd className="inline">{r.sample_code}</dd></div>
          <div><dt className="inline font-semibold">Patient ID: </dt><dd className="inline">{r.patient.code}</dd></div>
          <div><dt className="inline font-semibold">Specimen: </dt><dd className="inline">{r.sample_type ?? "—"}</dd></div>
          <div><dt className="inline font-semibold">Age / Sex: </dt><dd className="inline">{ageOf(r.patient.dob)} / {r.patient.gender ?? "—"}</dd></div>
          <div><dt className="inline font-semibold">Collected: </dt><dd className="inline">{fmt(r.collected_at)}</dd></div>
          <div><dt className="inline font-semibold">Phone: </dt><dd className="inline">{r.patient.phone ?? "—"}</dd></div>
          <div><dt className="inline font-semibold">Reported: </dt><dd className="inline">{fmt(r.completed_at ?? r.generated_at)}</dd></div>
        </dl>
        <table className="w-full text-left">
          <thead className="bg-slate-100"><tr><th className="p-2">Test</th><th>Result</th><th>Unit</th><th>Reference range</th><th>Flag</th></tr></thead>
          <tbody>
            {r.lines.map((l, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{l.test}</td>
                <td className={cls[l.flag] ?? ""}>{l.value}</td>
                <td>{l.unit}</td><td>{l.range}</td>
                <td className={cls[l.flag] ?? ""}>{l.flag === "low" ? "LOW" : l.flag === "high" ? "HIGH" : l.flag === "critical" ? "CRITICAL" : l.flag === "normal" ? "Normal" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.pending > 0 && <p className="mt-2 text-xs">Note: {r.pending} test(s) are not yet approved and are not shown.</p>}
        <p className="mt-6 font-semibold">Approved by: {r.verifiers.join(", ") || "—"}</p>
        <p className="mt-4 text-xs text-slate-500">Generated {fmt(r.generated_at)}. Valid only for the sample identified above.</p>
      </article>
    </div>
  );
}
