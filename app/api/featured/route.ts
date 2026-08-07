import { NextResponse } from "next/server";
import { loadFeaturedAffiliateDestinations } from "@/lib/data/affiliate-universe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const destinations = await loadFeaturedAffiliateDestinations(5);
    return NextResponse.json({ source: "linkwise-json-only", destinations }, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch {
    return NextResponse.json({ source: "linkwise-json-only", destinations: [] }, { status: 200, headers: { "cache-control": "public, s-maxage=60" } });
  }
}
