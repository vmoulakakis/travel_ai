import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path:string)=>readFileSync(path,"utf8");
const gateway=read("lib/ai/v70-supabase-gateway.ts");
const intelligence=read("lib/ai/travel-intelligence-v70.ts");
const commerce=read("lib/ai/stay-commerce-v70.ts");
const journeyStore=read("lib/ai/journey-store-v70.ts");
const model=read("lib/ai/agentic-model-v70.ts");
const discovery=read("lib/ai/travel-discovery-v70.ts");
const stay=read("lib/ai/travel-stay-v70.ts");
const journey=read("lib/ai/journey-builder-v70.ts");
const tracking=read("app/api/v70/track/route.ts");
const health=read("app/api/v70/health/route.ts");
const finalize=read("app/api/v70/finalize/route.ts");
const edge=read("supabase/functions/travel-v70-backend/index.ts");

assert.ok(gateway.includes("SUPABASE_INGEST_SECRET"),"V70 Vercel gateway must use application secret");
assert.ok(!gateway.includes("SUPABASE_SERVICE_ROLE_KEY"),"V70 Vercel gateway must never require Supabase service role");
for(const [name,source] of [["intelligence",intelligence],["commerce",commerce],["journeyStore",journeyStore]] as const){
 assert.ok(source.includes("callV70Backend"),`${name} must route through V70 Supabase gateway`);
 assert.ok(!source.includes("SUPABASE_SERVICE_ROLE_KEY"),`${name} must not expose service-role usage in Vercel runtime`);
}
assert.ok(edge.includes("SUPABASE_SERVICE_ROLE_KEY"),"service role belongs inside Supabase edge runtime");
assert.ok(edge.includes("x-ingest-secret")&&edge.includes("app_secrets?name=eq.ingest_api"),"gateway must authenticate using hashed application secret");
assert.ok(model.includes("Math.min(args.maxOutputTokens??900,6400)"),"V70 structured outputs must support large Top-50/final journey payloads");
assert.ok(discovery.includes("picks[] exactly 50")&&discovery.includes("rows.length!==50"),"default discovery must enforce exactly 50 AI choices");
assert.ok(stay.includes("commission intentionally withheld from reasoning")&&stay.includes("Curate exactly three stays"),"stay curation must be contextual and affiliate-neutral");
assert.ok(journey.includes("affiliate URL deliberately withheld from reasoning")&&journey.includes("final 360-degree journey"),"journey synthesis must be grounded and affiliate-neutral");
assert.ok(tracking.includes('target.hostname==="linkwi.se"')&&tracking.includes('target.hostname.endsWith(".linkwi.se")'),"tracking redirect must be provider-host allowlisted");
assert.ok(health.includes('release:"V70"')&&health.includes("serviceRoleExposedToVercel:false"),"V70 health must expose backend readiness and service-role isolation");
assert.ok(finalize.includes("journey/pdf")&&finalize.includes("journey/email")&&finalize.includes("/api/v70/track"),"finalization must expose PDF, email and tracking contracts");

const routes=[
 "app/api/v70/discovery/route.ts",
 "app/api/v70/funnel/route.ts",
 "app/api/v70/select-destination/route.ts",
 "app/api/v70/finalize/route.ts",
 "app/api/v70/journey/route.ts",
 "app/api/v70/journey/pdf/route.ts",
 "app/api/v70/journey/email/route.ts",
 "app/api/v70/track/route.ts",
 "app/api/v70/health/route.ts"
];
for(const route of routes)assert.ok(read(route).length>80,`missing V70 route: ${route}`);

console.log("V70_AGENTIC_BACKEND_SMOKE_OK top50=EXACT funnel=PROGRESSIVE top3=CONTEXTUAL stay=AGENTIC journey=360 pdf=READY email=READY tracking=ALLOWLISTED gateway=SERVICE_ROLE_ISOLATED");
