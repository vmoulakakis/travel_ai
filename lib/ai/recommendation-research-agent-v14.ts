import { Output, ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";
import { createLLMRequestBudgetV16,routedModelsV16,type LLMRequestBudgetV16 } from "@/lib/ai/model-router-v9";
import type { V8Ranked } from "@/lib/decision/v8-matcher";
import type { TripRequest } from "@/lib/validation/trip";

type SourceEvidence={title:string;domain:string;url:string;snippet:string};
type CandidateEvidence={slug:string;name:string;sources:SourceEvidence[]};
export type ResearchScoutResult={
  ran:boolean;
  source:"agent"|"not-needed"|"no-model"|"no-evidence"|"failed";
  inspectedSlugs:string[];
  preferredSlugs:string[];
  rejectSlugs:string[];
  confidence:"HIGH"|"MEDIUM"|null;
  summary:string|null;
  evidenceDomains:string[];
};

const resultSchema=z.object({preferredSlugs:z.array(z.string()).max(3),rejectSlugs:z.array(z.string()).max(4),confidence:z.enum(["HIGH","MEDIUM"]),summary:z.string().max(280)});
type WikiPayload={query?:{pages?:Array<{title?:string;extract?:string}>}};
const clean=(value:unknown,max=700)=>typeof value==="string"?value.replace(/\s+/g," ").trim().slice(0,max):"";
const slugTitle=(value:string)=>value.replace(/ /g,"_");

async function wikiEvidence(host:string,query:string):Promise<SourceEvidence|null>{
 try{
  const url=new URL(`https://${host}/w/api.php`);url.search=new URLSearchParams({action:"query",generator:"search",gsrsearch:query,gsrlimit:"1",prop:"extracts",exintro:"1",explaintext:"1",redirects:"1",format:"json",formatversion:"2",origin:"*"}).toString();
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(3500)});if(!response.ok)return null;
  const payload=await response.json() as WikiPayload,page=payload.query?.pages?.[0],title=clean(page?.title,140),snippet=clean(page?.extract,700);if(!title||!snippet)return null;
  return{title,domain:host,url:`https://${host}/wiki/${encodeURIComponent(slugTitle(title))}`,snippet};
 }catch{return null}
}

async function collectEvidence(request:TripRequest,ranked:V8Ranked[]):Promise<CandidateEvidence[]>{
 const top=ranked.slice(0,6);
 const rows=await Promise.all(top.map(async item=>{
  const destination=item.destination,primary=request.language==="en"?"en.wikipedia.org":"el.wikipedia.org",primaryQuery=request.language==="en"?`${destination.nameEn} Greece`:destination.nameEl;
  const[wiki,voyage]=await Promise.all([wikiEvidence(primary,primaryQuery),wikiEvidence("en.wikivoyage.org",`${destination.nameEn} Greece`)]);
  const sources=[wiki,voyage].filter((source):source is SourceEvidence=>Boolean(source));return{slug:destination.slug,name:request.language==="en"?destination.nameEn:destination.nameEl,sources};
 }));
 return rows.filter(row=>row.sources.length>0);
}

export function shouldRunResearchScout(request:TripRequest,ranked:V8Ranked[]){
 if(!ranked.length)return false;
 const free=Boolean(request.tripText&&request.tripText.trim().length>=8),considered=Boolean(request.consideredDestination),evidenceHeavy=request.moods.some(mood=>["food","culture","nature","adventure"].includes(mood)),ambiguous=ranked.length>=3&&Math.abs(ranked[0].score-ranked[2].score)<=7;
 return free||considered||evidenceHeavy||ambiguous;
}

export function applyResearchScoutRanking(ranked:V8Ranked[],result:ResearchScoutResult){
 if(!result.ran)return ranked;
 const known=new Set(ranked.map(item=>item.destination.slug)),inspected=new Set(result.inspectedSlugs.filter(slug=>known.has(slug))),preferred=new Set(result.preferredSlugs.filter(slug=>known.has(slug)&&inspected.has(slug))),rejected=new Set(result.rejectSlugs.filter(slug=>known.has(slug)&&inspected.has(slug))),high=result.confidence==="HIGH";
 return ranked.map(item=>{let delta=0;if(preferred.has(item.destination.slug))delta+=high?7:4;if(rejected.has(item.destination.slug))delta-=high?8:5;return{...item,score:Math.max(0,Math.min(100,item.score+delta))};}).sort((a,b)=>b.score-a.score);
}

export async function runRecommendationResearchAgent(request:TripRequest,ranked:V8Ranked[],budget:LLMRequestBudgetV16=createLLMRequestBudgetV16()):Promise<ResearchScoutResult>{
 if(!shouldRunResearchScout(request,ranked))return{ran:false,source:"not-needed",inspectedSlugs:[],preferredSlugs:[],rejectSlugs:[],confidence:null,summary:null,evidenceDomains:[]};
 const ambiguous=ranked.length>=3&&Math.abs(ranked[0].score-ranked[2].score)<=5,hardLanguage=/\b(?:μονο|only|mono|χωρις|without|must|οπωσδηποτε)\b/i.test(request.tripText??"");
 const routes=routedModelsV16({task:"research",text:request.tripText,deterministicConfidence:ambiguous?.68:.86,hardConstraintRisk:hardLanguage,contradictorySignals:ambiguous&&hardLanguage},"creative");
 if(!routes.length)return{ran:false,source:"no-model",inspectedSlugs:[],preferredSlugs:[],rejectSlugs:[],confidence:null,summary:null,evidenceDomains:[]};
 const started=Date.now(),budgetMs=10_000;
 for(const route of routes){
  const remaining=Math.min(route.timeoutMs,budgetMs-(Date.now()-started));if(remaining<1500)break;
  // One forced tool turn + one final verdict turn. OpenAI is normally excluded here by the one-call escalation ceiling.
  if(!budget.reserve(route,2))continue;
  let evidence:CandidateEvidence[]=[];
  const searchTravelEvidence=tool({description:"Search fresh public destination evidence for every finalist before judging fit.",inputSchema:z.object({focus:z.enum(["fit","tradeoffs","local-character"])}),execute:async()=>{evidence=await collectEvidence(request,ranked);return{request:{dates:[request.startDate,request.endDate],moods:request.moods,mustHave:request.mustHave,avoid:request.avoid,freeText:request.tripText??null},candidates:evidence};}});
  const candidates=ranked.slice(0,6).map(item=>({slug:item.destination.slug,name:request.language==="en"?item.destination.nameEn:item.destination.nameEl,tags:item.destination.tags}));
  const instructions=`You are the Research Scout for a Greek travel recommender. You are not allowed to decide from memory. You MUST call searchTravelEvidence before producing an answer. Compare only supplied candidate slugs. Use only evidence returned by the tool plus supplied preferences. Never invent attractions, events, businesses, prices, routes, ratings, weather or availability. A rejectSlug requires a clear conflict visible in fetched evidence; missing evidence is not a rejection. Return preferredSlugs, rejectSlugs, confidence and a short summary.`;
  try{
   const agent=new ToolLoopAgent({model:route.model,instructions,tools:{searchTravelEvidence},output:Output.object({schema:resultSchema,name:"research_scout_result",description:"Grounded shortlist research verdict."}),stopWhen:isStepCount(3)});
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),remaining);
   try{
    const result=await agent.generate({prompt:`Traveler request=${JSON.stringify({origin:request.origin,dates:[request.startDate,request.endDate],nights:request.nights,budget:request.budget,groupSize:request.groupSize,moods:request.moods,travelerType:request.travelerType,mustHave:request.mustHave,avoid:request.avoid,pace:request.pace,desiredEnergy:request.desiredEnergy,socialPreference:request.socialPreference,tripText:request.tripText??null,consideredDestination:request.consideredDestination??null})}. Candidate slugs=${JSON.stringify(candidates)}. Search first, then return the grounded result.`,abortSignal:controller.signal,maxOutputTokens:route.maxOutputTokens});
    if(!result.output||!evidence.length)continue;
    const inspected=new Set(evidence.map(item=>item.slug)),preferred=result.output.preferredSlugs.filter(slug=>inspected.has(slug)&&ranked.some(item=>item.destination.slug===slug)),rejected=result.output.rejectSlugs.filter(slug=>inspected.has(slug)&&ranked.some(item=>item.destination.slug===slug)),evidenceDomains=[...new Set(evidence.flatMap(item=>item.sources.map(source=>source.domain)))];
    return{ran:true,source:"agent",inspectedSlugs:[...inspected],preferredSlugs:preferred,rejectSlugs:rejected,confidence:result.output.confidence,summary:result.output.summary,evidenceDomains};
   }finally{clearTimeout(timer)}
  }catch{
   // Continue through the threshold-approved ladder. No ungrounded result is allowed through.
  }
 }
 return{ran:false,source:"failed",inspectedSlugs:[],preferredSlugs:[],rejectSlugs:[],confidence:null,summary:null,evidenceDomains:[]};
}
