import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { verifyV8 } from "@/lib/ai/openai-verifier-v8";
import { auditAndRepairV10 } from "@/lib/ai/result-auditor-v10";
import { applyResearchScoutRanking,runRecommendationResearchAgent } from "@/lib/ai/recommendation-research-agent-v14";
import { writeRecommendationAudit,writeRecommendationAuditError } from "@/lib/ai/recommendation-audit";
import { runTravelCouncilV9 } from "@/lib/ai/travel-council-v9";
import { runtimeAgentRoles } from "@/lib/ai/agent-roles-v15";
import { createLLMRequestBudgetV16 } from "@/lib/ai/model-router-v9";
import { fullContinuity } from "@/lib/continuity";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { loadDestinationChoiceProfilesV22 } from "@/lib/data/destination-choice-profiles-v22";
import { loadLocalityProfilesV23 } from "@/lib/data/locality-profiles-v23";
import { recordV8RecommendationSession } from "@/lib/data/match-learning-v8";
import { enrichV8Weather } from "@/lib/data/weather-v8";
import { screenResearchEvidence } from "@/lib/decision/research-intent-v13";
import { buildSmartDateWindows } from "@/lib/decision/date-windows-v9";
import { canonicalRankingInputsV19 } from "@/lib/decision/canonical-ranking-v19";
import { semanticNeedsClarificationV19 } from "@/lib/ai/semantic-policy-v19";
import { diversifyV8,finalRankV8,preRankV8,responseFeasibility,toRecommendationsV8,type V8Ranked } from "@/lib/decision/v8-matcher";
import { applySemanticIntentRankingV18 } from "@/lib/decision/semantic-intent-ranking-v18";
import { applyChoiceCorrectnessV21,filterPortfolioV21 } from "@/lib/decision/choice-correctness-v21";
import { applyCriterionRelevanceV22 } from "@/lib/decision/criterion-relevance-v22";
import { applyLocalityFuzzyRankingV23 } from "@/lib/decision/locality-fuzzy-ranking-v23";
import { interpretStayConstraintsV16 } from "@/lib/ai/stay-constraint-interpreter-v16";
import { gateRankedByStayRequirementsV16 } from "@/lib/decision/stay-eligibility-v16";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

export type TravelOrchestratorEvent={type:string;progress:number;payload?:Record<string,unknown>};
export type TravelOrchestratorEmitter=(event:TravelOrchestratorEvent)=>void;
export class TravelDecisionError extends Error{constructor(public readonly status:number,public readonly publicMessage:string,public readonly stage:string){super(publicMessage);this.name="TravelDecisionError"}}
const noop:TravelOrchestratorEmitter=()=>{};
function repair(request:TripRequest,selected:V8Ranked[],pool:V8Ranked[],reject:string[]){if(!reject.length)return selected;const bad=new Set(reject);return diversifyV8(pool.filter(item=>!bad.has(item.destination.slug)),12,request)}
function profileSummary(trip:TripRequest){if(trip.language==="en"){const energy=trip.desiredEnergy==="restore"?"restoration":trip.desiredEnergy==="stimulating"?"energy and discovery":"balance";const social=trip.socialPreference==="quiet"?"a quiet rhythm":trip.socialPreference==="lively"?"lively energy":"a flexible social rhythm";return `${energy}, ${social}, ${trip.nights} nights, ${trip.groupSize} travellers`;}const energy=trip.desiredEnergy==="restore"?"αποφόρτιση":trip.desiredEnergy==="stimulating"?"ένταση και ανακάλυψη":"ισορροπία";const social=trip.socialPreference==="quiet"?"ήσυχο ρυθμό":trip.socialPreference==="lively"?"ζωντανή ενέργεια":"ευέλικτο κοινωνικό ρυθμό";return `${energy}, ${social}, ${trip.nights} νύχτες, ${trip.groupSize} ταξιδιώτες`;}
function stayRequirementAudit(spec:{hard:string[];soft:string[];source:string},extra:Record<string,unknown>={}){return{hard:spec.hard,soft:spec.soft,source:spec.source,...extra}}
function stayNoResultMessage(trip:TripRequest,hard:string[]){const beachfront=hard.includes("BEACHFRONT");if(trip.language==="en")return beachfront?"I could not verify a beachfront stay for every selected date. I will not substitute a merely coastal destination.":"I could not verify a stay that satisfies every mandatory accommodation requirement for those dates.";return beachfront?"Δεν βρήκα κατάλυμα με επαληθευμένο «μπροστά στη θάλασσα» για όλες τις ημερομηνίες σου. Δεν θα το αντικαταστήσω με απλώς παραθαλάσσιο προορισμό.":"Δεν βρήκα κατάλυμα που να καλύπτει όλα τα υποχρεωτικά κριτήρια διαμονής για αυτές τις ημερομηνίες."}

export async function runTravelOrchestratorV23(trip:TripRequest,sessionId:string,emit:TravelOrchestratorEmitter=noop):Promise<V8RecommendationResponse>{
 const started=Date.now(),timings:Record<string,number>={},roles=runtimeAgentRoles().map(role=>role.id),llmBudget=createLLMRequestBudgetV16();let stage="start",last=started;
 const mark=(name:string)=>{const now=Date.now();timings[name]=now-last;last=now;stage=name};const signal=(type:string,progress:number,payload:Record<string,unknown>={})=>emit({type,progress,payload});
 try{
  signal("understand:start",8,{hasFreeText:Boolean(trip.tripText),agent:"semantic-formulator"});signal("locality:start",11,{agent:"locality-retriever"});stage="intent+locality+catalog";
  const[intent,stayRequirements,allDestinations,choiceProfiles,localities]=await Promise.all([interpretIntentV8(trip,llmBudget),interpretStayConstraintsV16(trip.tripText,llmBudget),loadV8DestinationCatalog(),loadDestinationChoiceProfilesV22().catch(()=>new Map()),loadLocalityProfilesV23(trip.startDate,trip.endDate).catch(()=>[])]);mark("intent+locality+catalog");
  const catalog=allDestinations.filter(destination=>destination.countryCode==="GR"),{hardConstraint,constrainedCatalog,rankingTrip}=canonicalRankingInputsV19(trip,catalog),hasFreeText=Boolean(trip.tripText&&trip.tripText.trim().length>=3),hasHardSemanticContext=Boolean(hardConstraint||stayRequirements.hard.length||stayRequirements.soft.length);
  if(hasFreeText&&localities.length<10)throw new TravelDecisionError(503,trip.language==="en"?"The locality matching layer is not ready, so I will not return generic recommendations.":"Το locality matching layer δεν είναι έτοιμο, οπότε δεν θα επιστρέψω γενικές/άσχετες προτάσεις.","locality-retrieval");
  if(semanticNeedsClarificationV19(intent,trip.tripText,hasHardSemanticContext)){signal("understand:clarify",24,{agent:"semantic-formulator",confidence:intent.semantic?.confidence??0});throw new TravelDecisionError(422,trip.language==="en"?"I could not formulate the free-text note with enough confidence. Add one concrete preference or exclusion.":"Δεν μπόρεσα να διατυπώσω το ελεύθερο κείμενο με αρκετή βεβαιότητα. Πρόσθεσε μία συγκεκριμένη προτίμηση ή εξαίρεση.","intent-clarification");}
  signal("understand:ready",24,{summary:intent.summary,semanticSource:intent.source,formulationModel:intent.formulationModel??"deterministic",priorities:intent.semantic24?.priorities??[],agent:"semantic-formulator"});signal("locality:ready",34,{localityCount:localities.length,agent:"locality-retriever"});

  const rawPre=preRankV8(rankingTrip,intent,constrainedCatalog,Math.max(30,constrainedCatalog.length)),semanticPre=applySemanticIntentRankingV18(rawPre,intent),criterionPre=applyCriterionRelevanceV22(trip,intent,semanticPre,choiceProfiles),localityPre=applyLocalityFuzzyRankingV23(trip,intent,criterionPre.ranked,localities);stage="choice-correctness";
  const choice=await applyChoiceCorrectnessV21(trip,intent,stayRequirements,localityPre.ranked),preAll=choice.ranked.slice(0,30),minimum=(hardConstraint||stayRequirements.hard.length)?1:3;mark("pre-rank");
  signal("choice:ready",41,{agent:"fuzzy-matcher",localities:localityPre.audit.localityCount,mappedDestinations:localityPre.audit.mappedDestinations,freeTextWeight:localityPre.audit.freeTextWeight,globalStayScan:choice.audit.stayScanRan&&!choice.audit.stayScanFailed,mappedStays:choice.audit.mappedStayCount,hardStayRejected:choice.audit.hardStayRejected.length});
  if(preAll.length<minimum)throw new TravelDecisionError(422,trip.language==="en"?"No available locality/destination satisfies that combination yet.":"Δεν υπάρχουν διαθέσιμες locality/προορισμοί που να καλύπτουν αυτόν τον συνδυασμό.","pre-rank");

  let pre=preAll,stayGate:{checked:boolean;checkedSlugs:string[];eligibleSlugs:string[];failedSlugs:string[]}={checked:false,checkedSlugs:[],eligibleSlugs:preAll.map(item=>item.destination.slug),failedSlugs:[]};
  if(stayRequirements.hard.length){signal("stay:start",44,{requirements:stayRequirements.hard,agent:"hotel-reranker"});stage="stay-requirements";const gated=await gateRankedByStayRequirementsV16(trip,preAll,stayRequirements,18);pre=gated.ranked;stayGate={checked:gated.audit.checked,checkedSlugs:gated.audit.checkedSlugs,eligibleSlugs:gated.audit.eligibleSlugs,failedSlugs:gated.audit.failedSlugs};mark("stay-requirements");if(!pre.length)throw new TravelDecisionError(422,stayNoResultMessage(trip,stayRequirements.hard),"stay-requirements");}
  signal("shortlist:ready",51,{preview:pre.slice(0,7).map(x=>({destination:trip.language==="en"?x.destination.nameEn:x.destination.nameEl})),agent:"orchestrator"});

  signal("weather:start",57,{candidates:Math.min(18,pre.length),agent:"season-route"});stage="weather";const weather=await enrichV8Weather(trip,pre.map(x=>x.destination),18),weatherBase=applySemanticIntentRankingV18(finalRankV8(rankingTrip,intent,pre,weather),intent),weatherCriterion=applyCriterionRelevanceV22(trip,intent,weatherBase,choiceProfiles),weatherLocality=applyLocalityFuzzyRankingV23(trip,intent,weatherCriterion.ranked,localities),weatherRanked=weatherLocality.ranked;mark("weather");signal("weather:ready",70,{checked:weather.size,localitySignal:true,agent:"season-route"});

  stage="stored-evidence";const research=await screenResearchEvidence(trip,weatherRanked,18);mark("stored-evidence");signal("research:start",74,{agent:"research-scout"});stage="research-scout";const researchScout=await runRecommendationResearchAgent(trip,research.ranked,llmBudget),ranked=applyResearchScoutRanking(research.ranked,researchScout);mark("research-scout");signal("research:ready",84,{webBacked:researchScout.ran,checked:researchScout.inspectedSlugs.length,confidence:researchScout.confidence,agent:"research-scout"});

  const selected=diversifyV8(ranked,12,rankingTrip),selectedIds=new Set(selected.map(x=>x.destination.slug)),verifyPool=[...selected,...ranked.filter(x=>!selectedIds.has(x.destination.slug))].slice(0,18);signal("verify:start",87,{agent:"skeptical-auditor"});stage="verifier";const verification=await verifyV8(trip,verifyPool,llmBudget),fixed=verification.checked&&!verification.passed?repair(rankingTrip,selected,ranked,verification.rejectSlugs):selected;mark("verifier");stage="auditor";const audited=await auditAndRepairV10(trip,fixed,ranked,12,research.evidence,llmBudget);mark("auditor");if(!audited.audit.passed||!audited.items.length)throw new TravelDecisionError(422,trip.language==="en"?"There is not enough verified evidence for those criteria and dates yet.":"Δεν υπάρχουν ακόμη επαληθευμένα στοιχεία που να καλύπτουν τα συγκεκριμένα κριτήρια και τις ημερομηνίες σου.","auditor");

  signal("council:start",93,{agent:"traveler-advocate"});stage="council";const councilPool=filterPortfolioV21(audited.items),council=await runTravelCouncilV9(trip,councilPool,llmBudget),ordered=council.agreement==="STRONG"?[...councilPool].sort((a,b)=>a.destination.slug===council.finalSlug?-1:b.destination.slug===council.finalSlug?1:0):councilPool;mark("council");signal("council:ready",97,{agreement:council.agreement,publicCandidates:councilPool.length,agent:"traveler-advocate"});
  const recommendations=toRecommendationsV8(trip,ordered).map(x=>({...x,dateWindows:buildSmartDateWindows(trip,x)})),{formulationModel:_model,interpretedText:_text,...publicIntent}=intent,publicStayRequirements={...stayRequirements,source:"deterministic" as const,needsSemanticAssist:false};void _model;void _text;
  const result:V8RecommendationResponse={version:9,experienceVersion:16,request:trip,generatedAt:new Date().toISOString(),source:"verified-travel-knowledge",intent:publicIntent,stayRequirements:publicStayRequirements,catalogSize:catalog.length,eligibleCount:ranked.length,explorationCount:Math.max(0,recommendations.length-3),mode:"guided",resultCount:recommendations.length,profileSummary:profileSummary(trip),feasibility:responseFeasibility(ordered),council,continuity:fullContinuity(),recommendations};
  stage="learning";await recordV8RecommendationSession(sessionId,trip,intent,recommendations,stayRequirements).catch(()=>false);mark("learning");
  writeRecommendationAudit({sessionId,status:"success",stage:"final",timingsMs:{...timings,total:Date.now()-started},intentSource:intent.source,hardConstraint:hardConstraint?.id??null,stayRequirements:stayRequirementAudit(stayRequirements,{...stayGate,formulationModel:intent.formulationModel??"deterministic",localityFuzzy:weatherLocality.audit,choiceCorrectness:choice.audit}),llmBudget:llmBudget.snapshot(),catalogSize:catalog.length,preCandidates:pre.slice(0,8).map(item=>item.destination.slug),researchScout:{ran:researchScout.ran,source:researchScout.source,inspectedSlugs:researchScout.inspectedSlugs,preferredSlugs:researchScout.preferredSlugs,rejectSlugs:researchScout.rejectSlugs,confidence:researchScout.confidence,evidenceDomains:researchScout.evidenceDomains},verifier:{checked:verification.checked,passed:verification.passed,rejectSlugs:verification.rejectSlugs,model:verification.model},auditor:{passed:audited.audit.passed,confidence:audited.audit.confidence,attempts:audited.audit.attempts,checkedBy:audited.audit.checkedBy,roles},council:{agreement:council.agreement,finalSlug:council.finalSlug},finalSlugs:recommendations.slice(0,6).map(item=>item.slug)});return result;
 }catch(error){if(error instanceof TravelDecisionError)throw error;writeRecommendationAuditError(sessionId,stage,error,{...timings,total:Date.now()-started});throw error;}
}
