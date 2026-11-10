"use client";
import { useCallback, useEffect, useState } from "react";
import { fmt } from "@/lib/money";
import InvoiceDetail from "./InvoiceDetail";

type Inv = { id: number; invoice_no: string; total_cents: number; paid_cents: number; patient_name: string; patient_code: string; created_at: string };

export default function BillingClient() {
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");
  const [patients, setPatients] = useState<{ id: number; name: string; patient_code: string }[]>([]);
  const [tests, setTests] = useState<{ id: number; name: string; price_cents: number; active: boolean }[]>([]);
  const [panels, setPanels] = useState<{ id: number; name: string }[]>([]);
  const [patientId, setPatientId] = useState("");
  const [pq, setPq] = useState("");
  const [selT, setSelT] = useState<number[]>([]);
  const [selP, setSelP] = useState<number[]>([]);
  const [discount, setDiscount] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/billing?q=${encodeURIComponent(q)}`);
    if (r.ok) setInvoices((await r.json()).invoices);
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  async function startCreate() {
    setCreating(true);
    const c = await fetch("/api/catalog");
    if (c.ok) { const d = await c.json(); setTests(d.tests.filter((x: any) => x.active)); setPanels(d.panels); }
  }
  useEffect(() => {
    if (!creating) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/patients?q=${encodeURIComponent(pq)}`);
      if (r.ok) setPatients((await r.json()).patients.slice(0, 50));
    }, 200);
    return () => clearTimeout(t);
  }, [pq, creating]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const r = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId, test_ids: selT, panel_ids: selP, discount }) });
    const d = await r.json();
    if (!r.ok) return setMsg(d.error || "Failed");
    setCreating(false); setSelT([]); setSelP([]); setDiscount(""); setPatientId("");
    await load(); setOpen(d.invoice.id);
  }

  const toggle = (arr: number[], set: (v: number[]) => void, id: number, on: boolean) =>
    set(on ? [...arr, id] : arr.filter((i) => i !== id));

  if (open) return <InvoiceDetail id={open} onBack={() => { setOpen(null); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Billing</h1>
        {!creating && <button className="btn" onClick={startCreate}>New order</button>}
      </div>
      {creating && (
        <form onSubmit={create} className="space-y-3 rounded border bg-white p-4">
          <h2 className="font-medium">New order and invoice</h2>
          {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
          <label className="block text-sm">Find patient<input className="input" value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Name, ID or phone" /></label>
          <label className="block text-sm">Patient
            <select className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Select…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.patient_code})</option>)}
            </select></label>
          <fieldset className="text-sm"><legend className="font-medium">Profiles</legend>
            {panels.map((p) => <label key={p.id} className="mr-4 inline-block"><input type="checkbox" checked={selP.includes(p.id)} onChange={(e) => toggle(selP, setSelP, p.id, e.target.checked)} /> {p.name}</label>)}
            {!panels.length && <span className="text-slate-500">None defined</span>}
          </fieldset>
          <fieldset className="max-h-48 overflow-auto text-sm"><legend className="font-medium">Tests</legend>
            {tests.map((t) => <label key={t.id} className="mr-4 inline-block"><input type="checkbox" checked={selT.includes(t.id)} onChange={(e) => toggle(selT, setSelT, t.id, e.target.checked)} /> {t.name} ({fmt(t.price_cents)})</label>)}
          </fieldset>
          <label className="block w-40 text-sm">Discount<input className="input" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" /></label>
          <div className="flex gap-2"><button className="btn">Create invoice</button>
            <button type="button" className="btn" onClick={() => setCreating(false)}>Cancel</button></div>
        </form>
      )}
      <label className="block text-sm">Search invoices<input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice no, patient name or ID" /></label>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50"><tr><th className="p-2">Invoice</th><th>Patient</th><th>Total</th><th>Paid</th><th>Balance</th><th></th></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-2">{i.invoice_no}</td><td>{i.patient_name} ({i.patient_code})</td>
                <td>{fmt(i.total_cents)}</td><td>{fmt(i.paid_cents)}</td>
                <td className={i.total_cents - i.paid_cents > 0 ? "font-medium text-red-600" : "text-green-700"}>{fmt(i.total_cents - i.paid_cents)}</td>
                <td><button className="btn" onClick={() => setOpen(i.id)}>Open</button></td>
              </tr>
            ))}
            {!invoices.length && <tr><td colSpan={6} className="p-3 text-slate-500">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
