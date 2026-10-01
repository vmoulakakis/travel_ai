import {asRecordArray,asString,asStringArray,qualitativeConfidence,runAgentJsonV70} from "@/lib/ai/agentic-model-v70";
import {
 compactCandidateForPromptV70,loadAgentProfilesV70,loadCandidateUniverseV70,loadDestinationBundleV70,saveDiscoverySnapshotV70,
 type AgentProfileV70,type CandidateNodeV70,type JsonRecord,type V70Locale
} from "@/lib/ai/travel-intelligence-v70";
import {defaultDiscoveryWindowV70,loadWeatherContextsV70} from "@/lib/ai/weather-context-v70";

export type DiscoveryPickV70={
 key:string;name:string;region:string;whyNow:string;experience:string;seasonalNote:string;weatherNote:string;
 confidence:"low"|"medium"|"high";pinRole:"featured"|"exceptional"|"smart-alternative"|"unexpected";evidenceRefs:string[];
};
export type Discovery50V70={version:70;generatedAt:string;window:{startDate:string;endDate:string};picks:DiscoveryPickV70[];models:JsonRecord;evidenceState:JsonRecord};

type Scout={candidateKeys:string[];hypotheses:JsonRecord[];narrative:string};
function agent(profiles:Map<string,AgentProfileV70>,id:string){const p=profiles.get(id);if(!p)throw new Error(`Missing V70 agent profile: ${id}`);return p}
function athensNow(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Athens",year:"numeric",month:"2-digit",day:"2-digit",weekday:"long",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date())}
function validateScout(v:JsonRecord):Scout|null{const keys=asStringArray(v.candidateKeys,70);if(keys.length<50)return null;return{candidateKeys:keys,hypotheses:asRecordArray(v.hypotheses,70),narrative:asString(v.narrative,1200)}}
function validatePicks(v:JsonRecord):DiscoveryPickV70[]|null{
 const rows=asRecordArray(v.picks,50).map((x,index):DiscoveryPickV70=>({
  key:asString(x.key,180),name:asString(x.name,160),region:asString(x.region,160),whyNow:asString(x.whyNow,700),experience:asString(x.experience,600),
  seasonalNote:asString(x.seasonalNote,500),weatherNote:asString(x.weatherNote,500),confidence:qualitativeConfidence(x.confidence),
  pinRole:x.pinRole==="unexpected"?"unexpected":x.pinRole==="smart-alternative"?"smart-alternative":x.pinRole==="featured"?"featured":index<12?"exceptional":"smart-alternative",
  evidenceRefs:asStringArray(x.evidenceRefs,15)
 }));
 if(rows.length!==50||new Set(rows.map(x=>x.key)).size!==50||rows.some(x=>!x.key||!x.name||!x.whyNow))return null;
 return rows;
}
function compact(nodes:CandidateNodeV70[]){return nodes.map(n=>{const c=compactCandidateForPromptV70(n);return{key:c.key,name:c.name,region:c.region,stays:c.stays,offers:c.offers,demandSignal:c.demandSignal,summary:String(c.summary??"").slice(0,170),evidence:c.evidence,lat:c.lat,lng:c.lng}})}

export async function generateDiscovery50V70(locale:V70Locale="el"):Promise<Discovery50V70>{
 const [profiles,universe]=await Promise.all([loadAgentProfilesV70(),loadCandidateUniverseV70(locale,574)]),window=defaultDiscoveryWindowV70(),allowed=new Set(universe.map(x=>x.node_key));
 const scoutPrompt=`CURRENT LOCAL TIME IN GREECE: ${athensNow()}\nDISCOVERY WINDOW: ${JSON.stringify(window)}\nLOCALE: ${locale}\n\nFULL CURRENT GREECE RETRIEVAL UNIVERSE (not pre-ranked):\n${JSON.stringify(compact(universe))}\n\nBuild a broad discovery set for a first-time visitor who has not supplied personal preferences yet. Select exactly 60 defensible candidate keys across Greece for what is worth considering now. Reason contextually about season, time of year, experience quality, operating/supply evidence, current demand as one signal, geography and variety. Do not apply a fixed formula. Do not manufacture live weather. Preserve regional/experience diversity and include less obvious choices when supported. Return JSON: candidateKeys[] exactly 60, hypotheses[] with key,whyNow,experienceType,verificationNeed, and narrative. No numeric fit scores.`;
 const scoutRun=await runAgentJsonV70({profile:agent(profiles,"greece-explorer"),prompt:scoutPrompt,validate:validateScout,maxOutputTokens:1500});
 const keys=[...new Set(scoutRun.value.candidateKeys.filter(k=>allowed.has(k)))].slice(0,60);
 if(keys.length<50)throw new Error("V70 discovery scout produced fewer than 50 valid Greece candidates");
 const nodes=keys.map(k=>universe.find(n=>n.node_key===k)).filter((n):n is CandidateNodeV70=>Boolean(n));
 const [weather,bundle]=await Promise.all([
  loadWeatherContextsV70(nodes,{...window,locale,limit:60}),
  loadDestinationBundleV70(keys.slice(0,40),locale,2,120)
 ]);
 const weatherByKey=new Map(weather.map(w=>[w.key,w]));
 const finalPrompt=`CURRENT LOCAL TIME IN GREECE: ${athensNow()}\nDISCOVERY WINDOW: ${JSON.stringify(window)}\nSCOUT HYPOTHESES:\n${JSON.stringify(scoutRun.value.hypotheses)}\nCANDIDATE METADATA:\n${JSON.stringify(nodes.map(n=>compact(n as CandidateNodeV70)).flat())}\nWEATHER EVIDENCE (facts/uncertainty only; absence means unknown):\n${JSON.stringify(weather)}\nSAMPLED KNOWLEDGE FACTS/GRAPH FOR THE DISCOVERY SET:\n${JSON.stringify({facts:bundle.facts.slice(0,100),edges:bundle.edges.slice(0,140),entities:bundle.entities.slice(0,80)})}\n\nChoose exactly 50 places for the default TravelAI map. This is an editorial/agentic discovery portfolio, not a mathematical leaderboard. Every choice must be defensible now from context/evidence; weather evidence should inform lived experience when present and remain explicitly unknown when absent. Keep Greece-wide geographic and experience diversity. Do not rotate for novelty alone. Return JSON object with picks[] exactly 50. Each pick: key,name,region,whyNow,experience,seasonalNote,weatherNote,confidence(low|medium|high),pinRole(featured|exceptional|smart-alternative|unexpected),evidenceRefs[]. No numeric ranking score.`;
 const finalRun=await runAgentJsonV70({profile:agent(profiles,"greece-explorer"),prompt:finalPrompt,validate:v=>{const picks=validatePicks(v);return picks?{picks}:null},maxOutputTokens:3600});
 const picks=finalRun.value.picks.filter(p=>allowed.has(p.key));
 if(picks.length!==50)throw new Error("V70 discovery finalizer returned invalid keys");
 const evidenceState={candidateUniverse:universe.length,scoutCandidates:keys.length,weatherChecked:weather.length,knowledgeFacts:bundle.facts.length,graphEdges:bundle.edges.length,knowledgeEntities:bundle.entities.length,weatherCoverage:Object.fromEntries(keys.map(k=>[k,weatherByKey.has(k)?"checked":"unknown"]))};
 await saveDiscoverySnapshotV70({locale,context:{mode:"default-greece",window,localTime:athensNow()},picks,evidenceState,modelLabel:finalRun.modelLabel,ttlHours:18});
 return{version:70,generatedAt:new Date().toISOString(),window,picks,models:{scout:scoutRun.modelLabel,finalizer:finalRun.modelLabel},evidenceState};
}
