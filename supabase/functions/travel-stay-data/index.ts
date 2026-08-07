import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "content-type": "application/json; charset=utf-8"
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return new Response(JSON.stringify({ error: "Runtime configuration missing" }), { status: 500, headers: cors });

  const client = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const url = new URL(req.url);
  const destinationId = url.searchParams.get("destination_id")?.trim() || null;
  const query = url.searchParams.get("q")?.trim() || null;
  const requestedLimit = Number(url.searchParams.get("limit") || 5);
  const limit = Math.max(1, Math.min(8, Number.isFinite(requestedLimit) ? requestedLimit : 5));

  let destination: { id: string; name: string; supply_terms: string[] } | null = null;
  let terms: string[] = [];

  if (destinationId) {
    const { data, error } = await client.from("destinations").select("id,name,supply_terms").eq("id", destinationId).maybeSingle();
    if (error) return new Response(JSON.stringify({ error: "Destination lookup failed" }), { status: 500, headers: cors });
    if (data) {
      destination = { id: data.id, name: data.name, supply_terms: Array.isArray(data.supply_terms) ? data.supply_terms : [] };
      terms = destination.supply_terms.filter(Boolean);
    }
  }

  if (!terms.length && query) terms = [query];
  if (!terms.length) return new Response(JSON.stringify({ mapped: false, destination, signals: [], places: [], note: "No stay-supply mapping for this destination yet." }), { headers: { ...cors, "cache-control": "public, max-age=300" } });

  const { data: signals, error: signalError } = await client
    .from("destination_supply_signals")
    .select("location_label,country_hint,property_count,offer_count,min_price,median_price,max_price,currency,demand_score,hero_image_url,valid_to_max,observed_at")
    .in("location_label", terms)
    .order("demand_score", { ascending: false });
  if (signalError) return new Response(JSON.stringify({ error: "Supply signal lookup failed" }), { status: 500, headers: cors });

  const { data: places, error: placesError } = await client
    .from("stay_places")
    .select("id,property_name,location_label,address,country_hint,latitude,longitude,category,hero_image_url,offer_count,min_price,max_price,currency,demand_score,valid_to_max,observed_at")
    .in("location_label", terms)
    .order("demand_score", { ascending: false })
    .limit(limit);
  if (placesError) return new Response(JSON.stringify({ error: "Stay lookup failed" }), { status: 500, headers: cors });

  return new Response(JSON.stringify({
    mapped: true,
    destination,
    terms,
    signals: signals ?? [],
    places: (places ?? []).map((place) => ({ ...place, outboundEligible: false })),
    source: "linkwise-feed-89-99-109",
    disclosure: "Stay supply and prices are feed observations. Affiliate outbound remains fail-closed until program/property/tracking eligibility is verified."
  }), { headers: { ...cors, "cache-control": "public, max-age=300, stale-while-revalidate=1800" } });
});
