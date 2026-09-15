import { NextResponse } from "next/server";
import { z } from "zod";

const Body=z.object({
  missionId:z.string().uuid(),
  destinationId:z.string().min(1).max(120),
  weather:z.unknown(),
  places:z.array(z.unknown()).max(30).default([]),
  restaurants:z.array(z.unknown()).max(30).default([]),
  practicalNotes:z.array(z.string().max(800)).max(30).default([]),
  logistics:z.unknown(),
  sources:z.array(z.unknown()).max(50).default([]),
  media:z.array(z.unknown()).max(30).default([]),
  guidePath:z.string().max(500).optional().default(""),
  trackingUrl:z.string().url().max(2000).optional().nullable()
});

export async function POST(request:Request){
  const parsed=Body.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_research_payload"},{status:400});
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
  const d=parsed.data,h={apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=minimal"};
  const lookup=new URL("/rest/v1/travel_research_runs",base);lookup.searchParams.set("mission_id",`eq.${d.missionId}`);lookup.searchParams.set("destination_id",`eq.${d.destinationId}`);lookup.searchParams.set("select","id");lookup.searchParams.set("order","created_at.desc");lookup.searchParams.set("limit","1");
  const found=await fetch(lookup,{cache:"no-store",headers:{apikey:key,Authorization:`Bearer ${key}`}});const rows=found.ok?await found.json() as Array<{id:string}>:[];const runId=rows[0]?.id;
  if(!runId)return NextResponse.json({ok:false,error:"research_run_not_found"},{status:404});
  const update=await fetch(new URL(`/rest/v1/travel_research_runs?id=eq.${runId}`,base),{method:"PATCH",cache:"no-store",headers:h,body:JSON.stringify({status:"ready",weather:d.weather,places:d.places,restaurants:d.restaurants,dont_miss:d.places.slice(0,5),avoid:d.practicalNotes,logistics:d.logistics,itinerary:{guidePath:d.guidePath},media:d.media,sources:d.sources,started_at:new Date().toISOString(),completed_at:new Date().toISOString()})});
  if(!update.ok)return NextResponse.json({ok:false,error:"research_update_failed",detail:await update.text()},{status:502});
  const bookUrl=new URL("/rest/v1/travel_escape_books",base);bookUrl.searchParams.set("on_conflict","mission_id");
  const book=await fetch(bookUrl,{method:"POST",cache:"no-store",headers:{...h,Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({mission_id:d.missionId,status:d.guidePath?"ready":"draft",pdf_url:d.guidePath||null,affiliate_tracking_url:d.trackingUrl??null,qr_payload:d.trackingUrl??null,updated_at:new Date().toISOString()})});
  if(!book.ok)return NextResponse.json({ok:false,error:"escape_book_update_failed",detail:await book.text()},{status:502});
  await fetch(new URL(`/rest/v1/travel_missions?id=eq.${d.missionId}`,base),{method:"PATCH",cache:"no-store",headers:h,body:JSON.stringify({status:"ready",updated_at:new Date().toISOString()})});
  await fetch(new URL("/rest/v1/travel_mission_events",base),{method:"POST",cache:"no-store",headers:h,body:JSON.stringify({mission_id:d.missionId,event_name:"escape_build_completed",payload:{destinationId:d.destinationId,researchRunId:runId,guideReady:Boolean(d.guidePath),offerReady:Boolean(d.trackingUrl)}})}).catch(()=>null);
  return NextResponse.json({ok:true,researchRunId:runId});
}
