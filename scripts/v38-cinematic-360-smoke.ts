import fs from "node:fs";
import path from "node:path";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");
const home=read("app/page.tsx"),homeEn=read("app/en/page.tsx"),funnel=read("components/v38-escape-funnel.tsx"),builder=read("components/v38-escape-builder-client.tsx"),parser=read("lib/data/destination-v8.ts"),local=read("lib/data/local-intelligence-v38.ts"),research=read("app/api/escape/research/route.ts"),guide=read("app/api/guide/route.ts"),email=read("app/api/guide/email/route.ts"),feedback=read("app/api/escape/feedback/route.ts"),skill=read("skills/web-design/SKILL.md");
const failures:string[]=[];const expect=(ok:boolean,message:string)=>{if(!ok)failures.push(message)};
expect(home.includes("V38EscapeFunnel")&&homeEn.includes("V38EscapeFunnel"),"V38 funnel must own GR + EN home routes");
expect(funnel.includes('type Stage="feel"|"when"|"reality"|"solving"|"results"'),"discovery must be reduced to the three-decision funnel plus solve/results");
expect(funnel.includes("worlds")&&funnel.includes("date-opportunities")&&funnel.includes("Optional fine-tune")||funnel.includes("Προαιρετικό fine-tune"),"visual-world, date-opportunity and optional tuning UX must be present");
expect(funnel.includes("solve-v36/stream")&&funnel.includes("Build this 360° escape"),"V38 must retain the real dual-pass engine and 360 handoff");
expect(parser.includes('if(v==null)return null')&&parser.includes('if(!raw)return null')&&parser.includes('parsed!=null&&parsed>0?parsed:null'),"blank/zero feed prices must map to unknown, never 0 EUR");
expect(builder.includes("mode=aerial")&&builder.includes("setInterval")&&builder.includes("stayImages")&&builder.includes("Cinematic motion"),"destination and stay sourced-photo cinematic motion must be wired");
expect(builder.includes('price!=null&&price>0')||builder.includes('offer.price!=null&&offer.price>0'),"UI must show a feed price only when positive");
expect(builder.includes('stage==="email"')&&builder.includes('stage==="unlocked"')&&builder.indexOf('stage==="unlocked"')<builder.lastIndexOf('affiliate_offer_opened'),"affiliate handoff must stay behind successful email unlock");
expect(local.includes("Tripadvisor")&&local.includes("Google Places")&&local.includes("Foursquare")&&local.includes("OpenStreetMap"),"360 local intelligence needs multi-source providers plus open-data fallback");
expect(local.includes("sampleSize")&&local.includes("aiScore")&&local.includes("INSUFFICIENT")&&local.includes("sampleSize>=3")||local.includes("n>=3"),"first-party AI Guest Signal must be sample-gated");
expect(research.includes("getLocalIntelligenceV38")&&research.includes('release:"V38"'),"destination research route must return V38 local intelligence");
expect(guide.includes("QRCode")&&guide.includes("addUriLink")&&guide.includes("offer.trackingUrl")&&guide.includes("360° DISCLOSURE"),"Escape Book PDF must contain QR, clickable exact tracking link and disclosure");
expect(email.includes("loadV8StayOffers")&&email.includes("affiliate link")&&email.includes("escape-book-"),"email delivery must re-resolve the exact offer and disclose affiliate handoff");
expect(feedback.includes("trip_not_completed")&&feedback.includes("travel_escape_feedback")&&feedback.includes("went:true"),"first-party feedback must be post-trip and explicit");
expect(skill.includes("travel-ai-v38-web-design")&&skill.includes("Reference ledger")&&skill.includes("AI Guest Signal")&&skill.includes("Price truth"),"project-specific V38 web-design skill must codify research and truth rules");
if(failures.length){console.error("V38 cinematic 360 smoke FAILED\n- "+failures.join("\n- "));process.exit(1)}
console.log("V38_CINEMATIC_360_OK funnel=3-decisions media=sourced-aerial+stay-motion local=multi-source price=truthful feedback=sample-gated pdf=clickable-affiliate email=gated");
