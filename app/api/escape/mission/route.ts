import { NextResponse } from "next/server";
import { z } from "zod";

const MissionSchema = z.object({
  locale: z.enum(["el","en","de","fr","it","es"]).default("el"),
  originText: z.string().trim().max(120).optional().default(""),
  when: z.string().trim().min(1).max(120),
  needText: z.string().trim().min(3).max(500),
  travelers: z.object({ adults:z.number().int().min(1).max(12).default(2), children:z.number().int().min(0).max(12).default(0) }).default({adults:2,children:0}),
  budgetEur: z.number().min(50).max(100000).nullable().optional(),
  dna: z.array(z.string().trim().min(1).max(40)).min(1).max(8)
});

export async function POST(request:Request){
  const parsed=MissionSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_mission",issues:parsed.error.issues},{status:400});
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
  const d=parsed.data;
  const payload={
    locale:d.locale,
    status:"profiled",
    origin_text:d.originText||null,
    travel_window:{label:d.when},
    travelers:d.travelers,
    budget_eur:d.budgetEur??null,
    need_text:d.needText,
    escape_dna:{signals:d.dna}
  };
  const response=await fetch(new URL("/rest/v1/travel_missions",base),{
    method:"POST",cache:"no-store",
    headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation"},
    body:JSON.stringify(payload)
  });
  if(!response.ok)return NextResponse.json({ok:false,error:"mission_write_failed",detail:await response.text()},{status:502});
  const rows=await response.json() as Array<{id:string}>;
  return NextResponse.json({ok:true,missionId:rows[0]?.id});
}
