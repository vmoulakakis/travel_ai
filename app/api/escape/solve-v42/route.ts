import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { createLLMRequestBudgetV16 } from "@/lib/ai/model-router-v9";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { parseTripRequest } from "@/lib/validation/trip";
import type { V8Dimension } from "@/lib/decision/v8-types";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const INVENTORY_URL=process.env.SUPABASE_ESCAPE_INVENTORY_V42_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/escape-inventory-v42";
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const norm=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

type Row={destination_slug:string;destination_name_el:string;destination_name_en:string;source_product_id:string;property_name:string;city:string|null;address:string|null;distance_km:number|null;description:string|null;semantic_text:string|null;source_category:string|null;program_id:string|null;tracking_url:string;image_url:string|null;thumb_url:string|null;in_stock:boolean|null;availability:string|null;valid_from:string|null;valid_to:string|null;currency:string|null;price:number|null;full_price:number|null;discount:number|null;demand_proxy:number|null;raw:Record<string,unknown>|null};

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
 const r=await fetch(u,{headers:{"user-agent":"travel-ai-v42"},cache:"no-store",signal:AbortSignal.timeout(6500)});
 if(!r.ok)throw new Error(`inventory_${r.status}`);
 const p=await r.json() as {offers?:Row[]};return p.offers??[];
}

function semanticStayScore(text:string,weights:Record<string,number>){
 let weighted=0,total=0,matched:string[]=[];
 for(const [d,re] of Object.entries(concept) as [V8Dimension,RegExp][]{const w=Math.max(0,Number(weights[d]??0));if(w<=0)continue;total+=w;if(re.test(text)){weighted+=w;matched.push(d);}}
 return {score:total?clamp(38+(weighted/total)*62):50,matched};
}

export async function POST(request:Request){
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);
 if(!parsed.success)return Response.json({ok:false,error:"invalid_trip"},{status:400});
 const trip=parsed.data;
 const [catalog,intent,rows]=await Promise.all([
   loadV8DestinationCatalog(),
   interpretIntentV8(trip,createLLMRequestBudgetV16()),
   inventory(trip.startDate,trip.endDate)
 ]);
 const destBySlug=new Map(catalog.map(d=>[d.slug,d]));
 const scored=rows.map(row=>{
   const dest=destBySlug.get(row.destination_slug);if(!dest)return null;
   const hay=norm(`${row.property_name} ${row.description??""} ${row.semantic_text??""} ${row.city??""} ${row.address??""}`);
   const sem=semanticStayScore(hay,intent.weights as Record<string,number>);
   let dSum=0,dWeight=0;dest.tags.forEach(tag=>{const w=Math.max(0,Number(intent.weights[tag]??0));dSum+=w;dWeight+=1});
   const destinationScore=clamp(42+(dWeight?dSum/dWeight:0)*34 + (dest.monthFit[Math.max(0,Number(trip.startDate.slice(5,7))-1)]??60)*.16);
   const price=Number(row.price??0),budget=Math.max(1,trip.budget),ratio=price>0?price/budget:0;
   const valueScore=price<=0?52:ratio<=.35?94:ratio<=.65?84:ratio<=1?72:ratio<=1.3?58:42;
   const locationScore=row.distance_km==null?58:row.distance_km<=3?96:row.distance_km<=10?86:row.distance_km<=25?70:54;
   const evidenceScore=clamp(55+(row.image_url||row.thumb_url?12:0)+(row.description?8:0)+(row.semantic_text?12:0)+(row.availability?7:0));
   const stayScore=clamp(sem.score*.48+valueScore*.20+locationScore*.16+evidenceScore*.16);
   const combined=clamp(destinationScore*.47+stayScore*.53);
   return {row,dest,combined,stayScore,destinationScore,valueScore,locationScore,semanticScore:sem.score,matched:sem.matched};
 }).filter((x):x is NonNullable<typeof x>=>Boolean(x));

 const bestByDestination=new Map<string,typeof scored>();
 for(const item of scored){const arr=bestByDestination.get(item.dest.slug)??[];arr.push(item);bestByDestination.set(item.dest.slug,arr)}
 const solutions=[...bestByDestination.values()].map(items=>items.sort((a,b)=>b.combined-a.combined)[0]).sort((a,b)=>b.combined-a.combined).slice(0,8).map((x,i)=>({
   rank:i+1,score:Math.round(x.combined),destination:{slug:x.dest.slug,name:trip.language==="en"?x.dest.nameEn:x.dest.nameEl,nameEn:x.dest.nameEn,tags:x.dest.tags},stay:{sourceProductId:x.row.source_product_id,propertyName:x.row.property_name,trackingUrl:x.row.tracking_url,imageUrl:x.row.image_url??x.row.thumb_url,price:x.row.price,currency:x.row.currency,distanceKm:x.row.distance_km,availability:x.row.availability,semanticScore:Math.round(x.semanticScore),valueScore:Math.round(x.valueScore)},matchedSignals:x.matched.slice(0,5),reason:trip.language==="en"?`Strong match for ${x.matched.slice(0,3).join(", ")||"your overall brief"}; ranked with destination fit, real stay inventory, value and travel friction.`:`Δυνατή αντιστοίχιση σε ${x.matched.slice(0,3).join(", ")||"το συνολικό brief σου"}· συνδυάζει fit προορισμού, πραγματικό inventory, αξία και ταλαιπωρία.`
 }));
 return Response.json({ok:true,version:42,generatedAt:new Date().toISOString(),intentSource:intent.source,intentSummary:intent.summary,inventoryChecked:rows.length,solutionCount:solutions.length,solutions},{headers:{"cache-control":"no-store","x-travel-engine":"v42-single-fetch-semantic"}});
}
