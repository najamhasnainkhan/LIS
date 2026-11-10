import { NextRequest, NextResponse } from "next/server";
import { requirePerm } from "@/lib/auth";
import { getReport } from "@/lib/report";
import { buildPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requirePerm("reports");
  if ("error" in a) return a.error;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid sample" }, { status: 400 });
  const r = await getReport(id);
  if (!r) return NextResponse.json({ error: "No approved results for this sample" }, { status: 404 });
  return new NextResponse(new Uint8Array(buildPdf(r)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${r.sample_code}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
