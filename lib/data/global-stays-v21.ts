import type { StayConstraintKind } from "@/lib/decision/v8-types";

const GLOBAL_STAYS_URL=process.env.SUPABASE_GLOBAL_STAYS_V21_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/global-stays-v21";
const num=(value:unknown)=>Number.isFinite(Number(value))?Number(value):null;
const vector=(value:unknown)=>Array.isArray(value)?value.map(Number).filter(Number.isFinite).slice(0,24):[];

export interface GlobalStayCandidateV21{
  destinationSlug:string;
  distanceKm:number|null;
  availabilityTruth:"CONFIRMED_ACTIVE"|"VALID_WINDOW_STOCK_UNKNOWN";
  semanticVector:number[];
  semanticConfidence:number|null;
  starLevel:number|null;
  valueSignal:number;
  styleHints:{boutique:boolean;resort:boolean;luxury:boolean};
  constraintEvidence:Partial<Record<StayConstraintKind,boolean>>;
}

type Payload={stays?:Array<Record<string,unknown>>};
export async function loadGlobalStayCandidatesV21(startDate:string,endDate:string,perDestination=40):Promise<GlobalStayCandidateV21[]>{
  const url=new URL(GLOBAL_STAYS_URL);url.searchParams.set("start_date",startDate);url.searchParams.set("end_date",endDate);url.searchParams.set("per_destination",String(Math.max(1,Math.min(60,perDestination))));
  const response=await fetch(url,{cache:"no-store",headers:{"user-agent":"travel-guru/1.0","accept":"application/json"},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(`Global stay retrieval ${response.status}`);
  const payload=await response.json() as Payload,result:GlobalStayCandidateV21[]=[];
  for(const row of payload.stays??[]){
    const destinationSlug=typeof row.destination_slug==="string"?row.destination_slug.trim():"",truth=row.availability_truth;
    if(!destinationSlug||(truth!=="CONFIRMED_ACTIVE"&&truth!=="VALID_WINDOW_STOCK_UNKNOWN"))continue;
    const hints=row.style_hints&&typeof row.style_hints==="object"&&!Array.isArray(row.style_hints)?row.style_hints as Record<string,unknown>:{},evidence=row.constraint_evidence&&typeof row.constraint_evidence==="object"&&!Array.isArray(row.constraint_evidence)?row.constraint_evidence as Record<string,unknown>:{};
    result.push({destinationSlug,distanceKm:num(row.distance_km),availabilityTruth:truth,semanticVector:vector(row.semantic_vector),semanticConfidence:num(row.semantic_confidence),starLevel:num(row.star_level),valueSignal:num(row.value_signal)??58,styleHints:{boutique:hints.boutique===true,resort:hints.resort===true,luxury:hints.luxury===true},constraintEvidence:Object.fromEntries(Object.entries(evidence).filter(([,value])=>typeof value==="boolean")) as Partial<Record<StayConstraintKind,boolean>>});
  }
  return result;
}
