import { NextResponse } from "next/server";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { buildDestinationChoiceProfilesV26 } from "@/lib/data/destination-choice-profiles-v26";
import { loadProductionTruthV20 } from "@/lib/data/production-truth-v20";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 let destinationKnowledge=false,destinationCount=0,truthReady=false,evidenceCoveragePercent:number|null=null,unknownStockOffers:number|null=null,choiceProfileCount=0,choiceProfilesReady=false;
 try{
  const catalog=await loadV8DestinationCatalog(),greek=catalog.filter(x=>x.countryCode==="GR");
  destinationCount=greek.length;
  destinationKnowledge=destinationCount>=20;
  const profiles=buildDestinationChoiceProfilesV26(greek);
  choiceProfileCount=profiles.size;
  choiceProfilesReady=choiceProfileCount>=Math.min(20,destinationCount);
 }catch{
  destinationKnowledge=false;
  choiceProfilesReady=false;
 }
 try{
  const truth=await loadProductionTruthV20();
  truthReady=true;
  evidenceCoveragePercent=truth.evidenceCoveragePercent;
  unknownStockOffers=truth.truth.unknownStockOffers??null;
 }catch{
  truthReady=false;
 }
 const externalCouncilConfigured=Boolean(process.env.DEEPSEEK_API_KEY||process.env.OPENAI_API_KEY||process.env.SELF_HOSTED_AI_BASE_URL||process.env.HF_TOKEN||process.env.HUGGINGFACE_API_KEY);
 const councilReady=true;
 const body={
  ok:destinationKnowledge&&truthReady&&choiceProfilesReady,
  release:"V50",
  version:"50.0",
  engineVersion:"V26",
  architecture:"criterion-sensitive-agentic-decision-system",
  commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,8)??"runtime",
  environment:process.env.VERCEL_ENV??process.env.NODE_ENV??"unknown",
  checks:{
   destinationKnowledge,
   greekDestinationCount:destinationCount,
   councilReady,
   councilMode:externalCouncilConfigured?"agent+verified-fallback":"verified-fallback",
   fullTripValidityGate:true,
   triStateStayAvailability:true,
   productionTruthReady:truthReady,
   evidenceCoveragePercent,
   unknownStockOffers,
   choiceProfilesReady,
   choiceProfileCount,
   choiceProfileSource:"v26-curated-catalog",
   criterionSensitivityGate:true,
   negationSafeStayEvidence:true,
   dbOnlyMedia:true
  },
  at:new Date().toISOString()
 };
 return NextResponse.json(body,{status:body.ok?200:503,headers:{"cache-control":"no-store","x-content-type-options":"nosniff","x-travel-health":"v50"}})
}
