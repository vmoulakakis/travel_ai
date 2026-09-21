import { createLLMRequestBudgetV16,generateJsonWithRoutingV16 } from "@/lib/ai/model-router-v9";
import { getBookingStayRatingV68 } from "@/lib/data/booking-demand-v30";

export type ReviewProviderV39="Google Places"|"Tripadvisor"|"Booking.com"|"Foursquare"|"AI Guest Signal";
export interface StayRatingV39{provider:ReviewProviderV39;rating:number;scale:number;reviewCount:number|null;confidence:"HIGH"|"MEDIUM"|"LOW";}
export interface StayReviewSampleV39{provider:"Google Places"|"Tripadvisor";rating:number|null;author:string|null;text:string;publishedAt:string|null;}
export interface StayReviewIntelligenceV39{
 status:"live"|"partial"|"unavailable";
 propertyName:string;
 generatedAt:string;
 providers:ReviewProviderV39[];
 ratings:StayRatingV39[];
 samples:StayReviewSampleV39[];
 positives:string[];
 watchouts:string[];
 summary:string;
 aiGuestSignal:{score:number;sampleSize:number;avgRating:number|null;recommendRate:number|null}|null;
 travelAiScore:{score:number;sourceCount:number;reviewCount:number;confidence:"HIGH"|"MEDIUM"|"LOW";label:string}|null;
 disclosure:string;
}

type Args={propertyName:string;sourceProductId:string;destinationSlug:string;destinationName:string;latitude:number|null;longitude:number|null;language:"el"|"en"};
const clean=(v:unknown,max=900)=>typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,max):"";
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const norm=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
const stop=new Set(["hotel","hotels","resort","resorts","spa","suites","suite","apartments","apartment","rooms","room","the","and","by","4","5"]);
function tokens(v:string){return norm(v).split(/\s+/).filter(x=>x.length>1&&!stop.has(x))}
function nameFit(expected:string,candidate:string){const a=new Set(tokens(expected)),b=new Set(tokens(candidate));if(!a.size||!b.size)return 0;const common=[...a].filter(x=>b.has(x)).length;return Math.max(common/Math.min(a.size,b.size),common/new Set([...a,...b]).size)}
function clamp5(v:number){return Math.max(0,Math.min(5,v))}

async function google(args:Args){
 const key=process.env.GOOGLE_PLACES_API_KEY;if(!key)return null;
 try{
  const body:any={textQuery:`${args.propertyName}, ${args.destinationName}`,languageCode:args.language==="el"?"el":"en",maxResultCount:5};
  if(args.latitude!=null&&args.longitude!=null)body.locationBias={circle:{center:{latitude:args.latitude,longitude:args.longitude},radius:12000}};
  const r=await fetch("https://places.googleapis.com/v1/places:searchText",{method:"POST",headers:{"content-type":"application/json","X-Goog-Api-Key":key,"X-Go-FieldMask":"places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.reviews"},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(7000)});if(!r.ok)return null;
  const p=await r.json() as any,rows=Array.isArray(p.places)?p.places:[];let best:any=null,bestScore=.52;for(const row of rows){const score=nameFit(args.propertyName,clean(row?.displayName?.text,180));if(score>bestScore){best=row;bestScore=score}}if(!best)return null;
  const rating=num(best.rating),reviewCount=num(best.userRatingCount),reviews:Array<any>=Array.isArray(best.reviews)?best.reviews:[];
  return{rating:rating==null?null:clamp5(rating),reviewCount:reviewCount==null?null:Math.max(0,Math.round(reviewCount)),samples:reviews.slice(0,5).flatMap(row=>{const text=clean(row?.text?.text??row?.originalText?.text,850);if(!text)return[];return[{provider:"Google Places" as const,rating:num(row.rating),author:clean(row?.authorAttribution?.displayName,100)||null,text,publishedAt:clean(row?.publishTime,80)||null}]})};
 }catch{return null}
}

const TA="https://api.content.tripadvisor.com/api/v1";
async function taFetch(path:string,params:Record<string,string>,timeout=6500){const key=process.env.TRIPADVISOR_API_KEY;if(!key)throw new Error();const u=new URL(`${TA}${path}`);u.searchParams.set("key",key);for(const[k,v]of Object.entries(params))if(v)u.searchParams.set(k,v);const r=await fetch(u,{headers:{accept:"application/json",referer:process.env.TRIPADVISOR_REFERER||process.env.NEXT_PUBLIC_SITE_URL||"https://travel-ai-lovat-psi.vercel.app"},cache:"no-store",signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error();return await r.json() as any}
async function tripadvisor(args:Args){if(!process.env.TRIPADVISOR_API_KEY)return null;try{const search=await taFetch("/location/search",{searchQuery:args.propertyName,category:"hotels",latLong:args.latitude!=null&&args.longitude!=null?`${args.latitude},${args.longitude}`:"",language:args.language},6500),rows=Array.isArray(search.data)?search.data:[];let best:any=null,bestScore=.52;for(const row of rows){const score=nameFit(args.propertyName,clean(row?.name,180));if(score>bestScore){best=row;bestScore=score}}const id=best?.location_id?String(best.location_id):"";if(!id)return null;const[details,reviews]=await Promise.all([taFetch(`/location/${encodeURIComponent(id)}/details`,{language:args.language,currency:"EUR"},5500).catch(()=>null),taFetch(`/location/${encodeURIComponent(id)}/reviews`,{language:args.language,limit:"5"},5500).catch(()=>null)]),rating=num(details?.rating),reviewCount=num(details?.num_reviews),reviewRows=Array.isArray(reviews?.data)?reviews.data:[];return{rating:rating==null?null:clamp5(rating),reviewCount:reviewCount==null?null:Math.max(0,Math.round(reviewCount)),samples:reviewRows.slice(0,5).flatMap((row:any)=>{const text=clean(row?.text??row?.review_text,850);if(!text)return[];return[{provider:"Tripadvisor" as const,rating:num(row?.rating),author:clean(row?.user?.username??row?.user?.display_name,100)||null,text,publishedAt:clean(row?.published_date??row?.travel_date,80)||null}]})}}catch{return null}}

async function foursquare(args:Args){const key=process.env.FOURSQUARE_API_KEY;if(!key||args.latitude==null||args.longitude==null)return null;try{const u=new URL("https://places-api.foursquare.com/places/search");u.searchParams.set("ll",`${args.latitude},${args.longitude}`);u.searchParams.set("radius","12000");u.searchParams.set("query",args.propertyName);u.searchParams.set("limit","5");u.searchParams.set("fields","fsq_place_id,name,rating,stats");const r=await fetch(u,{headers:{Authorization:`Bearer ${key}`,"X-Places-Api-Version":"2025-06-17",accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(6000)});if(!r.ok)return null;const p=await r.json() as any,rows=Array.isArray(p.results)?p.results:[];let best:any=null,bestScore=.55;for(const row of rows){const score=nameFit(args.propertyName,clean(row?.name,180));if(score>bestScore){best=row;bestScore=score}}const raw=num(best?.rating);if(raw==null)return null;return{rating:clamp5(raw/2),reviewCount:num(best?.stats?.total_ratings)}}catch{return null}}

async function guestSignal(args:Args){const base=(process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL)?.replace(/\/$/,""),key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!base||!key)return null;try{const r=await fetch(`${base}/rest/v1/rpc/get_ai_guest_signal_v38`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({p_destination_slug:args.destinationSlug,p_subject_kind:"stay",p_subject_key:args.sourceProductId}),cache:"no-store",signal:AbortSignal.timeout(4500)});if(!r.ok)return null;const rows=await r.json() as any[],x=rows?.[0];const sampleSize=Math.max(0,Math.round(num(x?.sample_size)??0)),score=num(x?.ai_score);if(sampleSize<3||score==null)return null;return{score:Math.max(0,Math.min(100,score)),sampleSize,avgRating:num(x?.avg_rating),recommendRate:num(x?.recommend_rate)}}catch{return null}}

const themes:[string,string[]][]=[
 ["θέα / τοποθεσία",["view","location","θέα","τοποθεσία","scenery","mountain","sea"]],
 ["καθαριότητα",["clean","cleanliness","spotless","καθαρό","καθαριότητα"]],
 ["πρωινό / φαγητό",["breakfast","food","restaurant","πρωινό","φαγητό"]],
 ["προσωπικό / εξυπηρέτηση",["staff","service","host","friendly","προσωπικό","εξυπηρέτηση"]],
 ["ησυχία / ύπνος",["quiet","peaceful","sleep","noise","noisy","ήσυχ","θόρυβ"]],
 ["δωμάτιο / άνεση",["room","bed","comfort","spacious","small room","δωμάτι","κρεβάτι","άνε"]],
 ["parking / πρόσβαση",["parking","access","drive","road","πάρκινγκ","πρόσβαση"]],
 ["spa / πισίνα",["spa","pool","sauna","πισίνα"]]
];
function fallbackSummary(samples:StayReviewSampleV39[],lang:"el"|"en"){const positive=new Map<string,number>(),negative=new Map<string,number>();for(const s of samples){const t=norm(s.text),isNeg=(s.rating??5)<=3;for(const[label,keys]of themes)if(keys.some(k=>t.includes(norm(k))))(isNeg?negative:positive).set(label,(isNeg?negative:positive).get(label)!+1||1)}const top=(m:Map<string,number>)=>[...m].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,4),p=top(positive),w=top(negative);return{positives:p,watchouts:w,summary:lang==="el"?(p.length?`Οι διαθέσιμες αξιολογήσεις ξεχωρίζουν κυρίως ${p.join(", ")}. ${w.length?`Τα συχνότερα σημεία προσοχής είναι ${w.join(", ")}.`:"Δεν προκύπτει επαναλαμβανόμενο αρνητικό θέμα από το μικρό διαθέσιμο δείγμα."}`:`Δεν υπάρχουν αρκετά review snippets για ασφαλές θεματικό συμπέρασμα.`):(p.length?`Available reviews most often praise ${p.join(", ")}. ${w.length?`Recurring watch-outs include ${w.join(", ")}.`:"No recurring negative theme is visible in the small available sample."}`:`There are not enough review snippets for a safe thematic conclusion.`)}}
async function summarize(samples:StayReviewSampleV39[],ratings:StayRatingV39[],lang:"el"|"en"){const fallback=fallbackSummary(samples,lang);if(samples.length<2)return fallback;const budget=createLLMRequestBudgetV16(),prompt=JSON.stringify({ratings,reviews:samples.map(x=>({source:x.provider,rating:x.rating,text:x.text.slice(0,500)}))});const routed=await generateJsonWithRoutingV16<{summary:string;positives:string[];watchouts:string[]}>({context:{task:"research",text:prompt,deterministicConfidence:.45,forceSemantic:true},budget,system:`You summarize hotel review evidence. Use ONLY supplied evidence. Never invent facts. Distinguish praise from complaints. Output ${lang==="el"?"Greek":"English"} JSON only: {"summary":"max 320 chars","positives":["max 5 short themes"],"watchouts":["max 4 short themes"]}.`,prompt,validate:v=>{const summary=clean(v.summary,360),positives=Array.isArray(v.positives)?v.positives.map(x=>clean(x,70)).filter(Boolean).slice(0,5):[],watchouts=Array.isArray(v.watchouts)?v.watchouts.map(x=>clean(x,70)).filter(Boolean).slice(0,4):[];return summary?{summary,positives,watchouts}:null}});return routed?.value??fallback}

function travelAiComposite(ratings:StayRatingV39[]){
 const usable=ratings.filter(x=>x.provider!=="AI Guest Signal"||((x.reviewCount??0)>=3));
 if(!usable.length)return null;
 let weighted=0,totalWeight=0,totalReviews=0;
 for(const r of usable){
  const normalized=Math.max(0,Math.min(100,(r.rating/Math.max(1,r.scale))*100));
  const confidence=r.confidence==="HIGH" ? 1 : r.confidence==="MEDIUM" ? .78 : .58;
  const volume=Math.min(1.45,.72+Math.log10(Math.max(1,(r.reviewCount??0)+1))*.18);
  const provider=r.provider==="AI Guest Signal" ? .55 : r.provider==="Foursquare" ? .75 : 1;
  const weight=confidence*volume*provider;weighted+=normalized*weight;totalWeight+=weight;totalReviews+=Math.max(0,r.reviewCount??0);
 }
 const score=Math.round(weighted/Math.max(.01,totalWeight));
 const external=usable.filter(x=>x.provider!=="AI Guest Signal").length;
 const confidence: "HIGH"|"MEDIUM"|"LOW"=external>=3&&totalReviews>=300?"HIGH":external>=2||totalReviews>=80?"MEDIUM":"LOW";
 return{score,sourceCount:usable.length,reviewCount:totalReviews,confidence,label:score>=90?"Exceptional":score>=84?"Excellent":score>=76?"Very good":score>=68?"Good":"Promising"};
}

export async function getStayReviewIntelligenceV39(args:Args):Promise<StayReviewIntelligenceV39>{const[g,t,b,f,guest]=await Promise.all([google(args),tripadvisor(args),getBookingStayRatingV68({propertyName:args.propertyName,latitude:args.latitude,longitude:args.longitude,language:args.language}),foursquare(args),guestSignal(args)]),ratings:StayRatingV39[]=[],samples:StayReviewSampleV39[]=[];if(g?.rating!=null)ratings.push({provider:"Google Places",rating:g.rating,scale:5,reviewCount:g.reviewCount,confidence:"HIGH"}),samples.push(...g.samples);if(t?.rating!=null)ratings.push({provider:"Tripadvisor",rating:t.rating,scale:5,reviewCount:t.reviewCount,confidence:"HIGH"}),samples.push(...t.samples);if(b?.rating!=null)ratings.push({provider:"Booking.com",rating:b.rating,scale:5,reviewCount:b.reviewCount,confidence:b.matchConfidence>=.82?"HIGH":"MEDIUM"});if(f?.rating!=null)ratings.push({provider:"Foursquare",rating:f.rating,scale:5,reviewCount:f.reviewCount==null?null:Math.round(f.reviewCount),confidence:"MEDIUM"});if(guest)ratings.push({provider:"AI Guest Signal",rating:guest.score,scale:100,reviewCount:guest.sampleSize,confidence:guest.sampleSize>=10?"HIGH":"MEDIUM"});const synthesis=await summarize(samples,ratings,args.language),providers=ratings.map(x=>x.provider),travelAiScore=travelAiComposite(ratings);return{status:ratings.length>=2?"live":ratings.length?"partial":"unavailable",propertyName:args.propertyName,generatedAt:new Date().toISOString(),providers,ratings,samples:samples.slice(0,8),positives:synthesis.positives,watchouts:synthesis.watchouts,summary:synthesis.summary,aiGuestSignal:guest,travelAiScore,disclosure:args.language==="el"?"Τα εξωτερικά ratings και review snippets εμφανίζονται μόνο όταν επιστρέφονται από τον ονομαζόμενο provider. Το AI συνοψίζει το διαθέσιμο evidence και δεν δημιουργεί κριτικές. Το AI Guest Signal εμφανίζεται μόνο από 3+ επιβεβαιωμένες post-trip εμπειρίες.":"External ratings and review samples appear only when returned by the named provider. AI summarizes available evidence and never invents reviews. AI Guest Signal appears only after 3+ confirmed post-trip experiences."}}


export async function getStayRatingQuickV50(args:Args){
 const[g,t,b,f,guest]=await Promise.all([google(args),tripadvisor(args),getBookingStayRatingV68({propertyName:args.propertyName,latitude:args.latitude,longitude:args.longitude,language:args.language}),foursquare(args),guestSignal(args)]);
 const ratings:StayRatingV39[]=[];
 if(g?.rating!=null)ratings.push({provider:"Google Places",rating:g.rating,scale:5,reviewCount:g.reviewCount,confidence:"HIGH"});
 if(t?.rating!=null)ratings.push({provider:"Tripadvisor",rating:t.rating,scale:5,reviewCount:t.reviewCount,confidence:"HIGH"});
 if(b?.rating!=null)ratings.push({provider:"Booking.com",rating:b.rating,scale:5,reviewCount:b.reviewCount,confidence:b.matchConfidence>=.82?"HIGH":"MEDIUM"});
 if(f?.rating!=null)ratings.push({provider:"Foursquare",rating:f.rating,scale:5,reviewCount:f.reviewCount==null?null:Math.round(f.reviewCount),confidence:"MEDIUM"});
 if(guest)ratings.push({provider:"AI Guest Signal",rating:guest.score,scale:100,reviewCount:guest.sampleSize,confidence:guest.sampleSize>=10?"HIGH":"MEDIUM"});
 const primary=ratings.find(x=>x.provider==="Google Places")
   ??ratings.find(x=>x.provider==="Tripadvisor")
   ??ratings.find(x=>x.provider==="Foursquare")
   ??ratings[0]
   ??null;
 return{status:ratings.length?"live":"unavailable" as const,primary,ratings,travelAiScore:travelAiComposite(ratings)};
}
