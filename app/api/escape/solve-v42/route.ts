import { runTravelOrchestratorV26 } from "@/lib/ai/travel-orchestrator-v26";
import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { createLLMRequestBudgetV16 } from "@/lib/ai/model-router-v9";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { parseTripRequest } from "@/lib/validation/trip";
import { V8_DIMENSIONS,type V8Dimension,type V8Recommendation,type V8Destination } from "@/lib/decision/v8-types";
import { seasonalStayFit } from "@/lib/decision/stay-seasonality-v66";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const INVENTORY_URL=process.env.SUPABASE_ESCAPE_INVENTORY_V42_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/escape-inventory-v42";
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const norm=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

type Row={destination_slug:string;destination_name_el:string;destination_name_en:string;source_product_id:string;property_name:string;city:string|null;address:string|null;distance_km:number|null;description:string|null;semantic_text:string|null;product_semantic_vector:string|null;semantic_tags:string[]|null;traveler_fit:Record<string,number>|null;evidence_score:number|null;source_category:string|null;program_id:string|null;tracking_url:string;image_url:string|null;thumb_url:string|null;in_stock:boolean|null;availability:string|null;valid_from:string|null;valid_to:string|null;currency:string|null;price:number|null;full_price:number|null;discount:number|null;demand_proxy:number|null;raw:Record<string,unknown>|null};

const concept:Record<V8Dimension,RegExp>={
 romantic:/romantic|boutique|suite|private|honeymoon|couple|adult.?only|ρομαντ|ζευγ|ιδιωτ|σουιτ|μπουτικ/,
 relax:/quiet|calm|relax|spa|wellness|peace|tranquil|slow|ησυχ|χαλαρ|ηρεμ|ευεξ/,
 food:/food|restaurant|taverna|gastr|breakfast|wine|local produce|φαγη|γαστρ|ταβερν|κρασι|πρωιν/,
 culture:/historic|history|museum|old town|heritage|culture|archae|ιστορ|μουσει|παλια πολη|πολιτισ|αρχαιο/,
 city:/city|centre|center|downtown|urban|old town|κεντρ|πολη|αστικ/,
 nature:/nature|mountain|forest|garden|rural|trail|view|φυσ|βουνο|δασ|κηπ|μονοπατ|θεα/,
 beach:/beach|sea|seaside|coast|waterfront|shore|παραλ|θαλασσ|ακτ/,
 adventure:/hiking|diving|cycling|kayak|activity|adventure|πεζοπορ|καταδυ|ποδηλα|δραστηρ/,
 nightlife:/nightlife|bar|club|party|cocktail|βραδ|μπαρ|κλαμπ|παρτι/,
 family:/family|kids|children|apartment|kitchen|playground|οικογεν|παιδ|διαμερισ|κουζιν/,
 luxury:/luxury|5 star|5\*|premium|deluxe|resort|πολυτελ|πενταστερ/,
 value:/value|deal|discount|offer|budget|cheap|sale|προσφορ|εκπτωσ|οικονομ/,
 warmth:/sun|warm|beach|pool|sea|summer|ηλιο|ζεστ|παραλ|πισιν|θαλασσ/,
 wellness:/spa|wellness|sauna|massage|thermal|hamam|hammam|ευεξ|μασαζ|θερμ/,
 short_break:/airport|port|central|transfer|easy access|parking|αεροδρομ|λιμαν|κεντρ|ευκολ|παρκ/,
 shoulder_season:/year round|all year|spring|autumn|winter|off season|ολο το χρονο|ανοιξ|φθινοπ|χειμων/
};

async function inventory(start:string,end:string){
 const u=new URL(INVENTORY_URL);u.searchParams.set("start_date",start);u.searchParams.set("end_date",end);u.searchParams.set("limit","900");
 const r=await fetch(u,{headers:{"user-agent":"travel-ai-v60"},cache:"no-store",signal:AbortSignal.timeout(6500)});
 if(!r.ok)throw new Error(`inventory_${r.status}`);
 const p=await r.json() as {offers?:Row[]};return p.offers??[];
}

function parseVector(raw:string|null|undefined){if(!raw)return[];return raw.replace(/^\[/,"").replace(/\]$/,"").split(",").map(Number).filter(Number.isFinite).slice(0,V8_DIMENSIONS.length)}
function cosine(a:number[],b:number[]){if(a.length!==b.length||!a.length)return 0;let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return aa&&bb?dot/(Math.sqrt(aa)*Math.sqrt(bb)):0}
function userVector(weights:Record<string,number>){return V8_DIMENSIONS.map(d=>Math.max(0,Number(weights[d]??0)))}
function semanticStayScore(row:Row,weights:Record<string,number>){
 const uv=userVector(weights),pv=parseVector(row.product_semantic_vector),vectorScore=pv.length===V8_DIMENSIONS.length?clamp(cosine(uv,pv)*100):0;
 const text=norm(`${row.property_name} ${row.description??""} ${row.semantic_text??""} ${row.city??""} ${row.address??""}`);let weighted=0,total=0;const matched:string[]=[];
 for(const [d,re] of Object.entries(concept) as [V8Dimension,RegExp][]) {const w=Math.max(0,Number(weights[d]??0));if(w<=0)continue;total+=w;if(re.test(text)){weighted+=w;matched.push(d)}}
 const lexical=total?clamp(38+(weighted/total)*62):50;const semantic=vectorScore>0?clamp(vectorScore*.78+lexical*.22):lexical;
 return{score:semantic,matched:[...(row.semantic_tags??[]),...matched].filter((v,i,a)=>a.indexOf(v)===i),vectorScore,lexicalScore:lexical};
}
function validWindow(row:Row,start:string,end:string){
 const s=Date.parse(start+"T00:00:00Z"),e=Date.parse(end+"T00:00:00Z");
 const f=row.valid_from?Date.parse(row.valid_from.slice(0,10)+"T00:00:00Z"):NaN,t=row.valid_to?Date.parse(row.valid_to.slice(0,10)+"T00:00:00Z"):NaN;
 return row.in_stock!==false&&(!Number.isFinite(f)||f<=s)&&(!Number.isFinite(t)||t>=e);
}
function stayRank(row:Row,weights:Record<string,number>,traveler:string,budget:number,startDate:string,destination:V8Destination|null){
 const sem=semanticStayScore(row,weights),price=Number(row.price??0),ratio=price>0?price/Math.max(1,budget):0;
 const valueScore=price<=0?52:ratio<=.35?94:ratio<=.65?84:ratio<=1?72:ratio<=1.3?58:42;
 const locationScore=row.distance_km==null?58:row.distance_km<=3?96:row.distance_km<=10?86:row.distance_km<=25?70:54;
 const travelerFit=clamp(Number(row.traveler_fit?.[traveler]??.5)*100),evidenceScore=clamp(Number(row.evidence_score??0)*100);
 const month=Math.max(1,Math.min(12,Number(startDate.slice(5,7))||1));
 const seasonal=seasonalStayFit({month,propertyName:row.property_name,description:row.description,category:row.source_category,location:[row.city,row.address].filter(Boolean).join(" "),destinationSlug:row.destination_slug,destinationSeasonProfile:destination?.seasonProfile,destinationTags:destination?.tags});
 return{score:clamp(sem.score*.34+travelerFit*.13+valueScore*.14+locationScore*.10+evidenceScore*.12+seasonal.score*.17),sem,valueScore,locationScore,travelerFit,evidenceScore,seasonal};
}
function solution(rec:V8Recommendation,x:{row:Row;ranked:ReturnType<typeof stayRank>},language:string){
 const destinationScore=Math.round(rec.score),stayScore=Math.round(x.ranked.score),valueScore=Math.round(x.ranked.valueScore),locationScore=Math.round(x.ranked.locationScore);
 return{
  score:destinationScore,destinationScore,stayScore,valueScore,locationScore,
  destination:{slug:rec.slug,name:language==="en"?rec.destinationEn:rec.destination,nameEn:rec.destinationEn,tags:rec.tags},
  stay:{sourceProductId:x.row.source_product_id,propertyName:x.row.property_name,trackingUrl:x.row.tracking_url,imageUrl:x.row.image_url??x.row.thumb_url,price:x.row.price,currency:x.row.currency,distanceKm:x.row.distance_km,availability:x.row.availability,semanticScore:Math.round(x.ranked.sem.score),vectorScore:Math.round(x.ranked.sem.vectorScore),travelerFit:Math.round(x.ranked.travelerFit),valueScore,evidenceScore:Math.round(x.ranked.evidenceScore),seasonalFit:{score:x.ranked.seasonal.score,band:x.ranked.seasonal.band,reason:x.ranked.seasonal.reason}},
  matchedSignals:x.ranked.sem.matched.slice(0,5),
  reason:rec.why
 };
}

export async function POST(request:Request){
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);
 if(!parsed.success)return Response.json({ok:false,error:"invalid_trip"},{status:400});
 const trip=parsed.data,sessionId=crypto.randomUUID();
 const [canonical,intent,rows,catalog]=await Promise.all([
  runTravelOrchestratorV26(trip,sessionId),
  interpretIntentV8(trip,createLLMRequestBudgetV16()),
  inventory(trip.startDate,trip.endDate),
  loadV8DestinationCatalog()
 ]);
 const known=new Set(catalog.map(d=>d.slug)),catalogBySlug=new Map(catalog.map(d=>[d.slug,d])),byDestination=new Map<string,Row[]>();
 for(const row of rows){if(!known.has(row.destination_slug)||!validWindow(row,trip.startDate,trip.endDate))continue;const group=byDestination.get(row.destination_slug)??[];group.push(row);byDestination.set(row.destination_slug,group)}
 const solutions=[];
 for(const rec of canonical.recommendations){
  const offers=byDestination.get(rec.slug)??[];if(!offers.length)continue;
  const ranked=offers.map(row=>({row,ranked:stayRank(row,intent.weights as Record<string,number>,trip.travelerType,trip.budget,trip.startDate,catalogBySlug.get(rec.slug)??null)})).sort((a,b)=>b.ranked.score-a.ranked.score);
  const top=ranked[0];if(!top)continue;
  solutions.push({rank:solutions.length+1,...solution(rec,top,trip.language??"el")});
  if(solutions.length>=8)break;
 }
 return Response.json({ok:true,version:60,generatedAt:new Date().toISOString(),intentSource:intent.source,intentSummary:intent.summary,knowledgeMode:"canonical-destination-first",inventoryChecked:rows.length,solutionCount:solutions.length,solutions},{headers:{"cache-control":"no-store","x-travel-engine":"v60-canonical-fallback"}});
}
