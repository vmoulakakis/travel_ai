import { NextResponse } from "next/server";
import { z } from "zod";

const allowed=new Set(["escape_shared","guide_downloaded","affiliate_offer_opened"]);
const Body=z.object({missionId:z.string().uuid(),eventName:z.string().min(1).max(80),payload:z.record(z.string(),z.unknown()).default({})});

export async function POST(request:Request){
 const parsed=Body.safeParse(await request.json().catch(()=>null));
 if(!parsed.success||!allowed.has(parsed.data.eventName))return NextResponse.json({ok:false,error:"invalid_event"},{status:400});
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 const response=await fetch(new URL("/rest/v1/travel_mission_events",base),{method:"POST",cache:"no-store",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({mission_id:parsed.data.missionId,event_name:parsed.data.eventName,payload:parsed.data.payload})});
 if(!response.ok)return NextResponse.json({ok:false,error:"event_write_failed"},{status:502});
 return NextResponse.json({ok:true});
}
