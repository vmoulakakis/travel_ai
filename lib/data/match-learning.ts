import type { GuruRecommendation } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";
import { encodeTripSemantics } from "@/lib/decision/semantic-matcher";
import { pairFeaturesFromBreakdown } from "@/lib/decision/training-features";

const endpoint=()=>process.env.SUPABASE_MATCH_LEARNING_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/match-learning";

function sanitizedConstraints(request:TripRequest){
  return {origin:request.origin,startDate:request.startDate,endDate:request.endDate,nights:request.nights,budget:request.budget,moods:request.moods,travelerType:request.travelerType,distancePreference:request.distancePreference,pace:request.pace,hotelStyle:request.hotelStyle,avoid:request.avoid};
}

async function send(body:Record<string,unknown>,timeout=1400){
  const secret=process.env.SUPABASE_INGEST_SECRET;if(!secret)return false;
  try{const response=await fetch(endpoint(),{method:"POST",headers:{"content-type":"application/json","x-match-secret":secret},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout),cache:"no-store"});return response.ok}catch{return false}
}

export async function recordRecommendationSession(sessionId:string,request:TripRequest,recommendations:GuruRecommendation[],modelVersion?:string){
  if(recommendations.length<1)return false;
  return send({sessionId,eventName:"recommendation_impression",travelMonth:Number(request.startDate.slice(5,7)),featureVector:encodeTripSemantics(request),constraints:sanitizedConstraints(request),modelVersion:modelVersion??"semantic-neural-v1",recommendations:recommendations.slice(0,5).map((trip,index)=>({destinationId:trip.destinationId,rank:index+1,pairFeatures:pairFeaturesFromBreakdown(trip.breakdown),sourceProductId:trip.offers[0]?.sourceProductId??null}))},1700);
}

export async function recordDestinationSelection(sessionId:string,destinationId:string){
  return send({sessionId,eventName:"destination_selected",destinationId},900);
}
