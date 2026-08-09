import { NextResponse } from "next/server";
import { loadV8StayOffers } from "@/lib/data/destination-v8";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const iso = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") ?? "").trim().toLowerCase();
  const start = (url.searchParams.get("start_date") ?? "2026-09-18").trim();
  const end = (url.searchParams.get("end_date") ?? "2026-09-22").trim();
  if (!/^[a-z0-9-]{2,80}$/.test(slug) || !iso.test(start) || !iso.test(end) || Date.parse(end) <= Date.parse(start)) return new NextResponse(null, { status: 404 });
  const offers = await loadV8StayOffers(slug, start, end, 12).catch(() => []);
  const image = offers.map(offer => offer.imageUrl || offer.thumbUrl).find((value): value is string => typeof value === "string" && value.startsWith("https://"));
  if (!image) return new NextResponse(null, { status: 404 });
  const response = NextResponse.redirect(image, 307);
  response.headers.set("cache-control", "private, max-age=0, must-revalidate");
  response.headers.set("x-media-source", "supabase-stay-offers");
  return response;
}
