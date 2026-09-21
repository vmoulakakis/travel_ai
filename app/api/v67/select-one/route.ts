import { NextResponse } from "next/server";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { getDailyTripWeatherV25 } from "@/lib/data/trip-weather-v25";
import type { TripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

type Product={
 productId:string;placeId:string;name:string;location:string;address:string;latitude:number;longitude:number;
 price:number|null;currency:string;availability:string;validTo:string|null;trackingUrl:string;destinationSlug:string|null;
 intelligenceScore:number;seasonalScore:number;priceScore:number;demandSignal:number;imageUrl?:string|null;
};
type Input={
 start:string;end:string;budget:number;traveler:"solo"|"couple"|"family"|"friends";
 terrain?:"any"|"sea"|"mountain"|"city";mood?:"relax"|"romantic"|"food"|"culture"|"nightlife"|"nature"|"adventure";
 region?:string;pace?:"slow"|"balanced"|"full";noCar?:boolean;quiet?:boolean;valueFirst?:boolean;userText?:string;
 mapCenter?:{lat:number;lon:number;radiusKm?:number}|null;
};
const iso=/^\d{4}-\d{2}-\d{2}$/;
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
const DAY=86_400_000;
const norm=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
const hav=(a:number,b:number,c:number,d:number)=>{const R=6371,r=(x:number)=>x*Math.PI/180,dp=r(c-a),dl=r(d-b),h=Math.sin(dp/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(h))};

function baseTrip(input:Input):TripRequest{
 const nights=Math.max(1,Math.round((Date.parse(input.end+"T00:00:00Z")-Date.parse(input.start+"T00:00:00Z"))/DAY));
 const mood=input.mood==="nightlife"?"city":input.mood??(input.terrain==="mountain"?"nature":input.terrain==="sea"?"relax":"culture");
 return{origin:"Athens",startDate:input.start,endDate:input.end,month:"flexible",nights,budget:Math.max(150,input.budget),moods:[mood],travelerType:input.traveler,language:"el",distancePreference:input.noCar?"nearby":"any",pace:input.pace??"balanced",hotelStyle:"any",avoid:input.quiet?"crowds":"none",entryMode:"idea",groupSize:input.traveler==="solo"?1:input.traveler==="couple"?2:4,desiredEnergy:input.mood==="adventure"?"stimulating":input.mood==="relax"?"restore":"balanced",socialPreference:input.mood==="nightlife"?"lively":input.quiet?"quiet":"balanced",noveltyPreference:"balanced",mustHave:input.terrain==="sea"?"sea":input.terrain==="mountain"?"nature":input.mood==="culture"?"culture":input.mood==="nightlife"?"nightlife":"none",dateFlexibility:"fixed",transportMode:input.noCar?"no-car":"any",stayLocationPreference:input.noCar?"central":"balanced",tripText:[input.userText,input.region,input.terrain,input.mood].filter(Boolean).join(" · ").slice(0,700)};
}

function horizonWeights(start:string,demandOn:boolean){
 const days=Math.max(0,Math.round((Date.parse(start+"T00:00:00Z")-Date.now())/DAY));
 if(days<=14)return{user:.20,season:.14,weather:.23,demand:demandOn ? .12 : 0,value:.11,budget:.10,spatial:.10,label:"near-term"};
 if(days<=45)return{user:.22,season:.19,weather:.17,demand:demandOn ? .11 : 0,value:.11,budget:.10,spatial:.10,label:"mid-term"};
 return{user:.24,season:.26,weather:.08,demand:demandOn ? .10 : 0,value:.11,budget:.11,spatial:.10,label:"seasonal-forecast"};
}

function roleFor(index:number,score:number,season:number,weather:number,demand:number,value:number,demandOn:boolean){
 if(index===0)return{role:"best-match",label:"Best Match",color:"gold"};
 const best=Math.max(season,weather,demandOn?demand:0,value);
 if(best===season&&season>=72)return{role:"opportunity",label:"Seasonal Opportunity",color:"green"};
 if(best===weather&&weather>=72)return{role:"opportunity",label:"Weather Opportunity",color:"blue"};
 if(demandOn&&best===demand&&demand>=72)return{role:"opportunity",label:"Demand Opportunity",color:"purple"};
 if(best===value&&value>=72)return{role:"opportunity",label:"Value Opportunity",color:"orange"};
 return{role:"smart-alternative",label:"Smart Alternative",color:"cyan"};
}

export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>null) as Input|null;
  if(!body||!iso.test(body.start)||!iso.test(body.end)||Date.parse(body.end)<=Date.parse(body.start)||!Number.isFinite(Number(body.budget)))return NextResponse.json({ok:false,error:"invalid_selection_request"},{status:400});
  const origin=new URL(request.url).origin,mapUrl=new URL("/api/v50/map-stays",origin);
  mapUrl.searchParams.set("limit","2000");mapUrl.searchParams.set("start",body.start);
  const [mapResponse,catalog]=await Promise.all([fetch(mapUrl,{cache:"no-store",signal:AbortSignal.timeout(12000)}),loadV8DestinationCatalog()]);
  if(!mapResponse.ok)throw new Error("inventory_unavailable");
  const mapPayload=await mapResponse.json() as {products?:Product[];mapIntelligence?:{demandIsDiscriminating?:boolean}};
  const products=(mapPayload.products??[]).filter(p=>p.destinationSlug&&p.trackingUrl&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude));
  const bySlug=new Map(catalog.map(d=>[d.slug,d])),nights=Math.max(1,Math.round((Date.parse(body.end+"T00:00:00Z")-Date.parse(body.start+"T00:00:00Z"))/DAY)),nightlyCeiling=Math.max(45,body.budget/nights),region=norm(body.region??""),demandOn=mapPayload.mapIntelligence?.demandIsDiscriminating===true;
  const filtered=products.filter(p=>{const d=bySlug.get(p.destinationSlug!);if(!d)return false;if(p.validTo&&p.validTo<body.end)return false;if(p.price!=null&&p.price>nightlyCeiling*1.2)return false;if(region){const blob=norm([d.nameEl,d.nameEn,d.regionGroup,p.location,p.address,...d.aliases].join(" "));if(!blob.includes(region))return false}return true});
  const source=filtered.length?filtered:products,trip=baseTrip(body),weights=horizonWeights(body.start,demandOn);
  const scored=source.map(p=>{const d=bySlug.get(p.destinationSlug!)!;let fit=55;const tags=new Set(d.tags);
   if(body.terrain==="sea")fit+=(tags.has("beach")||tags.has("warmth")||/island|crete|cyclad|ionian/i.test(d.regionGroup))?25:-14;
   if(body.terrain==="mountain")fit+=(tags.has("nature")||d.seasonProfile==="mountain")?25:-16;
   if(body.terrain==="city")fit+=(tags.has("city")||tags.has("culture"))?22:-10;
   if(body.mood==="food")fit+=tags.has("food")?22:0;if(body.mood==="nightlife")fit+=tags.has("nightlife")?26:0;if(body.mood==="culture")fit+=tags.has("culture")?24:0;if(body.mood==="nature")fit+=tags.has("nature")?24:0;if(body.mood==="romantic")fit+=tags.has("romantic")?22:0;if(body.mood==="relax")fit+=tags.has("relax")?22:0;
   if(body.quiet)fit-=Math.max(0,d.crowdLevel-2)*7;fit+=(d.travelerFit[body.traveler]??0)*18;if(body.noCar)fit+=d.directFromAthens?8:-6;
   const budgetFit=p.price==null?55:clamp(100-Math.max(0,(p.price-nightlyCeiling*.72)/Math.max(1,nightlyCeiling))*100);
   const spatial=body.mapCenter?clamp(100-hav(body.mapCenter.lat,body.mapCenter.lon,p.latitude,p.longitude)/2):65;
   return{p,d,fit:clamp(fit),budgetFit,spatial};
  });
  const byDestination=new Map<string,typeof scored>();
  for(const row of scored){const a=byDestination.get(row.d.slug)??[];a.push(row);byDestination.set(row.d.slug,a)}
  const representatives=[...byDestination.values()].map(rows=>rows.sort((a,b)=>(b.p.intelligenceScore??0)-(a.p.intelligenceScore??0))[0]).sort((a,b)=>(b.p.intelligenceScore??0)-(a.p.intelligenceScore??0)).slice(0,12);
  const weatherRows=await Promise.all(representatives.map(async row=>({...row,weather:await getDailyTripWeatherV25(trip,row.p.latitude,row.p.longitude).catch(()=>null)})));
  const ranked=weatherRows.map(row=>{const weather=row.weather?.score??50,season=row.p.seasonalScore??50,demand=demandOn?(row.p.demandSignal??50):50,value=row.p.priceScore??50;
   const raw=row.fit*weights.user+season*weights.season+weather*weights.weather+demand*weights.demand+value*weights.value+row.budgetFit*weights.budget+row.spatial*weights.spatial;
   const normalizer=weights.user+weights.season+weights.weather+weights.demand+weights.value+weights.budget+weights.spatial;
   return{...row,weatherScore:weather,score:clamp(Math.round(raw/normalizer)),season,demand,value};
  }).sort((a,b)=>b.score-a.score).slice(0,8);

  const candidates=ranked.map((row,index)=>{const role=roleFor(index,row.score,row.season,row.weatherScore,row.demand,row.value,demandOn);const stays=(byDestination.get(row.d.slug)??[]).sort((a,b)=>(b.p.intelligenceScore??0)-(a.p.intelligenceScore??0)).slice(0,5).map((s,i)=>({productId:s.p.productId,name:s.p.name,location:s.p.location,address:s.p.address,latitude:s.p.latitude,longitude:s.p.longitude,price:s.p.price,currency:s.p.currency,availability:s.p.availability,imageUrl:s.p.imageUrl??null,trackingUrl:s.p.trackingUrl,role:i===0?"recommended":i===1?"best-value":i===2?"best-location":"alternative"}));
   const evidence={userFit:Math.round(row.fit),seasonality:Math.round(row.season),weather:Math.round(row.weatherScore),weatherLabel:row.weather?.label??"Weather confidence limited",demand:demandOn?Math.round(row.demand):null,value:Math.round(row.value),budgetFit:Math.round(row.budgetFit),spatial:Math.round(row.spatial),demandUsed:demandOn};
   const why=[`User fit ${evidence.userFit}/100`,`Season ${evidence.seasonality}/100`,`Weather ${evidence.weather}/100`,demandOn?`Demand ${evidence.demand}/100`:"Demand excluded: non-discriminating",`Value ${evidence.value}/100`];
   return{score:row.score,role:role.role,roleLabel:role.label,color:role.color,size:Math.max(24,Math.min(52,24+(row.score-55)*.72)),destination:{slug:row.d.slug,name:row.d.nameEl,nameEn:row.d.nameEn,regionGroup:row.d.regionGroup,latitude:row.d.latitude,longitude:row.d.longitude,tags:row.d.tags,seasonProfile:row.d.seasonProfile},heroImage:stays.find(s=>s.imageUrl)?.imageUrl??null,evidence,why,tradeoff:body.quiet&&row.d.crowdLevel>=3?"Μπορεί να έχει περισσότερη κίνηση από όσο ζήτησες στις ώρες αιχμής.":row.spatial<60?"Είναι πιο μακριά από το map focus σου, αλλά κερδίζει σε άλλα signals.":"Δεν είναι το #1 σε κάθε signal· είναι ισχυρό λόγω συνολικής ισορροπίας.",stays};
  });
  return NextResponse.json({ok:true,candidates,trip,weights,considered:{inventory:products.length,afterHardFilters:source.length,destinationsWeatherChecked:representatives.length},horizon:weights.label},{headers:{"cache-control":"no-store","x-travel-selection":"v68-map-candidates"}});
 }catch(error){return NextResponse.json({ok:false,error:"selection_failed",detail:process.env.NODE_ENV==="development"&&error instanceof Error?error.message:undefined},{status:503})}
}
