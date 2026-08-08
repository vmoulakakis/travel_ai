import { NextResponse } from "next/server";
import { loadAffiliateDestinationDetail } from "@/lib/data/affiliate-universe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const isoDate=/^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destinationId = url.searchParams.get("destination_id")?.trim();
  const startDate = url.searchParams.get("start_date")?.trim() ?? "";
  const endDate = url.searchParams.get("end_date")?.trim() ?? "";
  if (!destinationId) return NextResponse.json({ error: "destination_id required" }, { status: 400 });
  if (!isoDate.test(startDate)||!isoDate.test(endDate)||Date.parse(endDate)<=Date.parse(startDate)) return NextResponse.json({ error: "valid start_date/end_date required" }, { status: 400 });
  try {
    const detail = await loadAffiliateDestinationDetail(destinationId, {startDate,endDate});
    return NextResponse.json(detail, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Destination offer detail unavailable", detail: error instanceof Error ? error.message : "unknown error" }, { status: 503 });
  }
}
