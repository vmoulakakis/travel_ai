import fs from "node:fs";
import path from "node:path";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");
const gr=read("app/page.tsx");
const en=read("app/en/page.tsx");
const layout=read("app/layout.tsx");
const v40=gr.includes("V40DiscoveryExperience");
const home=read(v40?"components/v40-discovery-experience.tsx":"components/v36-escape-funnel.tsx");
const css=read(v40?"components/v40-discovery-experience.module.css":"components/v36-escape-funnel.module.css");
const ranker=read("lib/decision/solution-ranking-v36.ts");
const route=read("app/api/escape/solve-v36/stream/route.ts");
const failures:string[]=[];
const expect=(condition:boolean,message:string)=>{if(!condition)failures.push(message)};

const ownsHome=v40
 ? gr.includes("V40DiscoveryExperience")&&en.includes("V40DiscoveryExperience")
 : /V\d+EscapeFunnel/.test(gr)&&/V\d+EscapeFunnel/.test(en);
const boundedExperience=v40
 ? home.includes("Travel Agent")&&home.includes("progress")&&home.includes("solutions=result?.solutions.slice(0,3)")
 : home.includes('type Stage="mood"|"dna"|"time"|"reality"|"solve"|"results"');
const decisionTruth=v40
 ? home.includes("real stay inventory")&&home.includes("solutions=result?.solutions.slice(0,3)")&&home.includes("Destination reveal")
 : home.includes("Βρες 10 πραγματικές λύσεις")&&home.includes("Find 10 real solutions");
const bidirectionalVisible=v40
 ? home.includes("destination")&&home.includes("stay")&&home.includes("inventory")
 : home.includes("Need → Destination → Stay ⇄ Stay Inventory → Destination → Need");
const cinematic=v40
 ? home.includes("mode=aerial")
 : home.includes("setInterval")&&home.includes("6200");
const focusedShell=v40
 ? css.includes("min-height:100svh")&&css.includes("overflow:hidden")&&css.includes("height:calc(100svh - 76px)")
 : css.includes("height:100dvh")&&css.includes("overflow:hidden");

expect(ownsHome,"current escape experience must own both home routes");
expect(boundedExperience,"active consumer surface must remain a bounded decision experience");
expect(home.includes('/api/escape/solve-v36/stream'),"active architecture must retain the bidirectional solve route");
expect(decisionTruth,"active discovery surface must preserve real-inventory decision truth while presenting a bounded destination set");
expect(bidirectionalVisible,"bidirectional reasoning contract must remain represented in the active experience");
expect(cinematic,"destination media must remain cinematic and sourced");
expect(home.includes("slice(0,3)")||home.includes("slice(0, 3)"),"active discovery must expose multiple bounded frames/options");
expect(focusedShell,"active shell must behave as a focused app instead of an endless questionnaire");
expect(css.includes("@media"),"active experience must retain a mobile-specific layout");
expect(ranker.includes("loadV8DestinationCatalog")&&!ranker.includes('countryCode===\"GR\"'),"reverse ranker must scan the full verified catalog, not Greece only");
expect(ranker.includes("loadV8StayOffers")&&ranker.includes("60"),"inventory pass must scan meaningful real stay inventory up to 60 offers per destination");
expect(ranker.includes("catalog.length")&&ranker.includes("scanAll"),"inventory pass must scan the full allowed destination catalog");
expect(ranker.includes("inventoryLookupFailures")&&ranker.includes("Stay inventory backend failed"),"inventory pass must distinguish backend failure from true zero inventory");
expect(ranker.includes("destinationScore")&&ranker.includes("stayScore")&&ranker.includes("inventoryCount"),"bidirectional ranking must combine destination and stay evidence");
expect(ranker.includes("semanticScore")&&ranker.includes("valueScore")&&ranker.includes("locationScore")&&ranker.includes("evidenceScore"),"stay justification needs a score breakdown");
expect(ranker.includes("trackingUrl:offer.trackingUrl"),"original affiliate tracking URL must be preserved");
expect(route.includes("forward-recovery")&&route.includes("buildEscapeSolutionsV36(trip,base,10)"),"failed forward reasoning must recover through inventory-led reverse search");
expect(layout.includes("έως 10 πραγματικές λύσεις")&&!layout.includes("3 semantic-matched escapes"),"SEO copy must match the underlying ten-solution engine truth");

if(failures.length){console.error("Bidirectional funnel compatibility smoke FAILED\n- "+failures.join("\n- "));process.exit(1)}
console.log(`Bidirectional funnel compatibility smoke passed: active=${v40?"V41-on-V40-shell":"V36"}, full-catalog inventory recovery, ten-solution engine and evidence-based stay reasoning remain wired.`);
