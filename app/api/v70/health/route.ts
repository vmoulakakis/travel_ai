import {NextResponse} from "next/server";
import {loadAgentProfilesV70,loadCandidateUniverseV70,loadDiscoverySnapshotV70} from "@/lib/ai/travel-intelligence-v70";
import {v70GatewayConfigured} from "@/lib/ai/v70-supabase-gateway";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 const gatewayConfigured=v70GatewayConfigured();
 const reasoningConfigured=Boolean(
  (process.env.OPENAI_API_KEY&&process.env.OPENAI_ESCALATION_ENABLED!=="false")||
  process.env.DEEPSEEK_API_KEY||
  (process.env.SELF_HOSTED_AI_BASE_URL&&process.env.SELF_HOSTED_AI_MODEL)||
  process.env.HF_TOKEN||process.env.HUGGINGFACE_API_KEY
 );
 let agentProfileCount=0,candidateCount=0,gatewayReachable=false,discoveryWarm=false,lastSnapshotAt:string|null=null,error:string|null=null;
 try{
  const[profiles,candidates,snapshot]=await Promise.all([loadAgentProfilesV70(),loadCandidateUniverseV70("el",80),loadDiscoverySnapshotV70("el")]);
  agentProfileCount=profiles.size;candidateCount=candidates.length;gatewayReachable=true;discoveryWarm=Boolean(snapshot);lastSnapshotAt=snapshot?.generated_at??null;
 }catch(e){error=e instanceof Error?e.message:String(e)}
 const agentProfilesReady=agentProfileCount>=8,candidateUniverseReady=candidateCount>=50;
 const ok=gatewayConfigured&&gatewayReachable&&reasoningConfigured&&agentProfilesReady&&candidateUniverseReady;
 return NextResponse.json({
  ok,release:"V70",version:"70.0",architecture:"full-agentic-grounded-travel-backend",commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,8)??"runtime",environment:process.env.VERCEL_ENV??process.env.NODE_ENV??"unknown",
  checks:{gatewayConfigured,gatewayReachable,reasoningConfigured,agentProfilesReady,agentProfileCount,candidateUniverseReady,candidateCount,discoveryWarm,lastSnapshotAt,serviceRoleExposedToVercel:false},
  error:ok?null:error,at:new Date().toISOString()
 },{status:ok?200:503,headers:{"cache-control":"no-store","x-content-type-options":"nosniff","x-travel-health":"v70"}})
}
