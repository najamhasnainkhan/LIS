import { Report, ageOf } from "./report";

// Minimal dependency-free PDF writer (Helvetica, A4, text and lines).
const W = 595, H = 842, M = 40;
const esc = (s: string) =>
  s.replace(/\u2014/g, "-").replace(/[^\x20-\x7e]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

class Page {
  ops: string[] = [];
  text(x: number, y: number, s: string, size = 10, bold = false, rgb = "0 0 0") {
    this.ops.push(`BT ${rgb} rg /${bold ? "F2" : "F1"} ${size} Tf ${x} ${H - y} Td (${esc(s)}) Tj ET`);
  }
  line(x1: number, y1: number, x2: number, y2: number, w = 0.5) {
    this.ops.push(`${w} w ${x1} ${H - y1} m ${x2} ${H - y2} l S`);
  }
  rect(x: number, y: number, w: number, h: number, rgb: string) {
    this.ops.push(`${rgb} rg ${x} ${H - y - h} ${w} ${h} re f`);
  }
}

const fmt = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—");
const FLAGC: Record<string, string> = { low: "0.1 0.3 0.8", high: "0.8 0.1 0.1", critical: "0.8 0.1 0.1" };

export function buildPdf(r: Report): Buffer {
  const pages: Page[] = [];
  let p: Page = new Page(), y = 0;
  const cols = [M, 230, 330, 400, 500];
  const header = () => {
    p = new Page(); pages.push(p);
    p.rect(0, 0, W, 70, "0.05 0.35 0.45");
    p.text(M, 38, "Pathology Laboratory", 20, true, "1 1 1");
    p.text(M, 56, "Laboratory Report", 11, false, "1 1 1");
    p.text(W - M - 130, 38, `Report: ${r.sample_code}`, 10, true, "1 1 1");
    y = 95;
  };
  const tableHead = () => {
    p.rect(M, y - 12, W - 2 * M, 18, "0.9 0.93 0.95");
    ["Test", "Result", "Unit", "Reference", "Flag"].forEach((h, i) => p.text(cols[i] + 3, y, h, 9, true));
    y += 20;
  };
  header();
  const kv = (x: number, yy: number, k: string, v: string) => { p.text(x, yy, k, 9, true); p.text(x + 75, yy, v, 9); };
  kv(M, y, "Patient", r.patient.name); kv(300, y, "Sample ID", r.sample_code); y += 15;
  kv(M, y, "Patient ID", r.patient.code); kv(300, y, "Specimen", r.sample_type ?? "—"); y += 15;
  kv(M, y, "Age / Sex", `${ageOf(r.patient.dob)} / ${r.patient.gender ?? "—"}`); kv(300, y, "Collected", fmt(r.collected_at)); y += 15;
  kv(M, y, "Phone", r.patient.phone ?? "—"); kv(300, y, "Reported", fmt(r.completed_at ?? r.generated_at)); y += 14;
  p.line(M, y, W - M, y, 1); y += 24;
  tableHead();
  for (const l of r.lines) {
    if (y > H - 110) { header(); tableHead(); }
    const c = FLAGC[l.flag] ?? "0 0 0";
    const abn = l.flag === "low" || l.flag === "high" || l.flag === "critical";
    p.text(cols[0] + 3, y, l.test.slice(0, 32), 10);
    p.text(cols[1] + 3, y, l.value.slice(0, 16), 10, abn, c);
    p.text(cols[2] + 3, y, l.unit.slice(0, 14), 9);
    p.text(cols[3] + 3, y, l.range.slice(0, 16), 9);
    p.text(cols[4] + 3, y, abn ? l.flag.toUpperCase() : l.flag === "normal" ? "Normal" : "", 9, abn, c);
    y += 8; p.line(M, y, W - M, y, 0.25); y += 14;
  }
  y += 10;
  if (r.pending) { p.text(M, y, `Note: ${r.pending} test(s) on this sample are not yet approved and are not shown.`, 9); y += 14; }
  p.text(M, y, "H = above range, L = below range, CRITICAL = critical value.", 8); y += 28;
  p.text(M, y, `Approved by: ${r.verifiers.join(", ") || "—"}`, 10, true);
  const last = pages[pages.length - 1];
  last.line(M, H - 50, W - M, H - 50);
  last.text(M, H - 36, `Generated ${fmt(r.generated_at)}. This report is valid only for the sample identified above.`, 8);

  // Assemble objects: 1 catalog, 2 pages, 3 F1, 4 F2, then page/content pairs.
  const objs: string[] = [];
  const kids: number[] = [];
  pages.forEach((pg, i) => {
    const pid = 5 + i * 2, cid = pid + 1;
    kids.push(pid);
    const stream = pg.ops.join("\n");
    objs[pid] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>`;
    objs[cid] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  });
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    offs[i] = Buffer.byteLength(out);
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) out += `${String(offs[i]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}
