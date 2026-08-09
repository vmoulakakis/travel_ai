import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "content-type", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=180, s-maxage=300", "x-content-type-options": "nosniff" };
const slugPattern = /^[a-z0-9-]{2,80}$/;
const selected = "id,evidence_kind,subject_name,source_provider,headline,summary,rank_value,rating_value,rating_scale,review_count,source_product_id,starts_at,ends_at,source_month,observed_at,expires_at,confidence";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "GET") return new Response(JSON.stringify({ evidence: [] }), { status: 405, headers: cors });
  const slug = new URL(request.url).searchParams.get("slug")?.toLowerCase() ?? "";
  if (!slugPattern.test(slug)) return new Response(JSON.stringify({ evidence: [] }), { status: 400, headers: cors });
  const base = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) return new Response(JSON.stringify({ evidence: [] }), { status: 503, headers: cors });
  try {
    const endpoint = new URL("/rest/v1/destination_evidence_v12", base);
    endpoint.searchParams.set("select", selected);
    endpoint.searchParams.set("destination_id", `eq.${slug}`);
    endpoint.searchParams.set("status", "eq.verified");
    endpoint.searchParams.set("expires_at", `gt.${new Date().toISOString()}`);
    endpoint.searchParams.set("order", "confidence.desc,observed_at.desc");
    endpoint.searchParams.set("limit", "40");
    const response = await fetch(endpoint, { headers: { apikey: key, authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error("evidence unavailable");
    const evidence = await response.json();
    return new Response(JSON.stringify({ evidence }), { headers: cors });
  } catch {
    return new Response(JSON.stringify({ evidence: [] }), { status: 503, headers: { ...cors, "cache-control": "no-store" } });
  }
});
