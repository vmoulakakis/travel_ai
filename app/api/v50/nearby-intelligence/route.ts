import {NextResponse} from "next/server";
import {createLLMRequestBudgetV16,generateJsonWithRoutingV16} from "@/lib/ai/model-router-v9";
import {commonsAreaPhotos,enrichTopPages,researchQueries} from "@/lib/research/keyless-web-search-v51";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

type NearbyItem={
 id:string;name:string;category:"food"|"drink"|"activity";
 subtype:string;latitude:number|null;longitude:number|null;distanceKm:number|null;
 website:string|null;openingHours:string|null;cuisine:string|null;
 rating:number|null;reviewCount:number|null;
 provider:"Google Places"|"Foursquare"|"OpenStreetMap"|"Web Research";
 sourceUrl?:string|null;
 confidence:"HIGH"|"MEDIUM"|"LOW";
};
type AreaSummary={
 verdict:string;
 food:string;
 drink:string;
 activities:string;
 weather:string;
 tradeoff:string;
 confidence:"HIGH"|"MEDIUM"|"LOW";
};

const finite=(v:string|null)=>v!=null&&Number.isFinite(Number(v))?Number(v):null;
const clean=(v:string|null,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const rad=(n:number)=>n*Math.PI/180;
const km=(aLat:number,aLon:number,bLat:number,bLon:number)=>{
 const dLat=rad(bLat-aLat),dLon=rad(bLon-aLon);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
};
const weatherLabel=(code:number)=>{
 if(code===0)return"Καθαρός ουρανός";
 if(code<=3)return"Λίγες νεφώσεις";
 if(code===45||code===48)return"Ομίχλη";
 if(code>=51&&code<=57)return"Ψιχάλα";
 if(code>=61&&code<=67)return"Βροχή";
 if(code>=71&&code<=77)return"Χιόνι";
 if(code>=80&&code<=82)return"Μπόρες";
 if(code>=85&&code<=86)return"Χιονόπτωση";
 if(code>=95)return"Καταιγίδες";
 return"Μεταβλητός καιρός";
};
const icon=(code:number)=>code===0?"☀️":code<=3?"🌤️":code===45||code===48?"🌫️":code>=95?"⛈️":code>=71&&code<=77?"🌨️":code>=61?"🌧️":"🌥️";
const pretty=(s:string)=>s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const dedupe=(rows:NearbyItem[])=>{
 const seen=new Set<string>(),out:NearbyItem[]=[];
 for(const x of rows){
  const key=x.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
  if(!key||seen.has(key))continue;
  seen.add(key);out.push(x);
 }
 return out;
};
const rank=(rows:NearbyItem[])=>[...rows].sort((a,b)=>{
 const ar=a.rating??0,br=b.rating??0;
 const ac=Math.log10((a.reviewCount??0)+10),bc=Math.log10((b.reviewCount??0)+10);
 const ap=a.provider==="Google Places"?8:a.provider==="Foursquare"?4:a.provider==="Web Research"?2:0;
 const bp=b.provider==="Google Places"?8:b.provider==="Foursquare"?4:b.provider==="Web Research"?2:0;
 const ad=a.distanceKm??12,bd=b.distanceKm??12;
 return (br*13+bc*7-bd*1.6+bp)-(ar*13+ac*7-ad*1.6+ap);
});

function classify(tags:Record<string,string>|undefined){
 const amenity=tags?.amenity??"",tourism=tags?.tourism??"",natural=tags?.natural??"",historic=tags?.historic??"",leisure=tags?.leisure??"";
 if(["restaurant","fast_food","food_court","ice_cream"].includes(amenity))return{category:"food" as const,subtype:amenity};
 if(["cafe","bar","pub","biergarten","nightclub"].includes(amenity))return{category:"drink" as const,subtype:amenity};
 if(["attraction","museum","gallery","viewpoint"].includes(tourism)||natural==="beach"||historic||["park","marina"].includes(leisure))return{category:"activity" as const,subtype:tourism||natural||historic||leisure||"experience"};
 return null;
}

export async function GET(request:Request){
 const u=new URL(request.url);
 const lat=finite(u.searchParams.get("lat")),lon=finite(u.searchParams.get("lon"));
 const start=clean(u.searchParams.get("start"),10),end=clean(u.searchParams.get("end"),10);
 const hotelName=clean(u.searchParams.get("name"),180),areaName=clean(u.searchParams.get("area"),180);
 if(lat==null||lon==null||lat<34||lat>42.7||lon<18.5||lon>30.5){
  return NextResponse.json({ok:false,error:"invalid_coordinates"},{status:400});
 }

 const weatherPromise=(async()=>{
  try{
   const url=new URL("https://api.open-meteo.com/v1/forecast");
   url.searchParams.set("latitude",String(lat));url.searchParams.set("longitude",String(lon));
   url.searchParams.set("timezone","Europe/Athens");url.searchParams.set("forecast_days","16");
   url.searchParams.set("daily","weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max");
   const r=await fetch(url,{next:{revalidate:1800},signal:AbortSignal.timeout(7000)});
   if(!r.ok)throw new Error("weather");
   const j=await r.json() as any,dates:string[]=Array.isArray(j?.daily?.time)?j.daily.time:[];
   const wanted=dates.map((d,i)=>({d,i})).filter(x=>(!start||x.d>=start)&&(!end||x.d<=end));
   const selection=wanted.length?wanted:dates.slice(0,4).map((d,i)=>({d,i}));
   const days=selection.map(({d,i})=>{
    const code=Number(j.daily.weather_code?.[i]??0);
    return{date:d,code,icon:icon(code),label:weatherLabel(code),
     maxC:Number(j.daily.temperature_2m_max?.[i]),minC:Number(j.daily.temperature_2m_min?.[i]),
     rainPct:Number(j.daily.precipitation_probability_max?.[i]),windKmh:Number(j.daily.wind_speed_10m_max?.[i])};
   });
   const avg=(key:"maxC"|"minC"|"rainPct"|"windKmh")=>days.length?days.reduce((s,x)=>s+(Number.isFinite(x[key])?x[key]:0),0)/days.length:null;
   return{status:wanted.length?"trip-window":"nearest-forecast",days,summary:days.length?{
    label:days.map(x=>x.label).sort((a,b)=>days.filter(y=>y.label===b).length-days.filter(y=>y.label===a).length)[0],
    maxC:avg("maxC"),minC:avg("minC"),rainPct:avg("rainPct"),windKmh:avg("windKmh")
   }:null};
  }catch{return{status:"unavailable",days:[],summary:null}}
 })();

 const googleNearby=async(category:"food"|"drink"|"activity",radius:number)=>{
  const apiKey=process.env.GOOGLE_PLACES_API_KEY;if(!apiKey)return[] as NearbyItem[];
  const includedTypes=category==="food"
   ?["restaurant","cafe","bakery"]
   :category==="drink"
    ?["bar","cafe","night_club"]
    :["tourist_attraction","museum","art_gallery","park"];
  try{
   const r=await fetch("https://places.googleapis.com/v1/places:searchNearby",{
    method:"POST",headers:{
     "content-type":"application/json","X-Goog-Api-Key":apiKey,
     "X-Goog-FieldMask":"places.id,places.displayName,places.location,places.primaryType,places.rating,places.userRatingCount,places.websiteUri,places.regularOpeningHours"
    },
    body:JSON.stringify({includedTypes,maxResultCount:20,rankPreference:"POPULARITY",languageCode:"el",
     locationRestriction:{circle:{center:{latitude:lat,longitude:lon},radius}}}),
    cache:"no-store",signal:AbortSignal.timeout(9000)
   });
   if(!r.ok)return[] as NearbyItem[];
   const j=await r.json() as any,rows=Array.isArray(j?.places)?j.places:[];
   return rows.flatMap((p:any)=>{
    const pLat=Number(p?.location?.latitude),pLon=Number(p?.location?.longitude),name=String(p?.displayName?.text??"").trim();
    if(!name||!Number.isFinite(pLat)||!Number.isFinite(pLon))return[];
    const distance=km(lat,lon,pLat,pLon),rating=Number(p?.rating),reviews=Number(p?.userRatingCount);
    return [{id:`g-${p.id??name}`,name,category,subtype:pretty(String(p?.primaryType??category)),
     latitude:pLat,longitude:pLon,distanceKm:Number(distance.toFixed(1)),
     website:typeof p?.websiteUri==="string"?p.websiteUri:null,
     openingHours:Array.isArray(p?.regularOpeningHours?.weekdayDescriptions)?p.regularOpeningHours.weekdayDescriptions.join(" · "):null,
     cuisine:null,rating:Number.isFinite(rating)?Math.max(0,Math.min(5,rating)):null,
     reviewCount:Number.isFinite(reviews)?Math.max(0,Math.round(reviews)):null,
     provider:"Google Places" as const,confidence:"HIGH" as const}];
   });
  }catch{return[] as NearbyItem[]}
 };

 const googleText=async(category:"food"|"drink"|"activity",radius:number)=>{
  const apiKey=process.env.GOOGLE_PLACES_API_KEY;if(!apiKey)return[] as NearbyItem[];
  const subject=category==="food"?"best restaurants":category==="drink"?"best bars cafes":"top attractions things to do";
  const context=[subject,areaName,hotelName].filter(Boolean).join(" near ");
  try{
   const r=await fetch("https://places.googleapis.com/v1/places:searchText",{
    method:"POST",headers:{
     "content-type":"application/json","X-Goog-Api-Key":apiKey,
     "X-Goog-FieldMask":"places.id,places.displayName,places.location,places.primaryType,places.rating,places.userRatingCount,places.websiteUri"
    },
    body:JSON.stringify({textQuery:context||subject,languageCode:"el",maxResultCount:20,
     locationBias:{circle:{center:{latitude:lat,longitude:lon},radius}}}),
    cache:"no-store",signal:AbortSignal.timeout(9000)
   });
   if(!r.ok)return[] as NearbyItem[];
   const j=await r.json() as any,rows=Array.isArray(j?.places)?j.places:[];
   return rows.flatMap((p:any)=>{
    const pLat=Number(p?.location?.latitude),pLon=Number(p?.location?.longitude),name=String(p?.displayName?.text??"").trim();
    if(!name||!Number.isFinite(pLat)||!Number.isFinite(pLon))return[];
    const distance=km(lat,lon,pLat,pLon),rating=Number(p?.rating),reviews=Number(p?.userRatingCount);
    if(distance>radius/1000+5)return[];
    return [{id:`gt-${p.id??name}`,name,category,subtype:pretty(String(p?.primaryType??category)),
     latitude:pLat,longitude:pLon,distanceKm:Number(distance.toFixed(1)),
     website:typeof p?.websiteUri==="string"?p.websiteUri:null,openingHours:null,cuisine:null,
     rating:Number.isFinite(rating)?Math.max(0,Math.min(5,rating)):null,
     reviewCount:Number.isFinite(reviews)?Math.max(0,Math.round(reviews)):null,
     provider:"Google Places" as const,confidence:"HIGH" as const}];
   });
  }catch{return[] as NearbyItem[]}
 };

 const foursquare=async(category:"food"|"drink"|"activity",radius:number)=>{
  const apiKey=process.env.FOURSQUARE_API_KEY;if(!apiKey)return[] as NearbyItem[];
  const query=category==="food"?"restaurant":category==="drink"?"bar cafe":"attraction museum";
  try{
   const url=new URL("https://places-api.foursquare.com/places/search");
   url.searchParams.set("ll",`${lat},${lon}`);url.searchParams.set("radius",String(radius));
   url.searchParams.set("query",query);url.searchParams.set("limit","20");
   url.searchParams.set("fields","fsq_place_id,name,latitude,longitude,categories,rating,stats,website,hours");
   const r=await fetch(url,{headers:{Authorization:`Bearer ${apiKey}`,"X-Places-Api-Version":"2025-06-17",accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!r.ok)return[] as NearbyItem[];
   const j=await r.json() as any,rows=Array.isArray(j?.results)?j.results:[];
   return rows.flatMap((p:any)=>{
    const pLat=Number(p?.latitude??p?.geocodes?.main?.latitude),pLon=Number(p?.longitude??p?.geocodes?.main?.longitude),name=String(p?.name??"").trim();
    if(!name||!Number.isFinite(pLat)||!Number.isFinite(pLon))return[];
    const distance=km(lat,lon,pLat,pLon),raw=Number(p?.rating),reviews=Number(p?.stats?.total_ratings);
    return [{id:`f-${p.fsq_place_id??name}`,name,category,subtype:String(p?.categories?.[0]?.name??category),
     latitude:pLat,longitude:pLon,distanceKm:Number(distance.toFixed(1)),website:typeof p?.website==="string"?p.website:null,
     openingHours:null,cuisine:null,rating:Number.isFinite(raw)?Math.max(0,Math.min(5,raw/2)):null,
     reviewCount:Number.isFinite(reviews)?Math.max(0,Math.round(reviews)):null,
     provider:"Foursquare" as const,confidence:"MEDIUM" as const}];
   });
  }catch{return[] as NearbyItem[]}
 };

 const osm=async(radius:number)=>{
  const endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
  const q=`[out:json][timeout:18];
  (
   nwr(around:${radius},${lat},${lon})["amenity"~"restaurant|fast_food|food_court|ice_cream|cafe|bar|pub|biergarten|nightclub"];
   nwr(around:${radius},${lat},${lon})["tourism"~"attraction|museum|gallery|viewpoint"];
   nwr(around:${radius},${lat},${lon})["natural"="beach"];
   nwr(around:${radius},${lat},${lon})["historic"];
   nwr(around:${radius},${lat},${lon})["leisure"~"park|marina"];
  );out center tags 260;`;
  for(const endpoint of endpoints){
   try{
    const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},body:new URLSearchParams({data:q}),cache:"no-store",signal:AbortSignal.timeout(13000)});
    if(!r.ok)continue;
    const j=await r.json() as any,out:NearbyItem[]=[];
    for(const el of Array.isArray(j?.elements)?j.elements:[]){
     const tags=(el.tags??{}) as Record<string,string>,kind=classify(tags);if(!kind)continue;
     const name=(tags.name??tags["name:el"]??tags["name:en"]??"").trim();if(!name)continue;
     const pLat=Number(el.lat??el.center?.lat),pLon=Number(el.lon??el.center?.lon);if(!Number.isFinite(pLat)||!Number.isFinite(pLon))continue;
     out.push({id:`o-${el.type}-${el.id}`,name,category:kind.category,subtype:pretty(kind.subtype),
      latitude:pLat,longitude:pLon,distanceKm:Number(km(lat,lon,pLat,pLon).toFixed(1)),website:tags.website??tags["contact:website"]??null,
      openingHours:tags.opening_hours??null,cuisine:tags.cuisine?pretty(tags.cuisine):null,rating:null,reviewCount:null,
      provider:"OpenStreetMap",confidence:"LOW"});
    }
    if(out.length)return out;
   }catch{}
  }
  return[] as NearbyItem[];
 };

 const nearbyPromise=(async()=>{
  const radii=[5000,12000,25000,40000];
  let food:NearbyItem[]=[],drink:NearbyItem[]=[],activities:NearbyItem[]=[],usedRadius=5;
  let sourceCounts={google:0,foursquare:0,osm:0};
  for(const radius of radii){
   const needFood=food.length<5,needDrink=drink.length<4,needActivities=activities.length<5;
   if(!needFood&&!needDrink&&!needActivities)break;
   const [gf,gd,ga,gtf,gtd,gta,ff,fd,fa,o]=await Promise.all([
    needFood?googleNearby("food",radius):Promise.resolve([]),
    needDrink?googleNearby("drink",radius):Promise.resolve([]),
    needActivities?googleNearby("activity",radius):Promise.resolve([]),
    needFood?googleText("food",radius):Promise.resolve([]),
    needDrink?googleText("drink",radius):Promise.resolve([]),
    needActivities?googleText("activity",radius):Promise.resolve([]),
    needFood?foursquare("food",radius):Promise.resolve([]),
    needDrink?foursquare("drink",radius):Promise.resolve([]),
    needActivities?foursquare("activity",radius):Promise.resolve([]),
    osm(radius)
   ]);
   sourceCounts.google+=gf.length+gd.length+ga.length+gtf.length+gtd.length+gta.length;
   sourceCounts.foursquare+=ff.length+fd.length+fa.length;sourceCounts.osm+=o.length;
   food=rank(dedupe([...food,...gf,...gtf,...ff,...o.filter(x=>x.category==="food")])).slice(0,8);
   drink=rank(dedupe([...drink,...gd,...gtd,...fd,...o.filter(x=>x.category==="drink")])).slice(0,8);
   activities=rank(dedupe([...activities,...ga,...gta,...fa,...o.filter(x=>x.category==="activity")])).slice(0,10);
   usedRadius=radius/1000;
  }
  return{food,drink,activities,usedRadiusKm:usedRadius,sources:sourceCounts,
   confidence:food.length>=3&&drink.length>=2&&activities.length>=3?"HIGH":food.length||drink.length||activities.length?"MEDIUM":"LOW" as const};
 })();

 const [weather,nearby,photos]=await Promise.all([weatherPromise,nearbyPromise,commonsAreaPhotos(areaName,6)]);

 type WebVenue={name:string;category:"food"|"drink"|"activity";subtype:string;rating:number|null;reviewCount:number|null;sourceUrl:string;sourceTitle:string;evidence:string;confidence:"HIGH"|"MEDIUM"|"LOW"};
 type WebResearchExtract={hotel:{name:string;rating:number|null;reviewCount:number|null;sourceUrl:string;sourceTitle:string;confidence:"HIGH"|"MEDIUM"|"LOW"}|null;venues:WebVenue[];areaNotes:string[]};
 let webResearch:WebResearchExtract|null=null;

 if(nearby.food.length<4||nearby.drink.length<3||nearby.activities.length<5){
  try{
   const cleanHotel=hotelName.replace(/\s*✦.*$/,"").replace(/\s+[–—-]\s+\d+.*$/,"").trim();
   const queries=[
    `"${cleanHotel}" "${areaName}" rating reviews`,
    `"${areaName}" best restaurants reviews`,
    `"${areaName}" restaurants Tripadvisor`,
    `"${areaName}" bars cafes nightlife`,
    `"${areaName}" things to do attractions Tripadvisor`,
    `"${areaName}" δραστηριότητες αξιοθέατα εστιατόρια καφέ`
   ].filter(x=>x.replace(/[" ]/g,"").length>5);
   const results=await researchQueries(queries,7);
   const pages=await enrichTopPages(results,8);
   const researchEvidence=JSON.stringify({
    hotel:cleanHotel,area:areaName,coordinates:{lat,lon},
    searchResults:results.slice(0,34).map(x=>({title:x.title,url:x.url,snippet:x.snippet,host:x.host,query:x.query})),
    pages:pages.map(p=>({url:p.url,title:p.title,text:p.text.slice(0,3500),jsonLd:p.jsonLd}))
   });
   const routed=await generateJsonWithRoutingV16<WebResearchExtract>({
    context:{task:"research",text:researchEvidence,deterministicConfidence:.35,forceSemantic:true,preferOpenAI:true},
    budget:createLLMRequestBudgetV16(),
    system:`You are the TravelAI web evidence extractor. Use ONLY the supplied web search results, snippets, page text and JSON-LD. Never invent a venue, rating, review count or source.
Identify the exact selected hotel when supported and extract its rating/review count only if explicitly evidenced.
Extract useful named venues for food, drink and activities in/near the requested area. A venue name must be explicitly present in the evidence. For rating/reviewCount, use null unless explicitly present in the same source evidence.
Prefer direct venue/provider pages, Tripadvisor, official tourism pages and strong local sources over generic listicles. Deduplicate aliases.
Return JSON only:
{"hotel":{"name":"","rating":4.5,"reviewCount":123,"sourceUrl":"","sourceTitle":"","confidence":"HIGH|MEDIUM|LOW"}|null,
"venues":[{"name":"","category":"food|drink|activity","subtype":"","rating":null,"reviewCount":null,"sourceUrl":"","sourceTitle":"","evidence":"short supporting phrase","confidence":"HIGH|MEDIUM|LOW"}],
"areaNotes":["evidence-grounded note"]}.
Return up to 7 food, 6 drink, 8 activity venues.`,
    prompt:researchEvidence,
    preference:"critical",
    validate:v=>{
     const allowed=(x:unknown):"HIGH"|"MEDIUM"|"LOW"=>x==="HIGH"||x==="MEDIUM"||x==="LOW"?x:"LOW";
     const rawHotel=v.hotel&&typeof v.hotel==="object"?v.hotel as Record<string,unknown>:null;
     const hotel:WebResearchExtract["hotel"]=rawHotel&&typeof rawHotel.name==="string"&&typeof rawHotel.sourceUrl==="string"
      ?{name:rawHotel.name.trim().slice(0,180),rating:Number.isFinite(Number(rawHotel.rating))?Math.max(0,Math.min(5,Number(rawHotel.rating))):null,reviewCount:Number.isFinite(Number(rawHotel.reviewCount))?Math.max(0,Math.round(Number(rawHotel.reviewCount))):null,sourceUrl:rawHotel.sourceUrl.slice(0,1000),sourceTitle:String(rawHotel.sourceTitle??"").slice(0,220),confidence:allowed(rawHotel.confidence)}
      :null;
     const venues:WebVenue[]=Array.isArray(v.venues)?v.venues.flatMap((raw:unknown)=>{
      const x=raw&&typeof raw==="object"?raw as Record<string,unknown>:null;if(!x)return[];
      const category:WebVenue["category"]|null=x.category==="food"||x.category==="drink"||x.category==="activity"?x.category:null;
      const name=typeof x.name==="string"?x.name.trim().slice(0,180):"";
      const sourceUrl=typeof x.sourceUrl==="string"?x.sourceUrl.trim().slice(0,1000):"";
      if(!category||!name||!sourceUrl)return[];
      return[{name,category,subtype:typeof x.subtype==="string"?x.subtype.trim().slice(0,100):category,rating:Number.isFinite(Number(x.rating))?Math.max(0,Math.min(5,Number(x.rating))):null,reviewCount:Number.isFinite(Number(x.reviewCount))?Math.max(0,Math.round(Number(x.reviewCount))):null,sourceUrl,sourceTitle:typeof x.sourceTitle==="string"?x.sourceTitle.trim().slice(0,220):"",evidence:typeof x.evidence==="string"?x.evidence.trim().slice(0,260):"",confidence:allowed(x.confidence)}];
     }).slice(0,21):[];
     const areaNotes=Array.isArray(v.areaNotes)?v.areaNotes.map((x:unknown)=>String(x).trim().slice(0,220)).filter(Boolean).slice(0,6):[];
     return hotel||venues.length?{hotel,venues,areaNotes}:null;
    }
   }).catch(()=>null);
   webResearch=routed?.value??null;
   if(webResearch?.venues?.length){
    const toItem=(x:WebVenue):NearbyItem=>({
     id:"web-"+Buffer.from(x.sourceUrl+x.name).toString("base64url").slice(0,40),name:x.name,category:x.category,subtype:x.subtype,
     latitude:null,longitude:null,distanceKm:null,website:x.sourceUrl,openingHours:null,cuisine:null,
     rating:x.rating,reviewCount:x.reviewCount,provider:"Web Research",sourceUrl:x.sourceUrl,confidence:x.confidence
    });
    const webRows=webResearch.venues.map(toItem);
    nearby.food=rank(dedupe([...nearby.food,...webRows.filter(x=>x.category==="food")])).slice(0,8);
    nearby.drink=rank(dedupe([...nearby.drink,...webRows.filter(x=>x.category==="drink")])).slice(0,8);
    nearby.activities=rank(dedupe([...nearby.activities,...webRows.filter(x=>x.category==="activity")])).slice(0,10);
    nearby.confidence=nearby.food.length>=3&&nearby.activities.length>=3?"HIGH":"MEDIUM";
   }
  }catch{}
 }

 let areaSummary:AreaSummary|null=null;
 if(nearby.food.length||nearby.drink.length||nearby.activities.length){
  try{
   const evidence=JSON.stringify({
    hotel:hotelName,area:areaName,start,end,weather:weather.summary,webResearch,
    food:nearby.food.slice(0,5).map(x=>({name:x.name,rating:x.rating,reviews:x.reviewCount,distanceKm:x.distanceKm,provider:x.provider})),
    drink:nearby.drink.slice(0,5).map(x=>({name:x.name,rating:x.rating,reviews:x.reviewCount,distanceKm:x.distanceKm,provider:x.provider})),
    activities:nearby.activities.slice(0,6).map(x=>({name:x.name,rating:x.rating,reviews:x.reviewCount,distanceKm:x.distanceKm,provider:x.provider}))
   });
   const routed=await generateJsonWithRoutingV16<AreaSummary>({
    context:{task:"research",text:evidence,deterministicConfidence:.85,forceSemantic:true},
    budget:createLLMRequestBudgetV16(),
    system:"Είσαι TravelAI area analyst. Αξιολόγησε ΜΟΝΟ από τα παρεχόμενα evidence. Μην εφευρίσκεις venues, ratings ή καιρό. Δώσε σύντομο πρακτικό verdict στα ελληνικά. JSON only: {\"verdict\":\"max 220 chars\",\"food\":\"max 160\",\"drink\":\"max 160\",\"activities\":\"max 180\",\"weather\":\"max 140\",\"tradeoff\":\"max 140\",\"confidence\":\"HIGH|MEDIUM|LOW\"}.",
    prompt:evidence,
    validate:v=>{
     const confidence=v.confidence==="HIGH"||v.confidence==="MEDIUM"||v.confidence==="LOW"?v.confidence:"MEDIUM";
     const trim=(x:unknown,n:number)=>typeof x==="string"?x.trim().slice(0,n):"";
     const verdict=trim(v.verdict,220);if(!verdict)return null;
     return{verdict,food:trim(v.food,160),drink:trim(v.drink,160),activities:trim(v.activities,180),weather:trim(v.weather,140),tradeoff:trim(v.tradeoff,140),confidence};
    }
   }).catch(()=>null);
   areaSummary=routed?.value??null;
  }catch{}
 }

 return NextResponse.json({
  ok:true,generatedAt:new Date().toISOString(),radiusKm:nearby.usedRadiusKm,
  hotel:{name:hotelName||null,area:areaName||null,latitude:lat,longitude:lon,webRating:webResearch?.hotel??null},
  weather,nearby,areaSummary,webResearch,photos,
  completeness:{
   food:nearby.food.length,drink:nearby.drink.length,activities:nearby.activities.length,
   sufficient:nearby.food.length>=3&&nearby.activities.length>=3,
   message:nearby.food.length||nearby.drink.length||nearby.activities.length
    ?`Area intelligence expanded automatically to ${nearby.usedRadiusKm} km.`
    :"Configured place providers and keyless web research returned no usable evidence; treat as a research incident, never as proof that the area has no options."
  }
 },{headers:{"cache-control":"public, s-maxage=900, stale-while-revalidate=3600","x-travel-nearby":"v51-area-intelligence"}});
}
