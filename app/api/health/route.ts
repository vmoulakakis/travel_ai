import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const dataUrl = process.env.SUPABASE_DECISION_DATA_URL ?? "https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/travel-decision-data";
  let supabaseDecisionData = false;
  let destinationCount = 0;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(dataUrl, { signal: controller.signal, cache: "no-store" });
    if (response.ok) {
      const payload = await response.json() as { destinations?: unknown[] };
      destinationCount = Array.isArray(payload.destinations) ? payload.destinations.length : 0;
      supabaseDecisionData = destinationCount >= 3;
    }
  } catch {
    supabaseDecisionData = false;
  } finally {
    clearTimeout(timer);
  }

  const body = {
    ok: supabaseDecisionData,
    version: "2.0",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    checks: {
      supabaseDecisionData,
      destinationCount,
      deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
      linkwiseIngestConfigured: Boolean(process.env.SUPABASE_INGEST_URL && process.env.SUPABASE_INGEST_SECRET),
      cronConfigured: Boolean(process.env.CRON_SECRET),
      csvImportConfigured: Boolean(process.env.SUPABASE_CSV_IMPORT_URL && process.env.SUPABASE_INGEST_SECRET)
    },
    at: new Date().toISOString()
  };

  return NextResponse.json(body, { status: body.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
