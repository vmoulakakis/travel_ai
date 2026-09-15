import { NextResponse } from "next/server";
import { z } from "zod";

const ProfileSchema=z.object({
  moods:z.array(z.enum(["relax","romantic","food","warmth","city","nature","adventure","culture"])).min(1).max(3),
  pace:z.enum(["slow","balanced","full"]),
  desiredEnergy:z.enum(["restore","balanced","stimulating"]),
  socialPreference:z.enum(["quiet","balanced","lively"]),
  noveltyPreference:z.enum(["familiar","balanced","surprise"]),
  avoid:z.enum(["long-travel","high-cost","crowds","none"]),
  mustHave:z.enum(["sea","nature","culture","nightlife","none"])
});

const MissionSchema=z.object({
  locale:z.enum(["el","en","de","fr","it","es"]).default("el"),
  originText:z.string().trim().max(120).optional().default(""),
  travelWindow:z.object({label:z.string().trim().min(1).max(120),start:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),end:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),
  needText:z.string().trim().min(3).max(500),
  travelerType:z.enum(["solo","couple","family","friends"]),
  groupSize:z.number().int().min(1).max(12),
  budgetEur:z.number().min(50).max(100000).nullable().optional(),
  dna:z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  profile:ProfileSchema.optional()
});

export async function POST(request:Request){
  const parsed=MissionSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_mission",issues:parsed.error.issues},{status:400});
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
  const d=parsed.data;
  const response=await fetch(new URL("/rest/v1/travel_missions",base),{method:"POST",cache:"no-store",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({locale:d.locale,status:"profiled",origin_text:d.originText||null,travel_window:d.travelWindow,travelers:{type:d.travelerType,groupSize:d.groupSize},budget_eur:d.budgetEur??null,need_text:d.needText,escape_dna:{signals:d.dna,...(d.profile?{profile:d.profile}:{})}})});
  if(!response.ok)return NextResponse.json({ok:false,error:"mission_write_failed",detail:await response.text()},{status:502});
  const rows=await response.json() as Array<{id:string}>;
  return NextResponse.json({ok:true,missionId:rows[0]?.id});
}
