// Money is stored as integer cents. Parse decimal text without float drift.
export function toCents(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ""] = s.split(".");
  return Number(w) * 100 + Number((f + "00").slice(0, 2));
}

export function fmt(cents: number): string {
  return (cents / 100).toFixed(2);
}
