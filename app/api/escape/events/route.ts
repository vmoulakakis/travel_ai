import { NextResponse } from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const iso=/^\d{4}-\d{2}-\d{2}$/;
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const txt=(v:unknown,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";

export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const destination=txt(body?.destination,120),start=txt(body?.start,10),end=txt(body?.end,10),lat=num(body?.latitude),lon=num(body?.longitude);
  if(!destination||!iso.test(start)||!iso.test(end))return NextResponse.json({ok:false,error:"invalid_event_request"},{status:400});
  const key=process.env.TICKETMASTER_API_KEY;
  if(!key)return NextResponse.json({ok:true,status:"unavailable",events:[],providers:[],disclosure:"Δεν υπάρχει συνδεδεμένος verified event provider, οπότε δεν εμφανίζουμε εικασίες."},{headers:{"cache-control":"public, max-age=300"}});
  const url=new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey",key);
  url.searchParams.set("startDateTime",start+"T00:00:00Z");
  url.searchParams.set("endDateTime",end+"T23:59:59Z");
  url.searchParams.set("size","12");
  url.searchParams.set("sort","date,asc");
  if(lat!=null&&lon!=null){url.searchParams.set("latlong",lat+","+lon);url.searchParams.set("radius","80");url.searchParams.set("unit","km")}
  else url.searchParams.set("keyword",destination);
  const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(7000)});
  if(!r.ok)return NextResponse.json({ok:true,status:"unavailable",events:[],providers:["Ticketmaster"],disclosure:"Ο event provider δεν επέστρεψε διαθέσιμα δεδομένα αυτή τη στιγμή."});
  const payload=await r.json() as any,rows=Array.isArray(payload?._embedded?.events)?payload._embedded.events:[];
  const events=rows.slice(0,10).map((x:any)=>({
   id:String(x.id??""),
   name:txt(x.name,160),
   date:txt(x.dates?.start?.localDate,10),
   time:txt(x.dates?.start?.localTime,8)||null,
   venue:txt(x._embedded?.venues?.[0]?.name,150)||null,
   city:txt(x._embedded?.venues?.[0]?.city?.name,100)||destination,
   category:txt(x.classifications?.[0]?.segment?.name,80)||"Event",
   imageUrl:Array.isArray(x.images)?txt(x.images.find((i:any)=>Number(i?.width)>=640)?.url??x.images[0]?.url,500)||null:null
  })).filter((x:any)=>x.id&&x.name&&x.date);
  return NextResponse.json({ok:true,status:events.length?"live":"empty",events,providers:["Ticketmaster"],disclosure:events.length?"Events εμφανίζονται μόνο από τον verified provider για τις συγκεκριμένες ημερομηνίες.":"Δεν βρέθηκε verified event για τις ημερομηνίες σου."},{headers:{"cache-control":"public, s-maxage=900, stale-while-revalidate=3600","x-travel-events":"verified-only"}});
 }catch{
  return NextResponse.json({ok:true,status:"unavailable",events:[],providers:[],disclosure:"Δεν μπορέσαμε να επαληθεύσουμε events, οπότε δεν εμφανίζουμε εικασίες."});
 }
}
