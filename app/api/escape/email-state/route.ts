import { NextResponse } from "next/server";
import { z } from "zod";

const Body=z.object({missionId:z.string().uuid(),email:z.string().email().max(320)});

export async function POST(request:Request){
 const parsed=Body.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_email_state"},{status:400});
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 const h={apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=minimal"},now=new Date().toISOString();
 const mission=await fetch(new URL(`/rest/v1/travel_missions?id=eq.${parsed.data.missionId}`,base),{method:"PATCH",cache:"no-store",headers:h,body:JSON.stringify({consent_email:true,contact_email:parsed.data.email,updated_at:now})});
 if(!mission.ok)return NextResponse.json({ok:false,error:"mission_email_update_failed"},{status:502});
 await fetch(new URL(`/rest/v1/travel_escape_books?mission_id=eq.${parsed.data.missionId}`,base),{method:"PATCH",cache:"no-store",headers:h,body:JSON.stringify({emailed_at:now,updated_at:now})}).catch(()=>null);
 await fetch(new URL("/rest/v1/travel_mission_events",base),{method:"POST",cache:"no-store",headers:h,body:JSON.stringify({mission_id:parsed.data.missionId,event_name:"guide_emailed",payload:{}})}).catch(()=>null);
 return NextResponse.json({ok:true});
}
