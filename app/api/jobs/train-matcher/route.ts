import { NextResponse } from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request){
  const cronSecret=process.env.CRON_SECRET;
  if(!cronSecret||request.headers.get("authorization")!==`Bearer ${cronSecret}`)return NextResponse.json({error:"Unauthorized"},{status:401});
  const matchSecret=process.env.SUPABASE_INGEST_SECRET;
  if(!matchSecret)return NextResponse.json({error:"Matching secret not configured"},{status:503});
  const endpoint=process.env.SUPABASE_MATCH_TRAIN_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/train-semantic-ranker";
  try{
    const response=await fetch(endpoint,{method:"POST",headers:{"x-match-secret":matchSecret},signal:AbortSignal.timeout(25000)});
    const payload=await response.json().catch(()=>({}));
    return NextResponse.json(payload,{status:response.ok?200:502,headers:{"cache-control":"no-store"}});
  }catch(error){return NextResponse.json({error:"Training job unavailable",detail:error instanceof Error?error.message:"unknown"},{status:503})}
}
