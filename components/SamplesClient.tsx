"use client";
import { useCallback, useEffect, useState } from "react";
import { SampleLabel } from "./Barcode";
import ResultRow, { Res } from "./ResultRow";

type Sample = {
  id: number; sample_code: string; sample_type: string | null; status: string; collected_at: string | null;
  patient_name: string; patient_code: string; results: Res[];
};
type Unsampled = { id: number; patient_name: string; patient_code: string };
const STATUSES = ["collected", "received", "processing", "completed"];

export default function SamplesClient({ canEnter, canVerify }: { canEnter: boolean; canVerify: boolean }) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [unsampled, setUnsampled] = useState<Unsampled[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [label, setLabel] = useState<Sample | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/samples?q=${encodeURIComponent(q)}&status=${status}`);
    if (r.ok) { const d = await r.json(); setSamples(d.samples); setUnsampled(d.unsampled); }
  }, [q, status]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  async function call(url: string, method: string, body: object) {
    setMsg("");
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(d.error || "Failed");
    await load();
    return r.ok;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Samples &amp; processing</h1>
      {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
      {unsampled.length > 0 && (
        <div className="rounded border bg-amber-50 p-3 text-sm">
          <p className="font-medium">Orders without a sample</p>
          {unsampled.map((o) => (
            <div key={o.id} className="mt-1 flex items-center gap-2">
              <span>Order #{o.id} – {o.patient_name} ({o.patient_code})</span>
              <button className="btn" onClick={() => call("/api/samples", "POST", { order_id: o.id })}>Record collection</button>
            </div>
          ))}
        </div>
      )}
      {label && (
        <div className="rounded border bg-white p-3">
          <SampleLabel code={label.sample_code} patient={label.patient_name} patientCode={label.patient_code} type={label.sample_type} />
          <div className="mt-2 flex gap-2 no-print">
            <button className="btn" onClick={() => window.print()}>Print label</button>
            <button className="btn-secondary" onClick={() => setLabel(null)}>Close</button>
          </div>
        </div>
      )}
      <div className="no-print flex flex-wrap gap-3">
        <label className="text-sm">Search<input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sample ID, patient name or ID" /></label>
        <label className="text-sm">Status
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select></label>
      </div>
      <div className="no-print overflow-x-auto rounded border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50"><tr><th className="p-2">Sample</th><th>Patient</th><th>Status</th><th>Tests</th><th></th></tr></thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.id} className="border-t align-top">
                <td className="p-2 font-mono">{s.sample_code}</td>
                <td>{s.patient_name} ({s.patient_code})</td>
                <td><span className="rounded bg-slate-100 px-2 py-0.5">{s.status}</span></td>
                <td>{s.results.length}</td>
                <td className="space-x-2 p-2">
                  <button className="btn-secondary" onClick={() => setLabel(s)}>Label</button>
                  {s.results.some((r) => r.status === "approved") && (
                    <a className="btn-secondary inline-block" href={`/reports/${s.id}`}>Report</a>
                  )}
                  {s.status === "collected" && <button className="btn" onClick={() => call(`/api/samples/${s.id}`, "PATCH", { action: "receive" })}>Receive</button>}
                  {s.status === "received" && <button className="btn" onClick={() => call(`/api/samples/${s.id}`, "PATCH", { action: "process" })}>Start processing</button>}
                  <button className="btn-secondary" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                    {open === s.id ? "Hide results" : "Results"}</button>
                  {open === s.id && (
                    <div className="mt-2 space-y-2 rounded border p-2">
                      {s.results.map((r) => (
                        <ResultRow key={r.result_id} r={r} sampleStatus={s.status} canEnter={canEnter} canVerify={canVerify} call={call} />
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!samples.length && <tr><td colSpan={5} className="p-3 text-slate-500">No samples found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
