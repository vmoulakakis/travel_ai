import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

type NearbyItem={
 id:string;name:string;category:"food"|"drink"|"activity";
 subtype:string;latitude:number;longitude:number;distanceKm:number;
 website:string|null;openingHours:string|null;cuisine:string|null;
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

 const nearbyPromise=(async()=>{
  try{
   const radius=4500;
   const q=`[out:json][timeout:14];
   (
    nwr(around:${radius},${lat},${lon})["amenity"~"restaurant|fast_food|food_court|ice_cream|cafe|bar|pub|biergarten|nightclub"];
    nwr(around:${radius},${lat},${lon})["tourism"~"attraction|museum|gallery|viewpoint"];
    nwr(around:${radius},${lat},${lon})["natural"="beach"];
    nwr(around:${radius},${lat},${lon})["historic"];
    nwr(around:${radius},${lat},${lon})["leisure"~"park|marina"];
   );
   out center tags 140;`;
   const r=await fetch("https://overpass-api.de/api/interpreter",{
    method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},
    body:new URLSearchParams({data:q}),next:{revalidate:3600},signal:AbortSignal.timeout(12000)
   });
   if(!r.ok)throw new Error("nearby");
   const j=await r.json() as any;
   const out:NearbyItem[]=[];
   const seen=new Set<string>();
   for(const el of Array.isArray(j?.elements)?j.elements:[]){
    const tags=(el.tags??{}) as Record<string,string>,kind=classify(tags);
    if(!kind)continue;
    const name=(tags.name??tags["name:el"]??tags["name:en"]??"").trim();
    if(!name||seen.has(name.toLowerCase()))continue;
    const pLat=Number(el.lat??el.center?.lat),pLon=Number(el.lon??el.center?.lon);
    if(!Number.isFinite(pLat)||!Number.isFinite(pLon))continue;
    seen.add(name.toLowerCase());
    out.push({
      id:`${el.type}-${el.id}`,name,category:kind.category,subtype:pretty(kind.subtype),
      latitude:pLat,longitude:pLon,distanceKm:Number(km(lat,lon,pLat,pLon).toFixed(1)),
      website:tags.website??tags["contact:website"]??null,openingHours:tags.opening_hours??null,cuisine:tags.cuisine?pretty(tags.cuisine):null
    });
   }
   out.sort((a,b)=>a.distanceKm-b.distanceKm);
   return{
    food:out.filter(x=>x.category==="food").slice(0,6),
    drink:out.filter(x=>x.category==="drink").slice(0,6),
    activities:out.filter(x=>x.category==="activity").slice(0,8)
   };
  }catch{return{food:[],drink:[],activities:[]}}
 })();

 const [weather,nearby]=await Promise.all([weatherPromise,nearbyPromise]);
 return NextResponse.json({ok:true,generatedAt:new Date().toISOString(),radiusKm:4.5,weather,nearby},{
  headers:{"cache-control":"public, s-maxage=900, stale-while-revalidate=3600","x-travel-nearby":"v50-open-data"}
 });
}
