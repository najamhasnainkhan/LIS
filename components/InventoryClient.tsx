"use client";
import { useEffect, useMemo, useState } from "react";

interface Item {
  id: number; name: string; category: string; unit: string; quantity: number;
  min_stock: number; expiry_date: string | null; lot_no: string | null; supplier: string | null;
}
const blank = { name: "", category: "reagent", unit: "pcs", quantity: "0", min_stock: "0", expiry_date: "", lot_no: "", supplier: "" };

function alerts(i: Item): string[] {
  const out: string[] = [];
  if (i.quantity <= i.min_stock) out.push(i.quantity === 0 ? "Out of stock" : "Low stock");
  if (i.expiry_date) {
    const days = Math.floor((new Date(i.expiry_date + "T00:00:00").getTime() - Date.now()) / 86400000) + 1;
    if (days < 0) out.push("Expired");
    else if (days <= 30) out.push(`Expires in ${days}d`);
  }
  return out;
}

export default function InventoryClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<any>(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const [err, setErr] = useState("");

  const load = () => fetch("/api/inventory").then(async (r) => r.ok && setItems((await r.json()).items));
  useEffect(() => { load(); }, []);

  const shown = useMemo(
    () => items.filter((i) => (i.name + i.category + (i.lot_no ?? "")).toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch(editId ? `/api/inventory/${editId}` : "/api/inventory", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!r.ok) return setErr((await r.json()).error || "Could not save");
    setForm(blank); setEditId(null); load();
  }
  function edit(i: Item) {
    setEditId(i.id);
    setForm({ ...i, quantity: String(i.quantity), min_stock: String(i.min_stock), expiry_date: i.expiry_date ?? "", lot_no: i.lot_no ?? "", supplier: i.supplier ?? "" });
  }
  async function remove(i: Item) {
    if (!window.confirm(`Delete ${i.name}?`)) return;
    await fetch(`/api/inventory/${i.id}`, { method: "DELETE" });
    load();
  }

  const field = (label: string, k: string, type = "text") => (
    <label className="block text-sm">{label}
      <input className="input mt-1" type={type} value={form[k]} onChange={set(k)} min={type === "number" ? 0 : undefined} step="any" />
    </label>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <form onSubmit={save} className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-4">
        {field("Name", "name")}
        <label className="block text-sm">Category
          <select className="input mt-1" value={form.category} onChange={set("category")}>
            <option value="reagent">Reagent</option>
            <option value="chemical">Chemical</option>
            <option value="consumable">Consumable</option>
          </select>
        </label>
        {field("Quantity", "quantity", "number")}
        {field("Unit", "unit")}
        {field("Minimum stock", "min_stock", "number")}
        {field("Expiry date", "expiry_date", "date")}
        {field("Lot no.", "lot_no")}
        {field("Supplier", "supplier")}
        <div className="flex items-end gap-2 sm:col-span-4">
          <button className="btn" type="submit">{editId ? "Update item" : "Add item"}</button>
          {editId && <button type="button" className="btn-secondary" onClick={() => { setEditId(null); setForm(blank); }}>Cancel</button>}
          {err && <span className="text-sm text-red-600" role="alert">{err}</span>}
        </div>
      </form>

      <div>
        <label className="block text-sm">Search
          <input className="input mt-1 max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, category or lot" />
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr><th className="p-2">Item</th><th className="p-2">Category</th><th className="p-2">Stock</th><th className="p-2">Min</th><th className="p-2">Expiry</th><th className="p-2">Lot</th><th className="p-2">Alerts</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {shown.map((i) => {
              const a = alerts(i);
              return (
                <tr key={i.id} className={`border-t ${a.length ? "bg-red-50" : ""}`}>
                  <td className="p-2 font-medium">{i.name}</td>
                  <td className="p-2 capitalize">{i.category}</td>
                  <td className="p-2">{i.quantity} {i.unit}</td>
                  <td className="p-2">{i.min_stock}</td>
                  <td className="p-2">{i.expiry_date ?? "—"}</td>
                  <td className="p-2">{i.lot_no ?? "—"}</td>
                  <td className="p-2">
                    {a.length ? a.map((t) => <span key={t} className="mr-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{t}</span>) : <span className="text-xs text-green-700">OK</span>}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <button className="mr-2 text-teal-700 underline" onClick={() => edit(i)} aria-label={`Edit ${i.name}`}>Edit</button>
                    <button className="text-red-700 underline" onClick={() => remove(i)} aria-label={`Delete ${i.name}`}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {!shown.length && <tr><td className="p-4 text-slate-500" colSpan={8}>No items.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
