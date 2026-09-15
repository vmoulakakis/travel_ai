import { NextResponse } from "next/server";
import { z } from "zod";

const Body=z.object({missionId:z.string().uuid(),finalists:z.array(z.object({slug:z.string().min(1).max(120),score:z.number().min(0).max(100),why:z.string().max(1800),seasonNote:z.string().max(500).optional(),budgetLabel:z.string().max(300).optional(),effortLabel:z.string().max(300).optional()})).min(1).max(10)});

export async function POST(request:Request){
  const parsed=Body.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_finalists"},{status:400});
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
  const roles=["winner","smart_value","wild_card"] as const;
  const rows=parsed.data.finalists.map((x,index)=>({mission_id:parsed.data.missionId,destination_id:x.slug,role:roles[index]??"alternative",rank:index+1,fit_score:x.score,confidence_score:null,reasons:[x.why],tradeoffs:[],evidence:{seasonNote:x.seasonNote??null,budgetLabel:x.budgetLabel??null,effortLabel:x.effortLabel??null},selected:false}));
  const endpoint=new URL("/rest/v1/travel_destination_matches",base);endpoint.searchParams.set("on_conflict","mission_id,destination_id");
  const response=await fetch(endpoint,{method:"POST",cache:"no-store",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});
  if(!response.ok)return NextResponse.json({ok:false,error:"match_write_failed",detail:await response.text()},{status:502});
  await fetch(new URL(`/rest/v1/travel_missions?id=eq.${parsed.data.missionId}`,base),{method:"PATCH",cache:"no-store",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({status:"matched",updated_at:new Date().toISOString()})});
  return NextResponse.json({ok:true,count:rows.length});
}
