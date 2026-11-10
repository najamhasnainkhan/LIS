import { code128 } from "@/lib/code128";

export default function Barcode({ value, height = 50 }: { value: string; height?: number }) {
  const bars = code128(value);
  const total = bars[bars.length - 1].x;
  return (
    <svg viewBox={`0 0 ${total} ${height}`} width={total * 1.6} height={height} role="img" aria-label={`Barcode ${value}`}>
      <rect width={total} height={height} fill="#fff" />
      {bars.slice(0, -1).map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#000" />)}
    </svg>
  );
}

export function SampleLabel(p: { code: string; patient: string; patientCode: string; type?: string | null }) {
  return (
    <div className="print-area inline-block rounded border bg-white p-3 text-xs">
      <div className="font-semibold">{p.patient} ({p.patientCode})</div>
      <Barcode value={p.code} />
      <div className="font-mono">{p.code}{p.type ? ` · ${p.type}` : ""}</div>
    </div>
  );
}
