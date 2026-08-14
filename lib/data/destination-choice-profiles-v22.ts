const CHOICE_PROFILES_URL=process.env.SUPABASE_DESTINATION_CHOICE_PROFILES_V22_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/destination-choice-profiles-v22";
const clamp=(value:number)=>Math.max(0,Math.min(1,value));

export interface DestinationChoiceProfileV22{
 slug:string;
 vector:number[];
 confidence:number;
}

type Payload={profiles?:Array<Record<string,unknown>>};
export async function loadDestinationChoiceProfilesV22():Promise<Map<string,DestinationChoiceProfileV22>>{
 const response=await fetch(CHOICE_PROFILES_URL,{cache:"no-store",headers:{"user-agent":"travel-guru/1.0","accept":"application/json"},signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error(`Destination choice profiles ${response.status}`);
 const payload=await response.json() as Payload,profiles=new Map<string,DestinationChoiceProfileV22>();
 for(const row of payload.profiles??[]){
  const slug=typeof row.slug==="string"?row.slug.trim():"",raw=Array.isArray(row.vector)?row.vector:[],vector=raw.map(Number).filter(Number.isFinite).slice(0,24),confidence=Number(row.confidence);
  if(!slug||vector.length!==24)continue;
  profiles.set(slug,{slug,vector:vector.map(clamp),confidence:Number.isFinite(confidence)?clamp(confidence):.6});
 }
 return profiles;
}
