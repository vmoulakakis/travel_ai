import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessStayAvailabilityV20 } from "../lib/decision/stay-availability-v20";
import type { V8StayOffer } from "../lib/decision/v8-types";

const base:V8StayOffer={
  sourceProductId:"v20-test",
  propertyName:"V20 Test Stay",
  trackingUrl:"https://go.linkwi.se/z/CD104/test",
  validFrom:"2026-09-01T00:00:00Z",
  validTo:"2026-10-01T00:00:00Z",
  inStock:null,
};

const unknown=assessStayAvailabilityV20(base,"2026-09-18","2026-09-22");
assert.equal(unknown.truth,"VALID_WINDOW_STOCK_UNKNOWN");
assert.equal(unknown.stockState,"UNKNOWN");
assert.equal(unknown.confidence,"MEDIUM");
assert.equal(unknown.fullTripWindowCovered,true);

const confirmed=assessStayAvailabilityV20({...base,inStock:true},"2026-09-18","2026-09-22");
assert.equal(confirmed.truth,"CONFIRMED_ACTIVE");
assert.equal(confirmed.stockState,"AVAILABLE");
assert.equal(confirmed.confidence,"HIGH");

const unavailable=assessStayAvailabilityV20({...base,inStock:false},"2026-09-18","2026-09-22");
assert.equal(unavailable.truth,"EXPLICITLY_UNAVAILABLE");
assert.equal(unavailable.stockState,"UNAVAILABLE");

const outside=assessStayAvailabilityV20({...base,validTo:"2026-09-20T00:00:00Z"},"2026-09-18","2026-09-22");
assert.equal(outside.truth,"OUTSIDE_VALIDITY_WINDOW");
assert.equal(outside.fullTripWindowCovered,false);

const invalid=assessStayAvailabilityV20({...base,trackingUrl:"https://example.com/hotel"},"2026-09-18","2026-09-22");
assert.equal(invalid.truth,"INVALID_FEED_EVIDENCE");

const migration=readFileSync("supabase/migrations/20260814232000_v20_production_truth.sql","utf8");
assert.match(migration,/revoke all on function public\.get_active_stay_cities_v15\(integer\) from public, anon, authenticated/i);
assert.match(migration,/grant execute on function public\.get_active_stay_cities_v15\(integer\) to service_role/i);
assert.match(migration,/get_production_truth_v20/i);
assert.match(migration,/unknownStockOffers/);
assert.match(migration,/verifiedEvidenceDestinations/);

const edge=readFileSync("supabase/functions/production-truth-v20/index.ts","utf8");
assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
assert.match(edge,/SUPABASE_INGEST_SECRET/);
assert.match(edge,/get_production_truth_v20/);
assert.match(edge,/TRI_STATE_STOCK_TRUTH/);

// V20's permanent gate checks the truth semantics, not the name of the latest release.
const health=readFileSync("app/api/health/route.ts","utf8");
assert.match(health,/productionTruthReady/);
assert.match(health,/triStateStayAvailability:true/);

const status=readFileSync("app/api/v20/status/route.ts","utf8");
assert.match(status,/release:\"V20\"/);
assert.match(status,/privilegedInventoryRpcPublic:false/);
assert.match(status,/evidenceCoveragePercent/);

const mapper=readFileSync("lib/data/destination-v8.ts","utf8");
assert.match(mapper,/inStock:typeof row\.in_stock===\"boolean\"\?row\.in_stock:null/);

console.log("V20_PRODUCTION_TRUTH_OK tri-state-availability=PASS privileged-rpc=HARDENED evidence-status=EXPOSED release-health=COMPATIBLE");
