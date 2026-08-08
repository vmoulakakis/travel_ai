import { getWeatherEvidence } from "@/lib/data/weather";
import type { AffiliateDestinationCandidate,WeatherEvidence } from "@/lib/decision/types";
import type { V8Destination } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

export async function getV8Weather(request:TripRequest,destination:V8Destination):Promise<WeatherEvidence>{
 const point={latitude:destination.latitude,longitude:destination.longitude} as AffiliateDestinationCandidate;
 return getWeatherEvidence(request,point);
}

export async function enrichV8Weather(request:TripRequest,destinations:V8Destination[],limit=10):Promise<Map<string,WeatherEvidence>>{
 const selected=destinations.slice(0,Math.max(1,Math.min(14,limit))),out=new Map<string,WeatherEvidence>();
 for(let i=0;i<selected.length;i+=5){const chunk=selected.slice(i,i+5),evidence=await Promise.all(chunk.map(d=>getV8Weather(request,d)));chunk.forEach((d,index)=>out.set(d.slug,evidence[index]));}
 return out;
}
