"use client";
import { useCallback, useEffect, useState } from "react";
import { fmt } from "@/lib/money";

export default function InvoiceDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [d, setD] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [discount, setDiscount] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/billing/${id}`);
    if (r.ok) { const j = await r.json(); setD(j); setDiscount(fmt(j.invoice.discount_cents)); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function send(url: string, method_: string, body: object, ok: string) {
    setMsg("");
    const r = await fetch(url, { method: method_, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return setMsg((await r.json().catch(() => ({}))).error || "Failed");
    setMsg(ok); setAmount(""); setNote(""); load();
  }

  if (!d) return <p>Loading…</p>;
  const inv = d.invoice;
  return (
    <div className="max-w-2xl space-y-4">
      <button className="btn" onClick={onBack}>← Back to invoices</button>
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold">{inv.invoice_no}</h1>
        <p className="text-sm text-slate-600">{inv.patient_name} ({inv.patient_code}) · {new Date(inv.created_at).toLocaleDateString()}</p>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {d.items.map((i: any) => <tr key={i.code}><td>{i.name}</td><td className="text-right">{fmt(i.price_cents)}</td></tr>)}
            <tr className="border-t"><td>Subtotal</td><td className="text-right">{fmt(inv.subtotal_cents)}</td></tr>
            <tr><td>Discount</td><td className="text-right">-{fmt(inv.discount_cents)}</td></tr>
            <tr className="font-medium"><td>Total</td><td className="text-right">{fmt(inv.total_cents)}</td></tr>
            <tr><td>Paid</td><td className="text-right">{fmt(inv.paid_cents)}</td></tr>
            <tr className="text-lg font-semibold"><td>Balance due</td><td className="text-right">{fmt(inv.balance_cents)}</td></tr>
          </tbody>
        </table>
      </div>
      {msg && <p role="status" className="text-sm text-blue-700">{msg}</p>}
      <form className="flex items-end gap-2 rounded border bg-white p-4" onSubmit={(e) => { e.preventDefault(); send(`/api/billing/${id}`, "PATCH", { discount }, "Discount updated"); }}>
        <label className="text-sm">Discount<input className="input w-32" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
        <button className="btn">Apply discount</button>
      </form>
      <form className="space-y-2 rounded border bg-white p-4" onSubmit={(e) => { e.preventDefault(); send(`/api/billing/${id}/payments`, "POST", { amount, method, note }, "Payment recorded"); }}>
        <h2 className="font-medium">Record payment</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Amount<input className="input w-32" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <label className="text-sm">Method
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {["cash", "card", "upi", "bank", "other"].map((m) => <option key={m}>{m}</option>)}
            </select></label>
          <label className="text-sm">Note<input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button className="btn">Record</button>
        </div>
      </form>
      <div className="rounded border bg-white p-4">
        <h2 className="font-medium">Payments</h2>
        <ul className="text-sm">
          {d.payments.map((p: any) => <li key={p.id}>{new Date(p.created_at).toLocaleString()} · {p.method} · {fmt(p.amount_cents)} {p.note}</li>)}
          {!d.payments.length && <li className="text-slate-500">No payments yet.</li>}
        </ul>
      </div>
    </div>
  );
}
