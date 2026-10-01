import {asRecord,asRecordArray,asString,asStringArray,qualitativeConfidence,runAgentJsonV70} from "@/lib/ai/agentic-model-v70";
import {
 appendFunnelTurnV70,compactCandidateForPromptV70,loadAgentProfilesV70,loadCandidateUniverseV70,loadDestinationBundleV70,
 loadFunnelTurnsV70,loadGuestMemoryV70,updateFunnelSessionV70,
 type AgentProfileV70,type CandidateNodeV70,type FunnelSessionV70,type JsonRecord,type V70Locale
} from "@/lib/ai/travel-intelligence-v70";
import {loadWeatherContextsV70} from "@/lib/ai/weather-context-v70";

export type TopChoiceV70={
 key:string;name:string;role:"best"|"alternative"|"wildcard";whyYou:string;whyNow:string;experience:string;tradeoff:string;
 confidence:"low"|"medium"|"high";uncertainty:string;evidenceRefs:string[];nextAction:string;
};
export type FunnelResultV70={
 version:70;sessionId:string;stage:"clarify"|"top3";assistantMessage:string;questionKey?:string|null;
 context:JsonRecord;contextConfidence:"low"|"medium"|"high";candidateKeys:string[];mapCandidates:Array<ReturnType<typeof publicCandidate>>;
 top3:TopChoiceV70[];models:JsonRecord;
};

type ContextDecision={context:JsonRecord;confidence:"low"|"medium"|"high";needsClarification:boolean;question:string;questionKey:string;knownFacts:string[];uncertainties:string[];summary:string};
type ExplorerDecision={candidateKeys:string[];hypotheses:JsonRecord[];portfolioNarrative:string};
type Finding={summary:string;observations:JsonRecord[];uncertainties:string[];candidateKeys:string[]};
type CriticDecision={survivors:string[];objections:JsonRecord[];missingEvidence:string[];summary:string};
type SynthDecision={ready:boolean;question:string;questionKey:string;message:string;top3:TopChoiceV70[]};

function profile(profiles:Map<string,AgentProfileV70>,id:string){const value=profiles.get(id);if(!value)throw new Error(`Missing V70 agent profile: ${id}`);return value}
function athensNow(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Athens",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date())}
function validIsoDate(value:unknown):value is string{return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`))}
function publicCandidate(node:CandidateNodeV70){return{key:node.node_key,slug:node.canonical_slug,name:node.display_name,region:node.region_label,latitude:node.latitude,longitude:node.longitude,propertyCount:node.property_count,offerCount:node.offer_count,priceMin:node.min_price,priceMax:node.max_price,currency:node.currency}}
function compactCatalog(nodes:CandidateNodeV70[]){return nodes.map(n=>{const c=compactCandidateForPromptV70(n);return{key:c.key,name:c.name,region:c.region,lat:c.lat,lng:c.lng,stays:c.stays,offers:c.offers,priceMin:c.priceMin,priceMax:c.priceMax,currency:c.currency,demandSignal:c.demandSignal,summary:String(c.summary??"").slice(0,190),evidence:c.evidence,contentStatus:c.contentStatus}})}
function conversationText(turns:Awaited<ReturnType<typeof loadFunnelTurnsV70>>){return turns.slice(-18).map(t=>`${t.role.toUpperCase()}: ${t.content}`).join("\n")}
function mergeContext(previous:JsonRecord,next:JsonRecord){return{...previous,...Object.fromEntries(Object.entries(next).filter(([,v])=>v!==null&&v!==""&&v!==undefined))}}
function safeKeys(keys:string[],allowed:Set<string>,limit:number){return [...new Set(keys.filter(k=>allowed.has(k)))].slice(0,limit)}
function asBool(v:unknown){return v===true}

function validateContext(value:JsonRecord):ContextDecision|null{
 const context=asRecord(value.context),needsClarification=asBool(value.needsClarification),question=asString(value.question,500),summary=asString(value.summary,800);
 if(needsClarification&&!question)return null;
 return{context,confidence:qualitativeConfidence(value.confidence),needsClarification,question,questionKey:asString(value.questionKey,80),knownFacts:asStringArray(value.knownFacts,30),uncertainties:asStringArray(value.uncertainties,30),summary};
}
function validateExplorer(value:JsonRecord):ExplorerDecision|null{
 const candidateKeys=asStringArray(value.candidateKeys,45),hypotheses=asRecordArray(value.hypotheses,45);
 if(candidateKeys.length<3)return null;
 return{candidateKeys,hypotheses,portfolioNarrative:asString(value.portfolioNarrative,900)};
}
function validateFinding(value:JsonRecord):Finding|null{
 const summary=asString(value.summary,1200),observations=asRecordArray(value.observations,60);
 if(!summary&&!observations.length)return null;
 return{summary,observations,uncertainties:asStringArray(value.uncertainties,40),candidateKeys:asStringArray(value.candidateKeys,40)};
}
function validateCritic(value:JsonRecord):CriticDecision|null{
 const survivors=asStringArray(value.survivors,20),summary=asString(value.summary,1200);
 if(survivors.length<3)return null;
 return{survivors,objections:asRecordArray(value.objections,60),missingEvidence:asStringArray(value.missingEvidence,40),summary};
}
function validateSynth(value:JsonRecord):SynthDecision|null{
 const ready=value.ready===true,question=asString(value.question,500),message=asString(value.message,1200),raw=asRecordArray(value.top3,3),top3:TopChoiceV70[]=raw.map((x,index)=>({
  key:asString(x.key,180),name:asString(x.name,160),role:x.role==="wildcard"?"wildcard":x.role==="alternative"?"alternative":index===0?"best":"alternative",
  whyYou:asString(x.whyYou,700),whyNow:asString(x.whyNow,700),experience:asString(x.experience,700),tradeoff:asString(x.tradeoff,500),
  confidence:qualitativeConfidence(x.confidence),uncertainty:asString(x.uncertainty,500),evidenceRefs:asStringArray(x.evidenceRefs,20),nextAction:asString(x.nextAction,240)
 }));
 if(ready){if(top3.length!==3||new Set(top3.map(x=>x.key)).size!==3||top3.some(x=>!x.key||!x.name||!x.whyYou))return null}
 else if(!question)return null;
 return{ready,question,questionKey:asString(value.questionKey,80),message,top3};
}

async function interpretContext(input:{session:FunnelSessionV70;message:string;turns:Awaited<ReturnType<typeof loadFunnelTurnsV70>>;memory:JsonRecord|null;locale:V70Locale;agent:AgentProfileV70}){
 const prompt=`CURRENT LOCAL TIME (Europe/Athens): ${athensNow()}\nLOCALE: ${input.locale}\nPREVIOUS STRUCTURED CONTEXT:\n${JSON.stringify(input.session.current_context)}\nOPTIONAL PAST TRAVEL MEMORY (soft evidence only; current request always wins):\n${JSON.stringify(input.memory??{})}\nCONVERSATION:\n${conversationText(input.turns)}\nCURRENT USER MESSAGE:\n${input.message}\n\nReconstruct the traveller context. Resolve relative dates against the supplied Athens time when possible. Return JSON with: context (flat structured facts such as origin,startDate,endDate,nights,travellers,companions,budget,transport,mobility,energy,psychology,desiredExperience,mustHaves,avoidances,stayNeeds,foodInterests,pace,novelty and any explicit constraints); confidence ('low'|'medium'|'high'); needsClarification boolean; question; questionKey; knownFacts[]; uncertainties[]; summary. Ask exactly one concise question only if its answer can materially change the travel decision. Do not ask for information already present.`;
 return runAgentJsonV70({profile:input.agent,prompt,validate:validateContext,maxOutputTokens:850});
}

async function exploreGreece(input:{context:JsonRecord;needsClarification:boolean;question:string;universe:CandidateNodeV70[];agent:AgentProfileV70;locale:V70Locale}){
 const target=input.needsClarification?"Return 18-40 provisional candidate keys so the map can progressively narrow while we wait for the answer.":"Return 10-18 serious candidate keys for deep multi-agent comparison.";
 const prompt=`LOCAL TIME: ${athensNow()}\nTRAVELLER CONTEXT:\n${JSON.stringify(input.context)}\nPENDING CLARIFICATION: ${input.needsClarification?input.question:"none"}\n\nGREECE CANDIDATE UNIVERSE (retrieval catalogue, NOT a ranking):\n${JSON.stringify(compactCatalog(input.universe))}\n\nExplore Greece contextually. ${target}\nConsider the complete experience, time/season, traveller psychology, companions, geography, supply/evidence and meaningful variety. Demand/popularity fields are context signals only, never automatic rank. Include surprising/micro-region choices when defensible. Return JSON: candidateKeys[], hypotheses[] where each has key,experienceHypothesis,whyPlausible,whatNeedsVerification, and portfolioNarrative. Never output numeric fit scores.`;
 return runAgentJsonV70({profile:input.agent,prompt,validate:validateExplorer,maxOutputTokens:1100});
}

async function runFinding(agent:AgentProfileV70,prompt:string){return runAgentJsonV70({profile:agent,prompt,validate:validateFinding,maxOutputTokens:1000})}

export async function runProgressiveFunnelV70(input:{session:FunnelSessionV70;message:string}):Promise<FunnelResultV70>{
 const locale=input.session.locale??"el",message=input.message.trim().slice(0,3000);
 if(!message)throw new Error("TravelAI V70 requires a user message");
 const [profiles,oldTurns,memory]=await Promise.all([loadAgentProfilesV70(),loadFunnelTurnsV70(input.session.id,28),loadGuestMemoryV70(input.session.profile_key)]);
 await appendFunnelTurnV70({sessionId:input.session.id,role:"user",content:message,stage:input.session.status});
 const contextRun=await interpretContext({session:input.session,message,turns:[...oldTurns,{id:0,session_id:input.session.id,role:"user",content:message,stage:input.session.status,structured_extract:{},evidence_refs:[],created_at:new Date().toISOString()}],memory,locale,agent:profile(profiles,"context-interpreter")});
 const context=mergeContext(input.session.current_context,contextRun.value.context),universe=await loadCandidateUniverseV70(locale,574),allowed=new Set(universe.map(n=>n.node_key));
 const explorerRun=await exploreGreece({context,needsClarification:contextRun.value.needsClarification,question:contextRun.value.question,universe,agent:profile(profiles,"greece-explorer"),locale});
 const candidateKeys=safeKeys(explorerRun.value.candidateKeys,allowed,contextRun.value.needsClarification?40:18),candidateNodes=candidateKeys.map(k=>universe.find(n=>n.node_key===k)).filter((n):n is CandidateNodeV70=>Boolean(n));
 if(candidateKeys.length<3)throw new Error("V70 explorer did not return enough valid Greece candidates");
 const models:JsonRecord={context:contextRun.modelLabel,explorer:explorerRun.modelLabel};
 if(contextRun.value.needsClarification){
  const question=contextRun.value.question;
  await updateFunnelSessionV70(input.session.id,{status:"clarifying",current_context:context,context_confidence:contextRun.value.confidence,unresolved_questions:[{key:contextRun.value.questionKey,question}],candidate_keys:candidateKeys,top3:[],model_trace:{...input.session.model_trace,lastModels:models,lastContextSummary:contextRun.value.summary}});
  await appendFunnelTurnV70({sessionId:input.session.id,role:"assistant",content:question,stage:"clarifying",structuredExtract:{questionKey:contextRun.value.questionKey,contextConfidence:contextRun.value.confidence},evidenceRefs:candidateKeys});
  return{version:70,sessionId:input.session.id,stage:"clarify",assistantMessage:question,questionKey:contextRun.value.questionKey||null,context,contextConfidence:contextRun.value.confidence,candidateKeys,mapCandidates:candidateNodes.map(publicCandidate),top3:[],models};
 }

 const bundle=await loadDestinationBundleV70(candidateKeys,locale,5,110);
 const startDate=context.startDate,endDate=context.endDate;
 const weather=validIsoDate(startDate)&&validIsoDate(endDate)?await loadWeatherContextsV70(candidateNodes,{startDate,endDate,locale,limit:18}):[];
 const evidenceFrame={context,hypotheses:explorerRun.value.hypotheses,destinations:bundle.destinations,entities:bundle.entities,facts:bundle.facts,edges:bundle.edges,stays:bundle.stays,weather};
 const [timeRun,spatialRun,experienceRun]=await Promise.all([
  runFinding(profile(profiles,"time-weather"),`TRAVELLER CONTEXT:\n${JSON.stringify(context)}\nCANDIDATE HYPOTHESES:\n${JSON.stringify(explorerRun.value.hypotheses)}\nWEATHER/TIME EVIDENCE:\n${JSON.stringify(weather)}\nVERIFIED FACTS:\n${JSON.stringify(bundle.facts.slice(0,120))}\nReturn JSON: summary, observations[] (candidateKey, conclusion, evidenceRefs, uncertainty), uncertainties[], candidateKeys[]. Interpret conditions as lived experience; do not score candidates.`),
  runFinding(profile(profiles,"spatial-reasoner"),`TRAVELLER CONTEXT:\n${JSON.stringify(context)}\nDESTINATIONS:\n${JSON.stringify(bundle.destinations)}\nGRAPH EDGES:\n${JSON.stringify(bundle.edges.slice(0,220))}\nCANDIDATE HYPOTHESES:\n${JSON.stringify(explorerRun.value.hypotheses)}\nReturn JSON: summary, observations[] (candidateKey, spatialConclusion, friction, evidenceRefs, uncertainty), uncertainties[], candidateKeys[]. Reject only factual impossibilities; otherwise reason about practical travel coherence without a distance score.`),
  runFinding(profile(profiles,"experience-composer"),`TRAVELLER CONTEXT:\n${JSON.stringify(context)}\nDESTINATION BUNDLE:\n${JSON.stringify({destinations:bundle.destinations,entities:bundle.entities.slice(0,100),facts:bundle.facts.slice(0,160),edges:bundle.edges.slice(0,220),stays:bundle.stays.slice(0,80)})}\nCANDIDATE HYPOTHESES:\n${JSON.stringify(explorerRun.value.hypotheses)}\nReturn JSON: summary, observations[] (candidateKey, experienceShape, microPlaces, foodCultureNature, stayLogic, evidenceRefs, uncertainty), uncertainties[], candidateKeys[]. Compose coherent experiences rather than checklists; do not score.`)
 ]);
 Object.assign(models,{timeWeather:timeRun.modelLabel,spatial:spatialRun.modelLabel,experience:experienceRun.modelLabel});
 const criticPrompt=`TRAVELLER CONTEXT:\n${JSON.stringify(context)}\nHYPOTHESES:\n${JSON.stringify(explorerRun.value.hypotheses)}\nTIME/WEATHER FINDINGS:\n${JSON.stringify(timeRun.value)}\nSPATIAL FINDINGS:\n${JSON.stringify(spatialRun.value)}\nEXPERIENCE FINDINGS:\n${JSON.stringify(experienceRun.value)}\n\nAttack the candidates. Return JSON: survivors[] (candidate keys; keep at least 3 only if defensible), objections[] (candidateKey, objection, severity qualitative, evidenceRefs, whatWouldChangeIt), missingEvidence[], summary. Do not rank or score.`;
 const criticRun=await runAgentJsonV70({profile:profile(profiles,"skeptical-critic"),prompt:criticPrompt,validate:validateCritic,maxOutputTokens:1100});
 models.critic=criticRun.modelLabel;
 const survivors=safeKeys(criticRun.value.survivors,new Set(candidateKeys),12);
 if(survivors.length<3)throw new Error("V70 critic found fewer than three defensible candidates; clarification/recovery workflow required");
 const survivorNodes=survivors.map(k=>universe.find(n=>n.node_key===k)).filter((n):n is CandidateNodeV70=>Boolean(n));
 const synthPrompt=`TRAVELLER CONTEXT:\n${JSON.stringify(context)}\nEXPLORER:\n${JSON.stringify(explorerRun.value)}\nTIME/WEATHER:\n${JSON.stringify(timeRun.value)}\nSPATIAL:\n${JSON.stringify(spatialRun.value)}\nEXPERIENCE:\n${JSON.stringify(experienceRun.value)}\nCRITIC:\n${JSON.stringify(criticRun.value)}\nSURVIVING DESTINATIONS:\n${JSON.stringify(survivorNodes.map(publicCandidate))}\n\nDecide whether the evidence and traveller context are sufficient for a defensible Top 3. If not, ask exactly one high-information clarification. If ready, return exactly three distinct choices with roles best, alternative, wildcard. Confidence must be qualitative and based on evidence consistency/uncertainty, never a numeric score. Return JSON: ready, question, questionKey, message, top3[]. Each top3 item: key,name,role,whyYou,whyNow,experience,tradeoff,confidence,uncertainty,evidenceRefs[],nextAction.`;
 const synthRun=await runAgentJsonV70({profile:profile(profiles,"journey-synthesizer"),prompt:synthPrompt,validate:validateSynth,maxOutputTokens:1500});
 models.synthesizer=synthRun.modelLabel;
 if(!synthRun.value.ready){
  const question=synthRun.value.question;
  await updateFunnelSessionV70(input.session.id,{status:"clarifying",current_context:context,context_confidence:contextRun.value.confidence,unresolved_questions:[{key:synthRun.value.questionKey,question}],candidate_keys:survivors,top3:[],model_trace:{...input.session.model_trace,lastModels:models,critic:criticRun.value.summary}});
  await appendFunnelTurnV70({sessionId:input.session.id,role:"assistant",content:question,stage:"clarifying",structuredExtract:{questionKey:synthRun.value.questionKey},evidenceRefs:survivors});
  return{version:70,sessionId:input.session.id,stage:"clarify",assistantMessage:question,questionKey:synthRun.value.questionKey||null,context,contextConfidence:contextRun.value.confidence,candidateKeys:survivors,mapCandidates:survivorNodes.map(publicCandidate),top3:[],models};
 }
 const top3=synthRun.value.top3.filter(x=>allowed.has(x.key));
 if(top3.length!==3)throw new Error("V70 synthesizer returned invalid destination keys");
 const topKeys=top3.map(x=>x.key),topNodes=topKeys.map(k=>universe.find(n=>n.node_key===k)).filter((n):n is CandidateNodeV70=>Boolean(n));
 const assistantMessage=synthRun.value.message||(locale==="en"?"These are the three experiences I can defend best for your context.":"Αυτές είναι οι τρεις εμπειρίες που μπορώ να υποστηρίξω καλύτερα για το δικό σου context.");
 await updateFunnelSessionV70(input.session.id,{status:"ready_top3",current_context:context,context_confidence:contextRun.value.confidence,unresolved_questions:[],candidate_keys:topKeys,top3,model_trace:{...input.session.model_trace,lastModels:models,critic:criticRun.value.summary,evidence:{facts:bundle.facts.length,edges:bundle.edges.length,stays:bundle.stays.length,weather:weather.length}}});
 await appendFunnelTurnV70({sessionId:input.session.id,role:"assistant",content:assistantMessage,stage:"ready_top3",structuredExtract:{top3},evidenceRefs:top3.flatMap(x=>x.evidenceRefs)});
 return{version:70,sessionId:input.session.id,stage:"top3",assistantMessage,context,contextConfidence:contextRun.value.confidence,candidateKeys:topKeys,mapCandidates:topNodes.map(publicCandidate),top3,models};
}
