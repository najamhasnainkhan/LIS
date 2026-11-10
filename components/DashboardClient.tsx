"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Data {
  counts: { patients: number; pending_tests: number; completed_reports: number; revenue_today: number; inventory_alerts: number };
  revenue: { day: string; cents: number }[];
  workload: { status: string; count: number }[];
  registrations: { day: string; count: number }[];
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-medium">{title}</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </section>
  );
}

export default function DashboardClient() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => (r.ok ? setD(await r.json()) : setErr((await r.json()).error || "Failed to load")))
      .catch(() => setErr("Failed to load"));
  }, []);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!d) return <p className="text-slate-500">Loading…</p>;
  const c = d.counts;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card label="Total patients" value={c.patients} />
        <Card label="Pending tests" value={c.pending_tests} />
        <Card label="Completed reports" value={c.completed_reports} />
        <Card label="Revenue today" value={(c.revenue_today / 100).toFixed(2)} />
        <Card label="Inventory alerts" value={c.inventory_alerts} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Chart title="Daily revenue (last 14 days)">
          <BarChart data={d.revenue.map((r) => ({ day: r.day, revenue: r.cents / 100 }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#0d9488" />
          </BarChart>
        </Chart>
        <Chart title="Lab workload (samples by status)">
          <BarChart data={d.workload}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" />
          </BarChart>
        </Chart>
        <Chart title="New patients (last 14 days)">
          <LineChart data={d.registrations}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#7c3aed" />
          </LineChart>
        </Chart>
      </div>
    </div>
  );
}
