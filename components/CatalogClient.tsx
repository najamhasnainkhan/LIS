"use client";
import { useCallback, useEffect, useState } from "react";
import { fmt } from "@/lib/money";

type Cat = { id: number; name: string };
type Test = { id: number; code: string; name: string; category: string | null; price_cents: number; unit: string | null; reference_range: string | null; active: boolean };
type Panel = { id: number; code: string; name: string; test_ids: number[] };

async function post(body: object) {
  const r = await fetch("/api/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

export default function CatalogClient({ canWrite }: { canWrite: boolean }) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [catName, setCatName] = useState("");
  const [t, setT] = useState({ code: "", name: "", category_id: "", price: "", unit: "", reference_range: "" });
  const [p, setP] = useState({ code: "", name: "" });
  const [sel, setSel] = useState<number[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/catalog");
    if (!r.ok) return setMsg("Could not load catalog");
    const d = await r.json();
    setCats(d.categories); setTests(d.tests); setPanels(d.panels);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(body: object, done: () => void) {
    setMsg("");
    const r = await post(body);
    if (!r.ok) return setMsg(r.data.error || "Failed");
    done(); load();
  }

  async function edit(test: Test, field: "price" | "reference_range") {
    const cur = field === "price" ? fmt(test.price_cents) : test.reference_range ?? "";
    const next = (document.getElementById(`${field}-${test.id}`) as HTMLInputElement)?.value ?? cur;
    const r = await fetch(`/api/catalog/tests/${test.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: next }) });
    if (!r.ok) setMsg((await r.json()).error || "Failed");
    else { setMsg("Saved"); load(); }
  }

  const shown = tests.filter((x) => !q || `${x.name} ${x.code} ${x.category ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const nameOf = (id: number) => tests.find((x) => x.id === id)?.name ?? id;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Test catalog</h1>
      {msg && <p role="status" className="text-sm text-blue-700">{msg}</p>}

      {canWrite && (
        <div className="grid gap-6 md:grid-cols-2">
          <form className="space-y-2 rounded border bg-white p-4" onSubmit={(e) => { e.preventDefault(); submit({ kind: "category", name: catName }, () => setCatName("")); }}>
            <h2 className="font-medium">New category</h2>
            <label className="block text-sm">Name<input className="input" value={catName} onChange={(e) => setCatName(e.target.value)} /></label>
            <button className="btn">Add category</button>
          </form>
          <form className="space-y-2 rounded border bg-white p-4" onSubmit={(e) => { e.preventDefault(); submit({ kind: "test", ...t }, () => setT({ code: "", name: "", category_id: "", price: "", unit: "", reference_range: "" })); }}>
            <h2 className="font-medium">New test</h2>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">Code<input className="input" value={t.code} onChange={(e) => setT({ ...t, code: e.target.value })} /></label>
              <label className="text-sm">Name<input className="input" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></label>
              <label className="text-sm">Category
                <select className="input" value={t.category_id} onChange={(e) => setT({ ...t, category_id: e.target.value })}>
                  <option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></label>
              <label className="text-sm">Price<input className="input" inputMode="decimal" value={t.price} onChange={(e) => setT({ ...t, price: e.target.value })} /></label>
              <label className="text-sm">Unit<input className="input" value={t.unit} onChange={(e) => setT({ ...t, unit: e.target.value })} /></label>
              <label className="text-sm">Reference range<input className="input" value={t.reference_range} onChange={(e) => setT({ ...t, reference_range: e.target.value })} /></label>
            </div>
            <button className="btn">Add test</button>
          </form>
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">Tests</h2>
          <label className="text-sm">Search <input className="input inline-block w-56" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        </div>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="p-2">Code</th><th>Name</th><th>Category</th><th>Price</th><th>Unit</th><th>Reference range</th></tr></thead>
            <tbody>
              {shown.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="p-2">{x.code}</td><td>{x.name}</td><td>{x.category ?? "-"}</td>
                  <td>{canWrite ? (
                    <span className="flex gap-1"><input id={`price-${x.id}`} aria-label={`Price of ${x.name}`} className="input w-24" defaultValue={fmt(x.price_cents)} />
                      <button className="btn" onClick={() => edit(x, "price")}>Save</button></span>) : fmt(x.price_cents)}</td>
                  <td>{x.unit ?? "-"}</td>
                  <td>{canWrite ? (
                    <span className="flex gap-1"><input id={`reference_range-${x.id}`} aria-label={`Reference range of ${x.name}`} className="input w-40" defaultValue={x.reference_range ?? ""} />
                      <button className="btn" onClick={() => edit(x, "reference_range")}>Save</button></span>) : x.reference_range ?? "-"}</td>
                </tr>
              ))}
              {!shown.length && <tr><td className="p-3 text-slate-500" colSpan={6}>No tests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Profiles (panels)</h2>
        {canWrite && (
          <form className="space-y-2 rounded border bg-white p-4" onSubmit={(e) => { e.preventDefault(); submit({ kind: "panel", ...p, test_ids: sel }, () => { setP({ code: "", name: "" }); setSel([]); }); }}>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">Code<input className="input" value={p.code} onChange={(e) => setP({ ...p, code: e.target.value })} /></label>
              <label className="text-sm">Name<input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
            </div>
            <fieldset className="max-h-40 overflow-auto text-sm"><legend>Tests in this profile</legend>
              {tests.map((x) => (
                <label key={x.id} className="mr-4 inline-block"><input type="checkbox" checked={sel.includes(x.id)} onChange={(e) => setSel(e.target.checked ? [...sel, x.id] : sel.filter((i) => i !== x.id))} /> {x.name}</label>
              ))}
            </fieldset>
            <button className="btn">Add profile</button>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {panels.map((x) => <li key={x.id} className="rounded border bg-white p-2"><b>{x.code}</b> {x.name}: {x.test_ids.map(nameOf).join(", ")}</li>)}
          {!panels.length && <li className="text-slate-500">No profiles yet.</li>}
        </ul>
      </section>
    </div>
  );
}
