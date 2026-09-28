import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

type NearbyItem={
 id:string;name:string;category:"food"|"drink"|"activity";
 subtype:string;latitude:number;longitude:number;distanceKm:number;
 website:string|null;openingHours:string|null;cuisine:string|null;
 rating:number|null;reviewCount:number|null;provider:"Google Places"|"Foursquare"|"OpenStreetMap";
 confidence:"HIGH"|"MEDIUM"|"LOW";
};

const finite=(v:string|null)=>v!=null&&Number.isFinite(Number(v))?Number(v):null;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
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

function classify(tags:Record<string,string>|undefined){
 const amenity=tags?.amenity??"",tourism=tags?.tourism??"",natural=tags?.natural??"",historic=tags?.historic??"",leisure=tags?.leisure??"";
 if(["restaurant","fast_food","food_court","ice_cream"].includes(amenity))return{category:"food" as const,subtype:amenity};
 if(["cafe","bar","pub","biergarten","nightclub"].includes(amenity))return{category:"drink" as const,subtype:amenity};
 if(["attraction","museum","gallery","viewpoint"].includes(tourism)||natural==="beach"||historic||["park","marina"].includes(leisure))return{category:"activity" as const,subtype:tourism||natural||historic||leisure||"experience"};
 return null;
}
const pretty=(s:string)=>s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

export async function GET(request:Request){
 const u=new URL(request.url);
 const lat=finite(u.searchParams.get("lat")),lon=finite(u.searchParams.get("lon"));
 const start=(u.searchParams.get("start")??"").slice(0,10),end=(u.searchParams.get("end")??"").slice(0,10);
 if(lat==null||lon==null||lat<34||lat>42.7||lon<18.5||lon>30.5){
  return NextResponse.json({ok:false,error:"invalid_coordinates"},{status:400});
 }

 const weatherPromise=(async()=>{
  try{
   const url=new URL("https://api.open-meteo.com/v1/forecast");
   url.searchParams.set("latitude",String(lat));url.searchParams.set("longitude",String(lon));
   url.searchParams.set("timezone","Europe/Athens");
   url.searchParams.set("forecast_days","16");
   url.searchParams.set("daily","weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max");
   const r=await fetch(url,{next:{revalidate:1800},signal:AbortSignal.timeout(7000)});
   if(!r.ok)throw new Error("weather");
   const j=await r.json() as any;
   const dates:string[]=Array.isArray(j?.daily?.time)?j.daily.time:[];
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

 const googleNearby=async(category:"food"|"drink"|"activity")=>{
  const apiKey=process.env.GOOGLE_PLACES_API_KEY;if(!apiKey)return[] as NearbyItem[];
  const includedTypes=category==="food"
   ?["restaurant","cafe","bakery"]
   :category==="drink"
    ?["bar","cafe","night_club"]
    :["tourist_attraction","museum","art_gallery","park"];
  try{
   const r=await fetch("https://places.googleapis.com/v1/places:searchNearby",{
    method:"POST",
    headers:{
     "content-type":"application/json",
     "X-Goog-Api-Key":apiKey,
     "X-Goog-FieldMask":"places.id,places.displayName,places.location,places.primaryType,places.rating,places.userRatingCount,places.websiteUri,places.regularOpeningHours"
    },
    body:JSON.stringify({
     includedTypes,maxResultCount:20,rankPreference:"POPULARITY",
     languageCode:"el",
     locationRestriction:{circle:{center:{latitude:lat,longitude:lon},radius:5000}}
    }),
    cache:"no-store",signal:AbortSignal.timeout(9000)
   });
   if(!r.ok)throw new Error("google_places");
   const j=await r.json() as any,rows=Array.isArray(j?.places)?j.places:[];
   return rows.flatMap((p:any)=>{
    const pLat=Number(p?.location?.latitude),pLon=Number(p?.location?.longitude);
    const name=String(p?.displayName?.text??"").trim();
    if(!name||!Number.isFinite(pLat)||!Number.isFinite(pLon))return[];
    const rating=Number(p?.rating),reviews=Number(p?.userRatingCount);
    return [{
     id:`g-${p.id??name}`,name,category,
     subtype:pretty(String(p?.primaryType??category)),
     latitude:pLat,longitude:pLon,distanceKm:Number(km(lat,lon,pLat,pLon).toFixed(1)),
     website:typeof p?.websiteUri==="string"?p.websiteUri:null,
     openingHours:Array.isArray(p?.regularOpeningHours?.weekdayDescriptions)?p.regularOpeningHours.weekdayDescriptions.join(" · "):null,
     cuisine:null,
     rating:Number.isFinite(rating)?Math.max(0,Math.min(5,rating)):null,
     reviewCount:Number.isFinite(reviews)?Math.max(0,Math.round(reviews)):null,
     provider:"Google Places" as const,confidence:"HIGH" as const
    }];
   }).filter((x:NearbyItem)=>x.distanceKm<=5);
  }catch{return[] as NearbyItem[]}
 };

 const foursquareNearby=async(category:"food"|"drink"|"activity")=>{
  const apiKey=process.env.FOURSQUARE_API_KEY;if(!apiKey)return[] as NearbyItem[];
  const query=category==="food"?"restaurant":category==="drink"?"bar cafe":"attraction museum";
  try{
   const u=new URL("https://places-api.foursquare.com/places/search");
   u.searchParams.set("ll",`${lat},${lon}`);u.searchParams.set("radius","5000");
   u.searchParams.set("query",query);u.searchParams.set("limit","20");
   u.searchParams.set("fields","fsq_place_id,name,latitude,longitude,categories,rating,stats,website,hours");
   const r=await fetch(u,{headers:{Authorization:`Bearer ${apiKey}`,"X-Places-Api-Version":"2025-06-17",accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw new Error("foursquare");
   const j=await r.json() as any,rows=Array.isArray(j?.results)?j.results:[];
   return rows.flatMap((p:any)=>{
    const pLat=Number(p?.latitude??p?.geocodes?.main?.latitude),pLon=Number(p?.longitude??p?.geocodes?.main?.longitude);
    const name=String(p?.name??"").trim();if(!name||!Number.isFinite(pLat)||!Number.isFinite(pLon))return[];
    const raw=Number(p?.rating),reviews=Number(p?.stats?.total_ratings);
    const subtype=String(p?.categories?.[0]?.name??category);
    return [{
     id:`f-${p.fsq_place_id??name}`,name,category,subtype,
     latitude:pLat,longitude:pLon,distanceKm:Number(km(lat,lon,pLat,pLon).toFixed(1)),
     website:typeof p?.website==="string"?p.website:null,openingHours:null,cuisine:null,
     rating:Number.isFinite(raw)?Math.max(0,Math.min(5,raw/2)):null,
     reviewCount:Number.isFinite(reviews)?Math.max(0,Math.round(reviews)):null,
     provider:"Foursquare" as const,confidence:"MEDIUM" as const
    }];
   }).filter((x:NearbyItem)=>x.distanceKm<=5);
  }catch{return[] as NearbyItem[]}
 };

 const osmNearby=async()=>{
  try{
   const radius=5000;
   const q=`[out:json][timeout:14];
   (
    nwr(around:${radius},${lat},${lon})["amenity"~"restaurant|fast_food|food_court|ice_cream|cafe|bar|pub|biergarten|nightclub"];
    nwr(around:${radius},${lat},${lon})["tourism"~"attraction|museum|gallery|viewpoint"];
    nwr(around:${radius},${lat},${lon})["natural"="beach"];
    nwr(around:${radius},${lat},${lon})["historic"];
    nwr(around:${radius},${lat},${lon})["leisure"~"park|marina"];
   );
   out center tags 180;`;
   const r=await fetch("https://overpass-api.de/api/interpreter",{
    method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},
    body:new URLSearchParams({data:q}),next:{revalidate:3600},signal:AbortSignal.timeout(12000)
   });
   if(!r.ok)throw new Error("nearby");
   const j=await r.json() as any,out:NearbyItem[]=[];
   for(const el of Array.isArray(j?.elements)?j.elements:[]){
    const tags=(el.tags??{}) as Record<string,string>,kind=classify(tags);if(!kind)continue;
    const name=(tags.name??tags["name:el"]??tags["name:en"]??"").trim();if(!name)continue;
    const pLat=Number(el.lat??el.center?.lat),pLon=Number(el.lon??el.center?.lon);
    if(!Number.isFinite(pLat)||!Number.isFinite(pLon))continue;
    out.push({
     id:`o-${el.type}-${el.id}`,name,category:kind.category,subtype:pretty(kind.subtype),
     latitude:pLat,longitude:pLon,distanceKm:Number(km(lat,lon,pLat,pLon).toFixed(1)),
     website:tags.website??tags["contact:website"]??null,openingHours:tags.opening_hours??null,
     cuisine:tags.cuisine?pretty(tags.cuisine):null,rating:null,reviewCount:null,
     provider:"OpenStreetMap",confidence:"LOW"
    });
   }
   return out;
  }catch{return[] as NearbyItem[]}
 };

 const nearbyPromise=(async()=>{
  const [gFood,gDrink,gActivity,fFood,fDrink,fActivity,osm]=await Promise.all([
   googleNearby("food"),googleNearby("drink"),googleNearby("activity"),
   foursquareNearby("food"),foursquareNearby("drink"),foursquareNearby("activity"),
   osmNearby()
  ]);
  const merge=(category:"food"|"drink"|"activity",primary:NearbyItem[],secondary:NearbyItem[])=>{
   const rows=[...primary,...secondary,...osm.filter(x=>x.category===category)],seen=new Set<string>(),out:NearbyItem[]=[];
   for(const x of rows){
    const key=x.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
    if(!key||seen.has(key))continue;seen.add(key);out.push(x);
   }
   return out.sort((a,b)=>{
    const ar=a.rating??0,br=b.rating??0,ac=Math.log10((a.reviewCount??0)+10),bc=Math.log10((b.reviewCount??0)+10);
    const as=ar*12+ac*7-a.distanceKm*1.8+(a.provider==="Google Places"?6:a.provider==="Foursquare"?3:0);
    const bs=br*12+bc*7-b.distanceKm*1.8+(b.provider==="Google Places"?6:b.provider==="Foursquare"?3:0);
    return bs-as;
   }).slice(0,8);
  };
  const food=merge("food",gFood,fFood),drink=merge("drink",gDrink,fDrink),activities=merge("activity",gActivity,fActivity);
  return{
   food,drink,activities,
   sources:{
    google:{food:gFood.length,drink:gDrink.length,activities:gActivity.length},
    foursquare:{food:fFood.length,drink:fDrink.length,activities:fActivity.length},
    openStreetMap:{total:osm.length}
   },
   confidence:(food.length&&drink.length&&activities.length)?"HIGH":(food.length||drink.length||activities.length)?"MEDIUM":"LOW"
  };
 })();

 const [weather,nearby]=await Promise.all([weatherPromise,nearbyPromise]);
 return NextResponse.json({ok:true,generatedAt:new Date().toISOString(),radiusKm:4.5,weather,nearby},{
  headers:{"cache-control":"public, s-maxage=900, stale-while-revalidate=3600","x-travel-nearby":"v50-open-data"}
 });
}
