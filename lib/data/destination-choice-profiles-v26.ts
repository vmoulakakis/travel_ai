import type { DestinationChoiceProfileV22 } from "@/lib/data/destination-choice-profiles-v22";
import { V8_DIMENSIONS,type V8Destination,type V8Dimension } from "@/lib/decision/v8-types";

// V26 deliberately does NOT read destination_semantic_profiles: those rows are generated from
// accommodation offer text. Destination choice must be grounded in the curated destination catalog.
const profileIndex:Partial<Record<V8Dimension,number>>={relax:0,romantic:1,food:2,warmth:3,city:4,nature:5,adventure:6,culture:7,luxury:8,value:11,family:12,beach:19,nightlife:20,wellness:21,short_break:22,shoulder_season:23};
const baseIndex=Object.fromEntries(V8_DIMENSIONS.map((dimension,index)=>[dimension,index])) as Record<V8Dimension,number>;
const clamp01=(value:number)=>Math.max(0,Math.min(1,value));

export function buildDestinationChoiceProfilesV26(catalog:readonly V8Destination[]):Map<string,DestinationChoiceProfileV22>{
 const profiles=new Map<string,DestinationChoiceProfileV22>();
 for(const destination of catalog){
  const vector=Array(24).fill(.5) as number[];
  for(const dimension of V8_DIMENSIONS){const target=profileIndex[dimension];if(target==null)continue;vector[target]=clamp01(destination.vector[baseIndex[dimension]]??.5);}
  // These dimensions do not exist in the canonical 16D destination vector. Keep neutral rather
  // than infer them from hotels. Traveler suitability remains available through travelerFit elsewhere.
  vector[9]=.5;vector[10]=.5;vector[13]=clamp01(Number(destination.travelerFit.couple??.5));vector[14]=clamp01(Number(destination.travelerFit.solo??.5));vector[15]=clamp01(Number(destination.travelerFit.friends??.5));vector[16]=.5;vector[17]=vector[3];vector[18]=vector[23];
  const confidence=destination.knowledgeSource.startsWith("curated")?.96:Math.max(.65,Math.min(.90,destination.routeConfidence));
  profiles.set(destination.slug,{slug:destination.slug,vector,confidence});
 }
 return profiles;
}
