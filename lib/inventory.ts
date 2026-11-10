export const INV_COLS =
  "id, name, category, unit, quantity::float as quantity, min_stock::float as min_stock, to_char(expiry_date,'YYYY-MM-DD') as expiry_date, lot_no, supplier";

export function parseItem(b: any): { error: string } | { v: any[] } {
  const name = String(b.name ?? "").trim();
  if (!name) return { error: "Name is required" };
  const category = ["reagent", "chemical", "consumable"].includes(b.category) ? b.category : "reagent";
  const qty = Number(b.quantity), min = Number(b.min_stock ?? 0);
  if (!isFinite(qty) || qty < 0 || !isFinite(min) || min < 0) return { error: "Quantities must be 0 or more" };
  const expiry = b.expiry_date ? String(b.expiry_date) : null;
  if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return { error: "Invalid expiry date" };
  const t = (x: unknown) => (String(x ?? "").trim() || null);
  return { v: [name, category, t(b.unit) ?? "pcs", qty, min, expiry, t(b.lot_no), t(b.supplier)] };
}
