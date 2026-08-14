import { NextResponse } from "next/server";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { loadProductionTruthV20 } from "@/lib/data/production-truth-v20";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 let destinationKnowledge=false,destinationCount=0,truthReady=false,evidenceCoveragePercent:number|null=null,unknownStockOffers:number|null=null;
 try{const catalog=await loadV8DestinationCatalog();destinationCount=catalog.filter(x=>x.countryCode==="GR").length;destinationKnowledge=destinationCount>=20}catch{destinationKnowledge=false}
 try{const truth=await loadProductionTruthV20();truthReady=true;evidenceCoveragePercent=truth.evidenceCoveragePercent;unknownStockOffers=truth.truth.unknownStockOffers??null}catch{truthReady=false}
 const body={ok:destinationKnowledge&&truthReady,release:"V20",version:"20.0",architecture:"greece-first-agentic-decision-system",commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,8)??"local",environment:process.env.VERCEL_ENV??process.env.NODE_ENV??"unknown",checks:{destinationKnowledge,greekDestinationCount:destinationCount,councilReady:Boolean(process.env.DEEPSEEK_API_KEY||process.env.OPENAI_API_KEY||process.env.SELF_HOSTED_AI_BASE_URL||process.env.HF_TOKEN||process.env.HUGGINGFACE_API_KEY),fullTripValidityGate:true,triStateStayAvailability:true,productionTruthReady:truthReady,evidenceCoveragePercent,unknownStockOffers,dbOnlyMedia:true},at:new Date().toISOString()};
 return NextResponse.json(body,{status:body.ok?200:503,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}})
}
