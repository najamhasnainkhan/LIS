"use client";
import { useEffect, useState } from "react";

interface Staff { id: number; email: string; name: string; role: string; active: boolean }
const ROLES = ["admin", "receptionist", "technician", "pathologist"];
const blank = { name: "", email: "", role: "technician", password: "" };

export default function StaffClient({ meId }: { meId: number }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/staff").then(async (r) => r.ok && setStaff((await r.json()).staff));
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    const r = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    if (!r.ok) return setErr(j.error || "Failed");
    setForm(blank); setMsg(`Created ${j.user.email}`); load();
  }

  async function patch(id: number, body: object, okMsg: string) {
    setErr(""); setMsg("");
    const r = await fetch(`/api/staff/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return setErr(j.error || "Failed");
    setMsg(okMsg); load();
  }

  async function reset(id: number) {
    const pw = (document.getElementById(`pw-${id}`) as HTMLInputElement).value;
    await patch(id, { password: pw }, "Password reset");
    (document.getElementById(`pw-${id}`) as HTMLInputElement).value = "";
  }

  const f = (k: keyof typeof blank) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Staff</h1>
      <form onSubmit={create} className="mt-4 grid gap-3 rounded border bg-white p-4 sm:grid-cols-5 sm:items-end">
        <div><label htmlFor="sn" className="block text-sm">Name</label><input id="sn" className="input" value={form.name} onChange={f("name")} required /></div>
        <div><label htmlFor="se" className="block text-sm">Email</label><input id="se" type="email" className="input" value={form.email} onChange={f("email")} required /></div>
        <div><label htmlFor="sr" className="block text-sm">Role</label>
          <select id="sr" className="input" value={form.role} onChange={f("role")}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
        <div><label htmlFor="sp" className="block text-sm">Initial password</label><input id="sp" type="password" minLength={8} className="input" value={form.password} onChange={f("password")} required /></div>
        <button className="btn">Add staff</button>
      </form>
      {err && <p className="mt-2 text-red-600" role="alert">{err}</p>}
      {msg && <p className="mt-2 text-green-700" role="status">{msg}</p>}
      <div className="mt-4 overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left"><tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Status</th><th className="p-2">Reset password</th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.email}</td>
                <td className="p-2">
                  <select aria-label={`Role for ${s.name}`} className="input" value={s.role} disabled={s.id === meId}
                    onChange={(e) => patch(s.id, { role: e.target.value }, "Role updated")}>
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <button className="btn" disabled={s.id === meId} aria-pressed={s.active}
                    onClick={() => patch(s.id, { active: !s.active }, s.active ? "Deactivated" : "Activated")}>
                    {s.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-2 flex gap-2">
                  <input id={`pw-${s.id}`} type="password" aria-label={`New password for ${s.name}`} className="input" minLength={8} />
                  <button className="btn" onClick={() => reset(s.id)}>Set</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
