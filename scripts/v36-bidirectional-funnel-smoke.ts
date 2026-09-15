import fs from "node:fs";
import path from "node:path";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");
const home=read("components/v36-escape-funnel.tsx");
const css=read("components/v36-escape-funnel.module.css");
const ranker=read("lib/decision/solution-ranking-v36.ts");
const route=read("app/api/escape/solve-v36/stream/route.ts");
const gr=read("app/page.tsx"),en=read("app/en/page.tsx"),layout=read("app/layout.tsx");
const failures:string[]=[];
const expect=(condition:boolean,message:string)=>{if(!condition)failures.push(message)};

expect(/V\d+EscapeFunnel/.test(gr)&&/V\d+EscapeFunnel/.test(en),"current escape funnel must own both home routes");
expect(home.includes('type Stage="mood"|"dna"|"time"|"reality"|"solve"|"results"'),"V36 compatibility funnel must remain a bounded state-machine");
expect(home.includes('/api/escape/solve-v36/stream'),"active architecture must retain the bidirectional solve route");
expect(home.includes("Βρες 10 πραγματικές λύσεις")&&home.includes("Find 10 real solutions"),"V36 compatibility surface must preserve the ten-real-solutions contract");
expect(home.includes("Need → Destination → Stay ⇄ Stay Inventory → Destination → Need"),"bidirectional reasoning contract must remain explicit");
expect(home.includes("setInterval")&&home.includes("6200"),"mood/destination media must rotate rather than remain static");
expect(home.includes("slice(0,3)")||home.includes("slice(0, 3)"),"mood galleries must have multiple frames");
expect(css.includes("height:100dvh")&&css.includes("overflow:hidden"),"compatibility shell must lock to the viewport");
const mobile=css.split("@media(max-width:720px)")[1]??"";
expect(mobile.includes(".screen")&&mobile.includes("overflow:hidden"),"mobile funnel must not fall back to vertical page scrolling");
expect(!mobile.includes("overflow-y:auto"),"mobile vertical scrolling must be removed");
expect(ranker.includes("loadV8DestinationCatalog")&&!ranker.includes('countryCode===\"GR\"'),"reverse ranker must scan the full verified catalog, not Greece only");
expect(ranker.includes("loadV8StayOffers")&&ranker.includes("60"),"inventory pass must scan meaningful real stay inventory up to 60 offers per destination");
expect(ranker.includes("catalog.length")&&ranker.includes("scanAll"),"inventory pass must scan the full allowed destination catalog");
expect(ranker.includes("inventoryLookupFailures")&&ranker.includes("Stay inventory backend failed"),"inventory pass must distinguish backend failure from true zero inventory");
expect(ranker.includes("destinationScore")&&ranker.includes("stayScore")&&ranker.includes("inventoryCount"),"bidirectional ranking must combine destination and stay evidence");
expect(ranker.includes("semanticScore")&&ranker.includes("valueScore")&&ranker.includes("locationScore")&&ranker.includes("evidenceScore"),"stay justification needs a score breakdown");
expect(ranker.includes("trackingUrl:offer.trackingUrl"),"original affiliate tracking URL must be preserved");
expect(route.includes("forward-recovery")&&route.includes("buildEscapeSolutionsV36(trip,base,10)"),"failed forward reasoning must recover through inventory-led reverse search");
expect(layout.includes("έως 10 πραγματικές λύσεις")&&!layout.includes("3 semantic-matched escapes"),"SEO copy must match the current product truth");

if(failures.length){console.error("Bidirectional funnel compatibility smoke FAILED\n- "+failures.join("\n- "));process.exit(1)}
console.log("Bidirectional funnel compatibility smoke passed: no-scroll UX, rotating cinematography, full-catalog inventory recovery, ten stay-backed solutions and evidence-based stay reasoning remain wired.");
