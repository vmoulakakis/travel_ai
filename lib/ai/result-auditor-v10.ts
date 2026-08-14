import { geographyConstraint, matchesGeographyConstraint } from "@/lib/decision/geography-constraint";
import { diversifyV8, type V8Ranked } from "@/lib/decision/v8-matcher";
import type { TripRequest } from "@/lib/validation/trip";
import { researchIntent, satisfiesResearchNeed } from "@/lib/decision/research-intent-v13";
import type { DestinationEvidenceBundle } from "@/lib/decision/types";
import { createLLMRequestBudgetV16,generateJsonWithRoutingV16,type LLMRequestBudgetV16 } from "@/lib/ai/model-router-v9";

export type AuditIssue={slug:string;code:"HARD_CONSTRAINT"|"MUST_HAVE"|"LOW_EVIDENCE"|"RESEARCH_EVIDENCE";detail:string};
export type AuditResult={passed:boolean;confidence:"HIGH"|"MEDIUM"|"LOW";issues:AuditIssue[];attempts:number;checkedBy:"deterministic"|"deterministic+local-llm"};

function mustHave(request:TripRequest,item:V8Ranked){if(request.mustHave==="sea")return item.destination.tags.includes("beach");if(request.mustHave==="nature")return item.destination.tags.includes("nature");if(request.mustHave==="culture")return item.destination.tags.includes("culture");if(request.mustHave==="nightlife")return item.destination.tags.includes("nightlife")||item.destination.tags.includes("city");return true}
function deterministicAudit(request:TripRequest,items:V8Ranked[],catalog:V8Ranked["destination"][],evidence?:Map<string,DestinationEvidenceBundle>):AuditIssue[]{const constraint=geographyConstraint(request,catalog),research=researchIntent(request),issues:AuditIssue[]=[];for(const item of items){if(!matchesGeographyConstraint(item.destination,constraint))issues.push({slug:item.destination.slug,code:"HARD_CONSTRAINT",detail:"Does not satisfy the explicit free-text constraint"});if(!mustHave(request,item))issues.push({slug:item.destination.slug,code:"MUST_HAVE",detail:"Does not satisfy the selected must-have"});if(item.breakdown.season<35||item.breakdown.routeConfidence<45)issues.push({slug:item.destination.slug,code:"LOW_EVIDENCE",detail:"Season or route evidence is below the safe floor"});const bundle=evidence?.get(item.destination.slug);for(const need of research.needs)if(!bundle||!satisfiesResearchNeed(bundle,need))issues.push({slug:item.destination.slug,code:"RESEARCH_EVIDENCE",detail:`Missing verified ${need} evidence for the requested dates`});}return issues}

async function localAudit(request:TripRequest,items:V8Ranked[],budget:LLMRequestBudgetV16):Promise<Set<string>>{
 const candidates=items.map(item=>({slug:item.destination.slug,tags:item.destination.tags,seasonProfile:item.destination.seasonProfile,evidence:item.breakdown}));
 const routed=await generateJsonWithRoutingV16<{reject_slugs:string[]}>({
  context:{task:"verification",text:request.tripText,deterministicConfidence:.86,hardConstraintRisk:false,contradictorySignals:false},budget,
  system:"You are an independent result auditor, never a recommender. Audit only against supplied constraints and evidence. Never invent facts.",
  prompt:`Find only candidates that contradict the explicit request or supplied structured evidence. Return JSON only: {"reject_slugs":[]}. Request=${JSON.stringify({freeText:request.tripText,mustHave:request.mustHave,avoid:request.avoid,distance:request.distancePreference,dates:[request.startDate,request.endDate]})}; Candidates=${JSON.stringify(candidates)}`,
  validate(value){const reject_slugs=Array.isArray(value.reject_slugs)?value.reject_slugs.filter((slug):slug is string=>typeof slug==="string"&&items.some(item=>item.destination.slug===slug)):[];return{reject_slugs};}
 });
 return new Set(routed?.value.reject_slugs??[]);
}

export async function auditAndRepairV10(request:TripRequest,initial:V8Ranked[],pool:V8Ranked[],limit=12,evidence?:Map<string,DestinationEvidenceBundle>,budget:LLMRequestBudgetV16=createLLMRequestBudgetV16()):Promise<{items:V8Ranked[];audit:AuditResult}>{
 const catalog=pool.map(item=>item.destination);let items=initial.slice(0,limit),lastIssues:AuditIssue[]=[],usedLLM=false;
 for(let attempt=1;attempt<=3;attempt+=1){
  const deterministic=deterministicAudit(request,items,catalog,evidence),localReject=deterministic.length?new Set<string>():await localAudit(request,items,budget);if(localReject.size)usedLLM=true;
  const localIssues=[...localReject].map(slug=>({slug,code:"LOW_EVIDENCE" as const,detail:"Independent audit rejected an evidence inconsistency"})),issues=[...deterministic,...localIssues];
  if(!issues.length)return{items,audit:{passed:true,confidence:"HIGH",issues:[],attempts:attempt,checkedBy:usedLLM?"deterministic+local-llm":"deterministic"}};
  lastIssues=issues;const rejected=new Set(issues.map(issue=>issue.slug)),survivors=pool.filter(item=>!rejected.has(item.destination.slug)&&!deterministicAudit(request,[item],catalog,evidence).length);items=diversifyV8(survivors,limit,request);if(!items.length)break;
 }
 return{items:[],audit:{passed:false,confidence:"LOW",issues:lastIssues,attempts:3,checkedBy:usedLLM?"deterministic+local-llm":"deterministic"}};
}
