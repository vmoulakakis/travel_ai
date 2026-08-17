import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { getSupabaseAdmin } from "@/lib/data/supabase-admin";
import { buildBilingualDestinationOpportunitiesV29, buildSeoStrategyV29, reviewSeoStrategyWithAiV29 } from "@/lib/seo/greece-seo-v29";

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
  await admin.upsert("seo_agent_runs", [{ id: runId, status: "running", evidence_summary: {
    release: "V29",
    locales: ["el-GR", "en-GB"],
    demand_signal: "editorial-seed-clusters; measured impressions require Search Console",
    page_quality: "first-party-calculated",
    publishing_mode: "human-review-required",
    backlink_mode: "earned-editorial-only",
  } }], "id");
  try {
    const catalog = await loadV8DestinationCatalog();
    const greekCatalog = catalog.filter(item => item.countryCode === "GR");
    const currentMonth = new Date().getUTCMonth();
    const rows = buildBilingualDestinationOpportunitiesV29(greekCatalog, currentMonth);
    const strategy = buildSeoStrategyV29(greekCatalog);
    const aiReview = await reviewSeoStrategyWithAiV29(greekCatalog);
    const stored = await admin.upsert("seo_opportunities", rows, "destination_id,query_key");
    if (!stored.ok) throw new Error(stored.error ?? "SEO opportunity write failed");
    const evidenceSummary = {
      release: "V29",
      destinations: greekCatalog.length,
      opportunities: rows.length,
      locales: strategy.locales,
      clusters: strategy.clusters,
      internal_link_graph: strategy.internalLinkGraph,
      link_earning_assets: strategy.linkEarningAssets,
      backlink_policy: strategy.backlinkPolicy,
      ai_review: aiReview.review,
      ai_model: aiReview.model,
      ai_budget: aiReview.budget,
      publishing_mode: "human-review-required",
    };
    await admin.upsert("seo_agent_runs", [{ id: runId, status: "completed", opportunity_count: rows.length, evidence_summary: evidenceSummary, completed_at: new Date().toISOString() }], "id");
    return NextResponse.json({
      ok: true,
      release: "V29",
      runId,
      destinations: greekCatalog.length,
      opportunities: rows.length,
      locales: strategy.locales,
      aiModel: aiReview.model,
      linkEarningAssets: strategy.linkEarningAssets.length,
      publication: "review-required",
      backlinks: "earned-editorial-only",
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    await admin.upsert("seo_agent_runs", [{ id: runId, status: "failed", error_summary: error instanceof Error ? error.message.slice(0, 600) : "Unknown failure", completed_at: new Date().toISOString() }], "id");
    return NextResponse.json({ error: "SEO audit failed" }, { status: 500 });
  }
}
