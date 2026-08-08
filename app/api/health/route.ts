import { NextResponse } from "next/server";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 let destinationKnowledge=false,destinationCount=0,domestic=0,abroad=0;
 try{const catalog=await loadV8DestinationCatalog();destinationCount=catalog.length;domestic=catalog.filter(x=>x.countryCode==="GR").length;abroad=destinationCount-domestic;destinationKnowledge=destinationCount>=20&&domestic>0&&abroad>0}catch{destinationKnowledge=false}
 const body={ok:destinationKnowledge,version:"8.0",architecture:"destination-first",commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,8)??"local",environment:process.env.VERCEL_ENV??process.env.NODE_ENV??"unknown",checks:{destinationKnowledge,destinationCount,domestic,abroad,serverEdgeSecretConfigured:Boolean(process.env.SUPABASE_INGEST_SECRET),deepseekIntentOptional:Boolean(process.env.DEEPSEEK_API_KEY),openaiVerifierOptional:Boolean(process.env.OPENAI_API_KEY),weatherBaseline:"NASA POWER climatology",v8TrainerConfigured:Boolean(process.env.SUPABASE_MATCH_TRAIN_URL||process.env.SUPABASE_INGEST_SECRET),cronConfigured:Boolean(process.env.CRON_SECRET)},at:new Date().toISOString()};
 return NextResponse.json(body,{status:body.ok?200:503,headers:{"cache-control":"no-store"}})
}
