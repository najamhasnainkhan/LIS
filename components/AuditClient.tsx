"use client";
import { useEffect, useState } from "react";

interface Log { id: number; user_name: string; action: string; entity: string; entity_id: string | null; detail: string | null; created_at: string }

export default function AuditClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fetch(`/api/audit-logs?q=${encodeURIComponent(q)}&entity=${entity}`);
      if (r.ok) { setLogs((await r.json()).logs); setErr(""); } else setErr("Could not load logs");
    }, 250);
    return () => clearTimeout(t);
  }, [q, entity]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit Logs</h1>
      <div className="mt-4 flex flex-wrap gap-3">
        <div>
          <label htmlFor="aq" className="block text-sm">Search</label>
          <input id="aq" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="User, action, detail" />
        </div>
        <div>
          <label htmlFor="ae" className="block text-sm">Record type</label>
          <select id="ae" className="input" value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="">All</option>
            <option value="patient">Patient</option>
            <option value="result">Result</option>
            <option value="invoice">Payment</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      </div>
      {err && <p className="mt-2 text-red-600">{err}</p>}
      <div className="mt-4 overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left"><tr>
            <th className="p-2">Time</th><th className="p-2">User</th><th className="p-2">Action</th>
            <th className="p-2">Record</th><th className="p-2">Detail</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-2">{l.user_name}</td>
                <td className="p-2">{l.action}</td>
                <td className="p-2">{l.entity}{l.entity_id ? ` #${l.entity_id}` : ""}</td>
                <td className="p-2">{l.detail}</td>
              </tr>
            ))}
            {!logs.length && <tr><td className="p-3 text-slate-500" colSpan={5}>No entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
