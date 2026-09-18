import fs from "node:fs";
import path from "node:path";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");
const gr=read("app/page.tsx");
const en=read("app/en/page.tsx");
const layout=read("app/layout.tsx");
const isV50=gr.includes("V50TravelIntelligenceHome");
const home=isV50?read("components/v50-travel-intelligence-home.tsx"):read("components/v40-discovery-experience.tsx");
const css=isV50?read("components/v50-travel-intelligence-home.module.css"):read("components/v40-discovery-experience.module.css");
const activeSolver=isV50?read("app/api/v50/agent/route.ts"):read("app/api/escape/solve-v42/route.ts");
const legacyRanker=read("lib/decision/solution-ranking-v36.ts");
const legacyRoute=read("app/api/escape/solve-v36/stream/route.ts");
const v42=read("app/api/escape/solve-v42/route.ts");
const failures:string[]=[];
const expect=(condition:boolean,message:string)=>{if(!condition)failures.push(message)};

expect(
  (isV50&&gr.includes("V50TravelIntelligenceHome")&&en.includes("V40DiscoveryExperience"))
  ||(!isV50&&gr.includes("V40DiscoveryExperience")&&en.includes("V40DiscoveryExperience")),
  "Greek home may advance to V50 while English remains on supported V40 until separately migrated"
);
expect(
  isV50
   ? home.includes("Travel Agent")&&home.includes("solutions.map")&&activeSolver.includes(".slice(0,10)")
   : home.includes("Travel Agent")&&home.includes("solutions=result?.solutions.slice(0,3)"),
  "active consumer surface must remain a bounded decision experience"
);
expect(
  isV50?home.includes('/api/v50/agent'):home.includes('/api/escape/solve-v42'),
  "active architecture must use its current server-side semantic agent"
);
expect(
  isV50
   ? activeSolver.includes("runTravelOrchestratorV45")&&activeSolver.includes("loadV8StayOffers")&&activeSolver.includes("assessStayAvailabilityV20")
   : activeSolver.includes("escape-inventory-v42")&&activeSolver.includes("interpretIntentV8")&&activeSolver.includes("semanticStayScore"),
  "active solver must combine semantic intent with real inventory"
);
expect(
  isV50
   ? home.includes("LIVE TRAVEL UNIVERSE")&&home.includes("live stay verification")
   : home.includes("Real inventory")&&home.includes("Destination reveal"),
  "active discovery surface must preserve real-inventory decision truth"
);
expect(
  isV50?home.includes("heroMedia")&&css.includes(".heroMedia"):home.includes("mode=aerial"),
  "destination media must remain cinematic and sourced"
);
expect(
  isV50?activeSolver.includes(".slice(0,10)"):(home.includes("slice(0,3)")||home.includes("slice(0, 3)")),
  "active discovery must expose multiple bounded options"
);
expect(
  isV50?css.includes(".stage")&&css.includes("overflow:hidden"):css.includes("min-height:100svh")&&css.includes("overflow:hidden"),
  "active shell must behave as a focused app instead of an endless questionnaire"
);
expect(css.includes("@media"),"active experience must retain a mobile-specific layout");
expect(!home.includes("Πρακτικό constraint 1/3")&&!home.includes("Πρακτικό constraint 2/3")&&!home.includes("Πρακτικό constraint 3/3"),"old three-screen practical funnel must stay removed");
expect(
  isV50
   ? activeSolver.includes("terrainEligibleCount")&&activeSolver.includes("stayVerifiedSolutions")
   : v42.includes("inventoryChecked")&&v42.includes("valueScore")&&v42.includes("locationScore")&&v42.includes("semanticScore"),
  "active ranking must expose real inventory/evidence state"
);
expect(
  isV50?activeSolver.includes("trackingUrl:offer.trackingUrl"):v42.includes("trackingUrl:x.row.tracking_url"),
  "original affiliate tracking URL must be preserved"
);
expect(legacyRanker.includes("loadV8StayOffers")&&legacyRoute.includes("forward-recovery"),"V36 fallback architecture must remain available");
expect(
  (layout.includes("5 πραγματικές stay-backed λύσεις")||layout.includes("έως 5 πραγματικές")||layout.includes("έως 10 πραγματικές λύσεις")||layout.includes("έως 10 πραγματικές stay-backed λύσεις"))
  &&!layout.includes("3 semantic-matched escapes"),
  "SEO copy must describe the current bounded output without claiming an obsolete three-option engine"
);

if(failures.length){console.error("Bidirectional funnel compatibility smoke FAILED\n- "+failures.join("\n- "));process.exit(1)}
console.log(`Bidirectional funnel compatibility smoke passed: active=${isV50?"V50 persistent agent + Top 10 live stays":"V40/V42 semantic shell"}, legacy V36 fallback retained.`);
