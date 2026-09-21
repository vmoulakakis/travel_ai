import fs from "node:fs";
import path from "node:path";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");
const home=read("app/page.tsx"),homeEn=read("app/en/page.tsx");
const v54=home.includes("V54FinalHome"),v50=home.includes("V50TravelIntelligenceHome"),v40=home.includes("V40DiscoveryExperience"),v50Family=v54||v50;
const funnel=read(v54?"components/v54-final-home.tsx":v50?"components/v50-travel-intelligence-home.tsx":v40?"components/v40-discovery-experience.tsx":"components/v38-escape-funnel.tsx");
const builder=read(v54?"components/v50-stay-funnel.tsx":(v50||v40)?"components/v40-stay-workspace.tsx":"components/v38-escape-builder-client.tsx");
const parser=read("lib/data/destination-v8.ts"),local=read("lib/data/local-intelligence-v38.ts"),research=read("app/api/escape/research/route.ts"),guide=read("app/api/guide/route.ts"),email=read("app/api/guide/email/route.ts"),feedback=read("app/api/escape/feedback/route.ts"),skill=read("skills/web-design/SKILL.md"),priceMigration=read("supabase/migrations/20260915165500_v38_stay_price_truth_rpc.sql");
const agent=v50Family?read("app/api/v50/agent/route.ts"):"";
const failures:string[]=[];const expect=(ok:boolean,message:string)=>{if(!ok)failures.push(message)};

expect(
  v54?(home.includes("V54FinalHome")&&homeEn.includes("V40DiscoveryExperience"))
      :v50?(home.includes("V50TravelIntelligenceHome")&&homeEn.includes("V40DiscoveryExperience"))
      :v40?(home.includes("V40DiscoveryExperience")&&homeEn.includes("V40DiscoveryExperience"))
      :(home.includes("V38EscapeFunnel")&&homeEn.includes("V38EscapeFunnel")),
  "current GR route may advance to V50 while EN remains on supported V40 until separately migrated"
);
expect(
  v54?(funnel.includes("AI Travel Planner")&&funnel.includes("quickReplies")&&funnel.includes("/api/v50/agent")&&funnel.includes("cards.slice"))
      :v50?(funnel.includes("Travel Agent")&&funnel.includes("quickReplies")&&funnel.includes("/api/v50/agent")&&funnel.includes("solutions.map"))
      :v40?(funnel.includes("Travel Agent")&&funnel.includes("nextQuestion")&&funnel.includes("Destination reveal")&&funnel.includes("/api/escape/solve-v42"))
      :funnel.includes('type Stage="feel"|"when"|"reality"|"solving"|"results"'),
  "active discovery must keep guided understanding and a real inventory-backed engine"
);
expect(
  v50Family?funnel.includes("/api/v50/hero-media")&&funnel.includes("heroMedia"):funnel.includes("mode=aerial"),
  "active discovery must keep sourced destination imagery"
);
expect(parser.includes('if(v==null)return null')&&parser.includes('if(!raw)return null')&&parser.includes('parsed!=null&&parsed>0?parsed:null'),"blank/zero feed prices must map to unknown, never 0 EUR");
expect(priceMigration.includes("price is not null and price>0 then price")&&priceMigration.includes("full_price is not null and full_price>0 then full_price")&&!priceMigration.includes("currency is not null and trim(currency)<>'' then price"),"stay RPC must preserve positive price even when feed currency is blank");
expect(
  v54
    ? (builder.includes("extra_images")&&builder.includes("cinematicFrames")&&builder.includes("AERIAL")&&builder.includes("inventory media"))
    : (v50Family||v40)?(builder.includes("stayImages")&&builder.includes("extra_images")&&builder.includes("mode=aerial"))
             :(builder.includes("mode=aerial")&&builder.includes("setInterval")&&builder.includes("stayImages")),
  "destination and stay sourced-photo cinematic system must remain wired"
);
expect(
  v54
    ? (builder.includes("n&&n>0")&&builder.includes("Τιμή στον πάροχο"))
    : (builder.includes('price!=null&&price>0')||builder.includes('offer.price!=null&&offer.price>0')),
  "UI must show a feed price only when positive"
);
expect(
  (v50Family||v40)?(builder.includes("unlocked")&&builder.includes("/api/guide/email")&&builder.includes("offer.trackingUrl"))
             :(builder.includes('stage==="email"')&&builder.includes('stage==="unlocked"')),
  "affiliate handoff must stay behind successful email unlock"
);
expect(local.includes("Tripadvisor")&&local.includes("Google Places")&&local.includes("Foursquare")&&local.includes("OpenStreetMap"),"360 local intelligence needs multi-source providers plus open-data fallback");
expect(local.includes("sampleSize")&&local.includes("aiScore")&&local.includes("INSUFFICIENT")&&local.includes("hidden until at least 3 responses exist"),"first-party AI Guest Signal must remain sample-gated");
expect(research.includes("getLocalIntelligenceV38")&&research.includes('release:"V38"'),"destination research route must keep V38 local intelligence truth layer");
expect(guide.includes("QRCode")&&guide.includes("addUriLink")&&guide.includes("offer.trackingUrl")&&guide.includes("360° DISCLOSURE"),"Escape Book PDF must contain QR, clickable exact tracking link and disclosure");
expect(email.includes("loadV8StayOffers")&&email.includes("affiliate link")&&email.includes("escape-book-"),"email delivery must re-resolve the exact offer and disclose affiliate handoff");
expect(feedback.includes("trip_not_completed")&&feedback.includes("travel_escape_feedback")&&feedback.includes("went:true"),"first-party feedback must be post-trip and explicit");
expect(
  skill.includes("Truth and evidence")
  &&skill.includes("Commercial payout")
  &&skill.includes("real provider/user-owned source assets")
  &&(v50Family?agent.includes("assessStayAvailabilityV20")&&agent.includes("trackingUrl:offer.trackingUrl"):true),
  "current V50/V44 design contract must preserve price truth, evidence truth and commercial independence"
);

if(failures.length){console.error("V38/V50 truth-cinematic compatibility smoke FAILED\n- "+failures.join("\n- "));process.exit(1)}
console.log(`V38_TRUTH_CONTRACTS_OK active=${v54?"V54":v50?"V50":v40?"V40":"V38"} media=sourced local=multi-source price=truthful feedback=sample-gated pdf=affiliate-disclosed email=gated`);
