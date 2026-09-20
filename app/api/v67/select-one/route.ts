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
 intelligenceScore:number;seasonalScore:number;priceScore:number;demandSignal:number;
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
 return{
  origin:"Athens",startDate:input.start,endDate:input.end,month:"flexible",nights,budget:Math.max(150,input.budget),
  moods:[mood],travelerType:input.traveler,language:"el",distancePreference:input.noCar?"nearby":"any",pace:input.pace??"balanced",
  hotelStyle:"any",avoid:input.quiet?"crowds":"none",entryMode:"idea",groupSize:input.traveler==="solo"?1:input.traveler==="couple"?2:4,
  desiredEnergy:input.mood==="adventure"?"stimulating":input.mood==="relax"?"restore":"balanced",
  socialPreference:input.mood==="nightlife"?"lively":input.quiet?"quiet":"balanced",noveltyPreference:"balanced",
  mustHave:input.terrain==="sea"?"sea":input.terrain==="mountain"?"nature":input.mood==="culture"?"culture":input.mood==="nightlife"?"nightlife":"none",
  dateFlexibility:"fixed",transportMode:input.noCar?"no-car":"any",stayLocationPreference:input.noCar?"central":"balanced",
  tripText:[input.userText,input.region,input.terrain,input.mood].filter(Boolean).join(" · ").slice(0,700)
 };
}

export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>null) as Input|null;
  if(!body||!iso.test(body.start)||!iso.test(body.end)||Date.parse(body.end)<=Date.parse(body.start)||!Number.isFinite(Number(body.budget))){
   return NextResponse.json({ok:false,error:"invalid_selection_request"},{status:400});
  }
  const origin=new URL(request.url).origin;
  const mapUrl=new URL("/api/v50/map-stays",origin);
  mapUrl.searchParams.set("limit","2000");mapUrl.searchParams.set("start",body.start);
  const [mapResponse,catalog]=await Promise.all([
   fetch(mapUrl,{cache:"no-store",signal:AbortSignal.timeout(12000)}),
   loadV8DestinationCatalog()
  ]);
  if(!mapResponse.ok)throw new Error("inventory_unavailable");
  const mapPayload=await mapResponse.json() as {products?:Product[];mapIntelligence?:{demandIsDiscriminating?:boolean}};
  const products=(mapPayload.products??[]).filter(p=>p.destinationSlug&&p.trackingUrl&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude));
  const bySlug=new Map(catalog.map(d=>[d.slug,d]));
  const nights=Math.max(1,Math.round((Date.parse(body.end+"T00:00:00Z")-Date.parse(body.start+"T00:00:00Z"))/DAY));
  const nightlyCeiling=Math.max(45,body.budget/nights);
  const region=norm(body.region??"");
  const demandOn=mapPayload.mapIntelligence?.demandIsDiscriminating===true;
  const filtered=products.filter(p=>{
   const d=bySlug.get(p.destinationSlug!);if(!d)return false;
   if(p.validTo&&p.validTo<body.end)return false;
   if(p.price!=null&&p.price>nightlyCeiling*1.15)return false;
   if(region){
    const blob=norm([d.nameEl,d.nameEn,d.regionGroup,p.location,p.address,...d.aliases].join(" "));
    if(!blob.includes(region))return false;
   }
   if(body.mapCenter){
    const radius=Math.max(25,Math.min(400,Number(body.mapCenter.radiusKm??160)));
    if(hav(body.mapCenter.lat,body.mapCenter.lon,p.latitude,p.longitude)>radius)return false;
   }
   return true;
  });
  const pool=(filtered.length?filtered:products).map(p=>{
   const d=bySlug.get(p.destinationSlug!)!;
   let fit=55;
   const tags=new Set(d.tags);
   if(body.terrain==="sea")fit+=(tags.has("beach")||tags.has("warmth")||/island|crete|cyclad|ionian/i.test(d.regionGroup))?25:-14;
   if(body.terrain==="mountain")fit+=(tags.has("nature")||d.seasonProfile==="mountain")?25:-16;
   if(body.terrain==="city")fit+=(tags.has("city")||tags.has("culture"))?22:-10;
   if(body.mood==="food")fit+=tags.has("food")?22:0;
   if(body.mood==="nightlife")fit+=tags.has("nightlife")?26:0;
   if(body.mood==="culture")fit+=tags.has("culture")?24:0;
   if(body.mood==="nature")fit+=tags.has("nature")?24:0;
   if(body.mood==="romantic")fit+=tags.has("romantic")?22:0;
   if(body.mood==="relax")fit+=tags.has("relax")?22:0;
   if(body.quiet)fit-=Math.max(0,d.crowdLevel-2)*7;
   fit+=(d.travelerFit[body.traveler]??0)*18;
   if(body.noCar)fit+=d.directFromAthens?8:-6;
   const priceBudget=p.price==null?55:clamp(100-Math.max(0,(p.price-nightlyCeiling*.72)/Math.max(1,nightlyCeiling)) * 100);
   const spatial=body.mapCenter?clamp(100-hav(body.mapCenter.lat,body.mapCenter.lon,p.latitude,p.longitude)/2):65;
   const pre=clamp(fit)*.27+(p.seasonalScore??50)*.22+(demandOn?(p.demandSignal??50)*.12:0)+(p.priceScore??50)*.16+priceBudget*.13+spatial*.10;
   return{p,d,pre,fit:clamp(fit),priceBudget,spatial};
  }).sort((a,b)=>b.pre-a.pre);

  const trip=baseTrip(body),shortlist=pool.filter((x,i,a)=>a.findIndex(y=>y.p.destinationSlug===x.p.destinationSlug)===i).slice(0,12);
  const weatherRows=await Promise.all(shortlist.map(async row=>{
   const weather=await getDailyTripWeatherV25(trip,row.p.latitude,row.p.longitude).catch(()=>null);
   return{...row,weather};
  }));
  const ranked=weatherRows.map(row=>{
   const weatherScore=row.weather?.score??50;
   const score=clamp(Math.round(
    row.fit*.22+
    (row.p.seasonalScore??50)*.18+
    weatherScore*.22+
    (demandOn?(row.p.demandSignal??50):50)*(demandOn?.10:.02)+
    (row.p.priceScore??50)*.12+
    row.priceBudget*.10+
    row.spatial*.06
   ));
   return{...row,weatherScore,score};
  }).sort((a,b)=>b.score-a.score);
  const winner=ranked[0];
  if(!winner)return NextResponse.json({ok:false,error:"no_eligible_inventory"},{status:404});
  return NextResponse.json({
   ok:true,
   winner:{
    score:winner.score,
    destination:{slug:winner.d.slug,name:winner.d.nameEl,nameEn:winner.d.nameEn,regionGroup:winner.d.regionGroup,latitude:winner.d.latitude,longitude:winner.d.longitude,tags:winner.d.tags,seasonProfile:winner.d.seasonProfile},
    stay:{productId:winner.p.productId,name:winner.p.name,location:winner.p.location,address:winner.p.address,latitude:winner.p.latitude,longitude:winner.p.longitude,price:winner.p.price,currency:winner.p.currency,trackingUrl:winner.p.trackingUrl,availability:winner.p.availability},
    evidence:{userFit:Math.round(winner.fit),seasonality:Math.round(winner.p.seasonalScore??0),weather:Math.round(winner.weatherScore),weatherLabel:winner.weather?.label??"No safe weather signal",demand:demandOn?Math.round(winner.p.demandSignal??0):null,value:Math.round(winner.p.priceScore??0),budgetFit:Math.round(winner.priceBudget),demandUsed:demandOn},
    why:[
      `User fit ${Math.round(winner.fit)}/100`,
      `Season ${Math.round(winner.p.seasonalScore??0)}/100`,
      `Weather ${Math.round(winner.weatherScore)}/100`,
      demandOn?`Demand ${Math.round(winner.p.demandSignal??0)}/100`:"Demand excluded: non-discriminating",
      `Value ${Math.round(winner.p.priceScore??0)}/100`
    ]
   },
   considered:{inventory:products.length,afterHardFilters:filtered.length||products.length,destinationsWeatherChecked:shortlist.length},
   trip
  },{headers:{"cache-control":"no-store","x-travel-selection":"v67-one-winner"}});
 }catch(error){
  return NextResponse.json({ok:false,error:"selection_failed",detail:process.env.NODE_ENV==="development"&&error instanceof Error?error.message:undefined},{status:503});
 }
}
