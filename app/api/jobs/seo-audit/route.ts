import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { getSupabaseAdmin } from "@/lib/data/supabase-admin";
import { destinationSeo } from "@/lib/seo/destination-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "SEO storage unavailable" }, { status: 503 });
  const runId = randomUUID();
  await admin.upsert("seo_agent_runs", [{ id: runId, status: "running", evidence_summary: { search_demand: "public-serp-observed", page_quality: "calculated", content_gap: "inferred", publishing_mode: "human-review-required" } }], "id");
  try {
    const catalog = await loadV8DestinationCatalog();
    const currentMonth = new Date().getUTCMonth();
    const rows = catalog.flatMap(destination => {
      const seo = destinationSeo(destination);
      const seasonScore = destination.monthFit[currentMonth] ?? 50;
      return seo.supportingKeywords.slice(0, 3).map((keyword, index) => ({
        destination_id: destination.slug,
        query_key: `${destination.slug}:${index + 1}`,
        primary_keyword: keyword,
        search_intent: index === 0 ? "season-and-decision" : index === 1 ? "trip-planning" : "experience-fit",
        opportunity_score: Math.round(Math.min(100, seasonScore * .55 + destination.routeConfidence * 25 + (5 - destination.costTier) * 4) * 100) / 100,
        recommended_title: index === 0 ? seo.title : `${keyword}: η ειλικρινής απάντηση πριν αποφασίσεις`,
        evidence: { provenance: { demand: "observed-public-serp-cluster", season: "calculated-destination-knowledge", recommendation: "inferred" }, guardrails: ["no-auto-publish", "no-fabricated-ratings", "no-scaled-duplicate-content", "human-review-before-indexing"] },
        status: "draft",
        last_evaluated_at: new Date().toISOString(),
      }));
    });
    const stored = await admin.upsert("seo_opportunities", rows, "destination_id,query_key");
    if (!stored.ok) throw new Error(stored.error ?? "SEO opportunity write failed");
    await admin.upsert("seo_agent_runs", [{ id: runId, status: "completed", opportunity_count: rows.length, evidence_summary: { destinations: catalog.length, opportunities: rows.length, publishing_mode: "human-review-required" }, completed_at: new Date().toISOString() }], "id");
    return NextResponse.json({ ok: true, runId, destinations: catalog.length, opportunities: rows.length, publication: "review-required" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    await admin.upsert("seo_agent_runs", [{ id: runId, status: "failed", error_summary: error instanceof Error ? error.message.slice(0, 600) : "Unknown failure", completed_at: new Date().toISOString() }], "id");
    return NextResponse.json({ error: "SEO audit failed" }, { status: 500 });
  }
}
