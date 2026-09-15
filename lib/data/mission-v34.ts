import type { Avoidance, Mood, MustHave, PacePreference, SocialPreference, NoveltyPreference, DesiredEnergy, TravelerType } from "@/lib/validation/trip";

export interface MissionProfileV34{
  moods:Mood[];
  pace:PacePreference;
  desiredEnergy:DesiredEnergy;
  socialPreference:SocialPreference;
  noveltyPreference:NoveltyPreference;
  avoid:Avoidance;
  mustHave:MustHave;
}
export interface TravelMissionV34{
  id:string;
  needText:string;
  originText:string|null;
  budgetEur:number|null;
  travelers:{type?:TravelerType;groupSize?:number};
  travelWindow:{label?:string;start?:string;end?:string};
  escapeDna:{signals?:string[];profile?:MissionProfileV34};
}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const obj=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const str=(value:unknown)=>typeof value==="string"?value:null;
const num=(value:unknown)=>Number.isFinite(Number(value))?Number(value):null;
const moodSet=new Set<Mood>(["relax","romantic","food","warmth","city","nature","adventure","culture"]);
const paceSet=new Set<PacePreference>(["slow","balanced","full"]),energySet=new Set<DesiredEnergy>(["restore","balanced","stimulating"]),socialSet=new Set<SocialPreference>(["quiet","balanced","lively"]),noveltySet=new Set<NoveltyPreference>(["familiar","balanced","surprise"]),avoidSet=new Set<Avoidance>(["long-travel","high-cost","crowds","none"]),mustSet=new Set<MustHave>(["sea","nature","culture","nightlife","none"]),travelerSet=new Set<TravelerType>(["solo","couple","family","friends"]);

function profile(value:unknown):MissionProfileV34|undefined{
 const p=obj(value),moods=Array.isArray(p.moods)?p.moods.filter((x):x is Mood=>typeof x==="string"&&moodSet.has(x as Mood)).slice(0,3):[];
 const pace=typeof p.pace==="string"&&paceSet.has(p.pace as PacePreference)?p.pace as PacePreference:null,desiredEnergy=typeof p.desiredEnergy==="string"&&energySet.has(p.desiredEnergy as DesiredEnergy)?p.desiredEnergy as DesiredEnergy:null,socialPreference=typeof p.socialPreference==="string"&&socialSet.has(p.socialPreference as SocialPreference)?p.socialPreference as SocialPreference:null,noveltyPreference=typeof p.noveltyPreference==="string"&&noveltySet.has(p.noveltyPreference as NoveltyPreference)?p.noveltyPreference as NoveltyPreference:null,avoid=typeof p.avoid==="string"&&avoidSet.has(p.avoid as Avoidance)?p.avoid as Avoidance:null,mustHave=typeof p.mustHave==="string"&&mustSet.has(p.mustHave as MustHave)?p.mustHave as MustHave:null;
 if(!moods.length||!pace||!desiredEnergy||!socialPreference||!noveltyPreference||!avoid||!mustHave)return undefined;
 return{moods,pace,desiredEnergy,socialPreference,noveltyPreference,avoid,mustHave};
}

export function inferMissionProfileV34(mission:TravelMissionV34|null,fallbackMood:Mood="relax"):MissionProfileV34{
 if(mission?.escapeDna.profile)return mission.escapeDna.profile;
 const semantic=[mission?.needText??"",...(mission?.escapeDna.signals??[])].join(" ").toLowerCase(),moods:Mood[]=[];
 const add=(m:Mood,r:RegExp)=>{if(r.test(semantic)&&!moods.includes(m))moods.push(m)};
 add("relax",/(reset|αποφόρ|ηρεμ|ήσυχ|quiet|relax|ανάσα|ξεκουρ)/);add("romantic",/(χρόνος μαζί|ρομαν|romantic|couple|ζευγ|partner)/);add("food",/(φαγη|φαγητό|food|restaurant|γαστρο|καλό φαγητό)/);add("warmth",/(ήλιος|ηλιο|ζεστ|sun|warm)/);add("nature",/(φύση|φυση|nature|green|mountain|βουν)/);add("culture",/(πολιτισ|culture|history|ιστορ)/);add("adventure",/(περιπετ|adventure|κάτι διαφορετικό|something different|surprise)/);add("city",/(city|πόλη|πολη|urban)/);if(!moods.length)moods.push(fallbackMood);
 const desiredEnergy:DesiredEnergy=/(reset|αποφόρ|ηρεμ|ήσυχ|quiet|ξεκουρ)/.test(semantic)?"restore":/(energy|ενέργ|ζωνταν|adventure|περιπετ)/.test(semantic)?"stimulating":"balanced";
 const socialPreference:SocialPreference=/(ήσυχ|ησυχ|quiet|low crowd|χαμηλ)/.test(semantic)?"quiet":/(lively|ζωνταν|nightlife|βραδιν)/.test(semantic)?"lively":"balanced";
 const noveltyPreference:NoveltyPreference=/(κάτι διαφορετικό|something different|surprise|έκπλη|εκπλη)/.test(semantic)?"surprise":/(σίγουρ|σιγουρ|familiar|γνωστ)/.test(semantic)?"familiar":"balanced";
 const avoid:Avoidance=/(χαμηλή ταλαιπωρία|low friction|χωρίς ταλαιπωρ|easy travel)/.test(semantic)?"long-travel":/(crowd|κόσμο|κοσμο|τουριστ)/.test(semantic)?"crowds":/(value|αξία|premium χωρίς|high cost)/.test(semantic)?"high-cost":"none";
 const mustHave:MustHave=/(θάλασσ|θαλασσ|sea|beach)/.test(semantic)?"sea":/(φύση|φυση|nature|βουν)/.test(semantic)?"nature":/(πολιτισ|culture|history)/.test(semantic)?"culture":/(nightlife|βραδιν)/.test(semantic)?"nightlife":"none";
 return{moods:moods.slice(0,3),pace:desiredEnergy==="restore"?"slow":desiredEnergy==="stimulating"?"full":"balanced",desiredEnergy,socialPreference,noveltyPreference,avoid,mustHave};
}

export async function loadMissionV34(id:string|null|undefined):Promise<TravelMissionV34|null>{
 if(!id||!uuid.test(id))return null;const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!base||!key)return null;
 try{const url=new URL("/rest/v1/travel_missions",base);url.searchParams.set("id",`eq.${id}`);url.searchParams.set("select","id,need_text,origin_text,budget_eur,travelers,travel_window,escape_dna");url.searchParams.set("limit","1");const response=await fetch(url,{cache:"no-store",headers:{apikey:key,Authorization:`Bearer ${key}`}});if(!response.ok)return null;const rows=await response.json() as Array<Record<string,unknown>>,row=rows[0];if(!row)return null;const travelers=obj(row.travelers),window=obj(row.travel_window),dna=obj(row.escape_dna),type=typeof travelers.type==="string"&&travelerSet.has(travelers.type as TravelerType)?travelers.type as TravelerType:undefined,groupSize=Number.isInteger(Number(travelers.groupSize))?Number(travelers.groupSize):undefined,signals=Array.isArray(dna.signals)?dna.signals.filter((x):x is string=>typeof x==="string").slice(0,8):undefined,parsedProfile=profile(dna.profile);
 return{id:String(row.id),needText:str(row.need_text)??"",originText:str(row.origin_text),budgetEur:num(row.budget_eur),travelers:{...(type?{type}:{}),...(groupSize?{groupSize}:{})},travelWindow:{label:str(window.label)??undefined,start:str(window.start)??undefined,end:str(window.end)??undefined},escapeDna:{...(signals?{signals}:{}),...(parsedProfile?{profile:parsedProfile}:{})}}}catch{return null}
}
