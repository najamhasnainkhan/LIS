"use client";
import { useCallback, useEffect, useState, FormEvent } from "react";

interface Patient {
  id: number; patient_code: string; name: string; dob: string | null;
  gender: string | null; phone: string | null; email: string | null; address: string | null;
}
const empty = { name: "", dob: "", gender: "", phone: "", email: "", address: "" };

export default function PatientsClient({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<Patient[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}`);
    if (res.ok) setRows((await res.json()).patients);
    else setErr("Could not load patients");
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function startEdit(p: Patient) {
    setEditId(p.id);
    setForm({
      name: p.name, dob: p.dob ? p.dob.slice(0, 10) : "", gender: p.gender ?? "",
      phone: p.phone ?? "", email: p.email ?? "", address: p.address ?? "",
    });
    setOpen(true); setMsg(""); setErr("");
  }
  function startNew() { setEditId(null); setForm(empty); setOpen(true); setMsg(""); setErr(""); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch(editId ? `/api/patients/${editId}` : "/api/patients", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error || "Save failed"); return; }
    setMsg(editId ? "Patient updated." : `Patient registered with ID ${data.patient.patient_code}.`);
    setOpen(false);
    load();
  }

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Patients</h1>
        {canWrite && <button className="btn" onClick={startNew}>Register patient</button>}
      </div>
      {msg && <p role="status" className="mb-3 rounded bg-green-100 p-2 text-sm text-green-800">{msg}</p>}
      {err && !open && <p role="alert" className="mb-3 text-sm text-red-600">{err}</p>}

      {open && (
        <form onSubmit={save} className="mb-6 grid gap-3 rounded-lg bg-white p-4 shadow sm:grid-cols-2">
          <h2 className="font-medium sm:col-span-2">{editId ? "Edit patient" : "Register patient"}</h2>
          <div><label htmlFor="name" className="text-sm">Full name</label>
            <input id="name" required className="input" value={form.name} onChange={set("name")} /></div>
          <div><label htmlFor="dob" className="text-sm">Date of birth</label>
            <input id="dob" type="date" className="input" value={form.dob} onChange={set("dob")} /></div>
          <div><label htmlFor="gender" className="text-sm">Gender</label>
            <select id="gender" className="input" value={form.gender} onChange={set("gender")}>
              <option value="">—</option><option value="male">Male</option>
              <option value="female">Female</option><option value="other">Other</option>
            </select></div>
          <div><label htmlFor="phone" className="text-sm">Phone</label>
            <input id="phone" className="input" value={form.phone} onChange={set("phone")} /></div>
          <div><label htmlFor="email" className="text-sm">Email</label>
            <input id="email" type="email" className="input" value={form.email} onChange={set("email")} /></div>
          <div><label htmlFor="address" className="text-sm">Address</label>
            <input id="address" className="input" value={form.address} onChange={set("address")} /></div>
          {err && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn">Save</button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      <label htmlFor="search" className="mb-1 block text-sm">Search patients</label>
      <input id="search" className="input mb-4 max-w-md" placeholder="Name, patient ID, phone or email"
        value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr><th className="p-2">Patient ID</th><th className="p-2">Name</th><th className="p-2">DOB</th>
              <th className="p-2">Gender</th><th className="p-2">Phone</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-mono">{p.patient_code}</td>
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.dob ? p.dob.slice(0, 10) : ""}</td>
                <td className="p-2 capitalize">{p.gender}</td>
                <td className="p-2">{p.phone}</td>
                <td className="p-2">{canWrite && (
                  <button className="text-teal-700 underline" onClick={() => startEdit(p)}
                    aria-label={`Edit ${p.name}`}>Edit</button>)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-slate-500">No patients found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
