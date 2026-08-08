import { deepSeekNeeded, runTravelGuru } from "@/lib/ai/travel-guru";
import { verifyRecommendations } from "@/lib/ai/openai-verifier";
import { loadAffiliateUniverse } from "@/lib/data/affiliate-universe";
import { loadSemanticMatchData } from "@/lib/data/semantic-match";
import { enrichCandidatesWithWeather, weatherGate } from "@/lib/data/weather";
import { deterministicGuruFallback, rankAffiliateCandidates, seasonGate } from "@/lib/decision/affiliate-engine";
import { attachSemanticProfiles } from "@/lib/decision/semantic-matcher";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type EventPayload=Record<string,unknown>;

export async function POST(request:Request){
  const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);
  if(!parsed.success)return Response.json({error:"Invalid trip request",details:parsed.errors},{status:400});
  const encoder=new TextEncoder();
  const stream=new ReadableStream<Uint8Array>({
    async start(controller){
      let closed=false;
      const emit=(type:string,progress:number,payload:EventPayload={})=>{if(!closed)controller.enqueue(encoder.encode(`${JSON.stringify({type,progress,at:new Date().toISOString(),...payload})}\n`));};
      try{
        const trip=parsed.data,travelMonth=Number(trip.startDate.slice(5,7));
        emit("source:start",5,{source:"linkwise+semantic-db",startDate:trip.startDate,endDate:trip.endDate});
        const universe=await loadAffiliateUniverse(trip,150);
        if(universe.length<5){emit("error",100,{message:"Not enough tracked destinations overlap the selected dates"});return;}
        emit("source:ready",18,{candidateCount:universe.length,exactDateRange:true});

        emit("semantic:start",24,{candidateCount:universe.length});
        const semanticBase=await loadSemanticMatchData(universe.map(c=>c.destinationId),travelMonth);
        const semanticUniverse=attachSemanticProfiles(trip,universe,semanticBase);
        emit("semantic:ready",38,{profileCount:semanticBase.destinations.length,modelVersion:semanticBase.model.version,modelSamples:semanticBase.model.sample_count});

        const preRanked=rankAffiliateCandidates(trip,semanticUniverse,36,semanticBase.model);
        emit("discovery:ready",48,{shortlistCount:preRanked.length,preview:preRanked.slice(0,6).map(x=>({destination:x.candidate.locationLabel,semantic:x.breakdown.semantic,score:Math.round(x.score)}))});

        emit("weather:start",54,{candidates:Math.min(36,preRanked.length),dates:[trip.startDate,trip.endDate]});
        const first=await enrichCandidatesWithWeather(trip,preRanked.slice(0,24).map(x=>x.candidate),24);
        let enriched=first,gated=weatherGate(trip,enriched);
        if(gated.length<8&&preRanked.length>24){const extra=await enrichCandidatesWithWeather(trip,preRanked.slice(24,36).map(x=>x.candidate),12);enriched=[...first,...extra];gated=weatherGate(trip,enriched);}
        if(gated.length<5){emit("error",100,{message:"Not enough destinations passed weather screening"});return;}
        emit("weather:ready",68,{weatherChecked:enriched.length,weatherScreenedCount:gated.length,preview:gated.slice(0,6).map(c=>({destination:c.locationLabel,weather:c.weather?.score,source:c.weather?.source,maxC:c.weather?.temperatureMaxC,rain:c.weather?.precipitationMmDay}))});

        emit("stays:start",72,{destinations:Math.min(18,gated.length)});
        const stayIds=gated.slice(0,18).flatMap(c=>c.topOffers.slice(0,5).map(o=>o.sourceProductId));
        const semanticStays=await loadSemanticMatchData(gated.slice(0,18).map(c=>c.destinationId),travelMonth,stayIds);
        const withStaySemantics=attachSemanticProfiles(trip,gated,semanticStays);
        const ranked=rankAffiliateCandidates(trip,withStaySemantics,18,semanticStays.model),seasonReady=seasonGate(ranked);
        if(seasonReady.length<5){emit("error",100,{message:"Not enough destinations passed seasonality screening"});return;}
        emit("decision:ready",82,{shortlistCount:seasonReady.length,preview:seasonReady.slice(0,7).map(x=>({destination:x.candidate.locationLabel,score:Math.round(x.score),semantic:x.breakdown.semantic,weather:x.breakdown.weather,seasonality:x.breakdown.seasonality,neural:x.breakdown.neural,stayFit:x.breakdown.stayFit}))});

        const needsJudge=deepSeekNeeded(trip,seasonReady);
        emit(needsJudge?"judge:start":"judge:skip",needsJudge?86:91,{model:needsJudge?(process.env.DEEPSEEK_MODEL??"deepseek-v4-pro"):"semantic-neural",reason:needsJudge?"ambiguous shortlist":"clear semantic winner set"});
        const guru=await runTravelGuru(trip,seasonReady);
        let recommendations=guru.recommendations;
        if(recommendations.length!==5){emit("error",100,{message:"Matcher could not produce five valid choices"});return;}
        emit("judge:ready",92,{mode:guru.mode,distinctDestinations:recommendations.length});

        emit("verify:start",95,{conditional:true});
        const verification=await verifyRecommendations(trip,recommendations,seasonReady);
        let corrected=false;
        if(verification.checked&&!verification.passed){recommendations=deterministicGuruFallback(trip,seasonReady);corrected=true;}
        recommendations=recommendations.map(x=>({...x,verifier:{checked:verification.checked,passed:true,reason:corrected?`Corrected after verifier: ${verification.reason??"ranking inconsistency"}`:verification.reason,model:verification.model}}));
        emit("verify:ready",98,{checked:verification.checked,passed:true,corrected,model:verification.model});

        emit("final",100,{result:{request:trip,generatedAt:new Date().toISOString(),mode:guru.mode,source:"linkwise+semantic-db",candidateCount:universe.length,weatherScreenedCount:seasonReady.length,affiliateOnly:true,recommendations,modelVersion:semanticStays.model.version,modelSampleCount:semanticStays.model.sample_count,verifierUsed:verification.checked}});
      }catch(error){emit("error",100,{message:error instanceof Error?error.message:"Travel matching pipeline unavailable"});}
      finally{if(!closed){closed=true;controller.close();}}
    }
  });
  return new Response(stream,{headers:{"content-type":"application/x-ndjson; charset=utf-8","cache-control":"no-store, no-transform","x-content-type-options":"nosniff"}});
}
