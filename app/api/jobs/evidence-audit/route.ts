import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/data/supabase-admin";

export const runtime="nodejs";export const dynamic="force-dynamic";
function authorized(request:Request){const secret=process.env.CRON_SECRET;if(!secret)return false;return request.headers.get("authorization")===`Bearer ${secret}`}
function period(offset:number){const now=new Date(),date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+offset,1)),year=date.getUTCFullYear(),month=String(date.getUTCMonth()+1).padStart(2,"0"),last=new Date(Date.UTC(year,date.getUTCMonth()+1,0)).getUTCDate();return{key:`${year}-${month}`,start:`${year}-${month}-01`,end:`${year}-${month}-${String(last).padStart(2,"0")}`}}

export async function GET(request:Request){
  if(!authorized(request))return NextResponse.json({ok:false},{status:401});
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,admin=getSupabaseAdmin();if(!base||!key||!admin)return NextResponse.json({ok:false},{status:503});
  const endpoint=new URL("/rest/v1/destination_evidence_v12",base);endpoint.searchParams.set("status","eq.verified");endpoint.searchParams.set("expires_at",`lte.${new Date().toISOString()}`);
  const expired=await fetch(endpoint,{method:"PATCH",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({status:"expired",updated_at:new Date().toISOString()}),cache:"no-store",signal:AbortSignal.timeout(5000)}).then(async response=>response.ok?await response.json() as unknown[]:[]).catch(()=>[]);
  const rows=[1,2,3].flatMap(offset=>{const p=period(offset);return["surprise","sea","culture"].map(theme=>({period_key:p.key,theme_key:theme,language:"el",status:"draft",input_snapshot:{start:p.start,end:p.end,policy:"month+weather+seasonality+verified-evidence+valid-CD104"},evidence_snapshot:{state:"research_required",created_at:new Date().toISOString()},selected_choices:[],generated_by:"evidence-audit-v12",updated_at:new Date().toISOString()}))});
  const queued=await admin.upsert("thematic_dossier_runs_v12",rows,"period_key,theme_key,language");
  return NextResponse.json({ok:queued.ok,expired:expired.length,queued:queued.ok?rows.length:0},{headers:{"cache-control":"no-store"}});
}
