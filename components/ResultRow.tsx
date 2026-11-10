"use client";
import { useState } from "react";

export type Res = {
  result_id: number; test_name: string; unit: string | null; reference_range: string | null;
  value: string | null; flag: string | null; status: string; review_note: string | null;
};
type Call = (url: string, method: string, body: object) => Promise<boolean>;

export default function ResultRow({ r, sampleStatus, canEnter, canVerify, call }: {
  r: Res; sampleStatus: string; canEnter: boolean; canVerify: boolean; call: Call;
}) {
  const [value, setValue] = useState(r.value ?? "");
  const [flag, setFlag] = useState(r.flag ?? "");
  const [note, setNote] = useState("");
  const editable = canEnter && (r.status === "draft" || r.status === "rejected") && ["received", "processing"].includes(sampleStatus);
  const id = `res-${r.result_id}`;
  return (
    <div className="text-sm">
      <div className="font-medium">{r.test_name} <span className="font-normal text-slate-500">
        {r.reference_range ? `Ref: ${r.reference_range}` : ""} {r.unit ?? ""}</span>
        <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs">{r.status}</span></div>
      {r.status === "rejected" && r.review_note && <p className="text-red-600">Rejected: {r.review_note}</p>}
      {editable ? (
        <div className="mt-1 flex flex-wrap items-end gap-2">
          <label htmlFor={id} className="text-xs">Value<input id={id} className="input" value={value} onChange={(e) => setValue(e.target.value)} /></label>
          <label className="text-xs">Flag
            <select className="input" value={flag} onChange={(e) => setFlag(e.target.value)}>
              {["", "normal", "low", "high", "critical"].map((f) => <option key={f} value={f}>{f || "none"}</option>)}
            </select></label>
          <button className="btn-secondary" onClick={() => call(`/api/results/${r.result_id}`, "PUT", { value, flag })}>Save draft</button>
          <button className="btn" onClick={() => call(`/api/results/${r.result_id}`, "PUT", { value, flag, action: "submit" })}>Submit for review</button>
        </div>
      ) : (
        <p>Value: <strong>{r.value || "—"}</strong> {r.flag && <span>({r.flag})</span>}</p>
      )}
      {canVerify && r.status === "submitted" && (
        <div className="mt-1 flex flex-wrap items-end gap-2">
          <label className="text-xs">Rejection note<input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button className="btn" onClick={() => call(`/api/results/${r.result_id}/review`, "POST", { action: "approve" })}>Approve</button>
          <button className="btn-secondary" onClick={() => call(`/api/results/${r.result_id}/review`, "POST", { action: "reject", note })}>Reject</button>
        </div>
      )}
    </div>
  );
}
