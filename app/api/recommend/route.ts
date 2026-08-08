import { NextResponse } from "next/server";
import { runTravelGuru } from "@/lib/ai/travel-guru";
import { verifyRecommendations } from "@/lib/ai/openai-verifier";
import { loadAffiliateUniverse } from "@/lib/data/affiliate-universe";
import { loadSemanticMatchData } from "@/lib/data/semantic-match";
import { enrichCandidatesWithWeather, weatherGate } from "@/lib/data/weather";
import { deterministicGuruFallback, rankAffiliateCandidates, seasonGate } from "@/lib/decision/affiliate-engine";
import { attachSemanticProfiles } from "@/lib/decision/semantic-matcher";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);
  if(!parsed.success)return NextResponse.json({error:"Invalid trip request",details:parsed.errors},{status:400});
  try{
    const trip=parsed.data,travelMonth=Number(trip.startDate.slice(5,7));
    const universe=await loadAffiliateUniverse(trip,150);
    if(universe.length<5)return NextResponse.json({error:"Not enough tracked destinations overlap these exact dates"},{status:422});

    const semanticBase=await loadSemanticMatchData(universe.map(c=>c.destinationId),travelMonth);
    const semanticUniverse=attachSemanticProfiles(trip,universe,semanticBase);
    const preRanked=rankAffiliateCandidates(trip,semanticUniverse,36,semanticBase.model);

    const first=await enrichCandidatesWithWeather(trip,preRanked.slice(0,24).map(x=>x.candidate),24);
    let gated=weatherGate(trip,first);
    if(gated.length<8&&preRanked.length>24){const extra=await enrichCandidatesWithWeather(trip,preRanked.slice(24,36).map(x=>x.candidate),12);gated=weatherGate(trip,[...first,...extra]);}
    if(gated.length<5)return NextResponse.json({error:"Not enough destinations passed weather screening"},{status:422});

    const stayIds=gated.slice(0,18).flatMap(c=>c.topOffers.slice(0,5).map(o=>o.sourceProductId));
    const semanticStays=await loadSemanticMatchData(gated.slice(0,18).map(c=>c.destinationId),travelMonth,stayIds);
    const withStaySemantics=attachSemanticProfiles(trip,gated,semanticStays);
    const ranked=rankAffiliateCandidates(trip,withStaySemantics,18,semanticStays.model),seasonReady=seasonGate(ranked);
    if(seasonReady.length<5)return NextResponse.json({error:"Not enough destinations passed seasonality screening"},{status:422});

    const guru=await runTravelGuru(trip,seasonReady);
    let recommendations=guru.recommendations;
    if(recommendations.length!==5)return NextResponse.json({error:"Matcher could not produce five valid choices"},{status:422});
    const verification=await verifyRecommendations(trip,recommendations,seasonReady);
    let corrected=false;
    if(verification.checked&&!verification.passed){recommendations=deterministicGuruFallback(trip,seasonReady);corrected=true;}
    recommendations=recommendations.map(x=>({...x,verifier:{checked:verification.checked,passed:true,reason:corrected?`Corrected after verifier: ${verification.reason??"ranking inconsistency"}`:verification.reason,model:verification.model}}));

    return NextResponse.json({request:trip,generatedAt:new Date().toISOString(),mode:guru.mode,source:"linkwise+semantic-db",candidateCount:universe.length,weatherScreenedCount:seasonReady.length,affiliateOnly:true,recommendations,modelVersion:semanticStays.model.version,modelSampleCount:semanticStays.model.sample_count,verifierUsed:verification.checked},{headers:{"cache-control":"no-store"}});
  }catch(error){return NextResponse.json({error:"Travel matching pipeline unavailable",detail:error instanceof Error?error.message:"unknown error"},{status:503})}
}
