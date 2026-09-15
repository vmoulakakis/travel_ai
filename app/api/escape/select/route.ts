import { NextResponse } from "next/server";
import { z } from "zod";

const Body=z.object({missionId:z.string().uuid(),destinationId:z.string().min(1).max(120)});

export async function POST(request:Request){
  const parsed=Body.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_selection"},{status:400});
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
  const h={apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=minimal"};
  const mission=await fetch(new URL(`/rest/v1/travel_missions?id=eq.${parsed.data.missionId}`,base),{method:"PATCH",cache:"no-store",headers:h,body:JSON.stringify({status:"destination_selected",chosen_destination_id:parsed.data.destinationId,updated_at:new Date().toISOString()})});
  if(!mission.ok)return NextResponse.json({ok:false,error:"mission_update_failed",detail:await mission.text()},{status:502});
  await fetch(new URL(`/rest/v1/travel_destination_matches?mission_id=eq.${parsed.data.missionId}`,base),{method:"PATCH",cache:"no-store",headers:h,body:JSON.stringify({selected:false})});
  await fetch(new URL(`/rest/v1/travel_destination_matches?mission_id=eq.${parsed.data.missionId}&destination_id=eq.${encodeURIComponent(parsed.data.destinationId)}`,base),{method:"PATCH",cache:"no-store",headers:h,body:JSON.stringify({selected:true})});
  const research=await fetch(new URL("/rest/v1/travel_research_runs",base),{method:"POST",cache:"no-store",headers:{...h,Prefer:"return=representation"},body:JSON.stringify({mission_id:parsed.data.missionId,destination_id:parsed.data.destinationId,status:"queued"})});
  if(!research.ok)return NextResponse.json({ok:false,error:"research_queue_failed",detail:await research.text()},{status:502});
  const rows=await research.json().catch(()=>[]) as Array<{id:string}>;
  await fetch(new URL("/rest/v1/travel_mission_events",base),{method:"POST",cache:"no-store",headers:h,body:JSON.stringify({mission_id:parsed.data.missionId,event_name:"destination_chosen",payload:{destinationId:parsed.data.destinationId}})}).catch(()=>null);
  return NextResponse.json({ok:true,researchRunId:rows[0]?.id??null});
}
