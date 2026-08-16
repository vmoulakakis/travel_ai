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
import { buildDestinationChoiceProfilesV26 } from "@/lib/data/destination-choice-profiles-v26";
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
import { applyCriterionTruthV26 } from "@/lib/decision/criterion-truth-v26";
import { mergeStructuredStayRequirementsV26 } from "@/lib/decision/structured-stay-requirements-v26";
import { interpretStayConstraintsV16 } from "@/lib/ai/stay-constraint-interpreter-v16";
import { gateRankedByStayRequirementsV16 } from "@/lib/decision/stay-eligibility-v16";
import type { V8IntentProfile,V8RecommendationResponse } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

export type TravelOrchestratorEvent={type:string;progress:number;payload?:Record<string,unknown>};
export type TravelOrchestratorEmitter=(event:TravelOrchestratorEvent)=>void;

export class TravelDecisionError extends Error{
 constructor(public readonly status:number,public readonly publicMessage:string,public readonly stage:string){super(publicMessage);this.name="TravelDecisionError"}
}

const noop:TravelOrchestratorEmitter=()=>{};
function accuracyRepair(request:TripRequest,intent:V8IntentProfile,selected:V8Ranked[],pool:V8Ranked[],reject:string[]){if(!reject.length)return selected;const bad=new Set(reject),truth=applyCriterionTruthV26(request,intent,pool.filter(item=>!bad.has(item.destination.slug)),{publicStage:true});return diversifyV8(truth.ranked,12,request)}
function profileSummary(trip:TripRequest){if(trip.language==="en"){const energy=trip.desiredEnergy==="restore"?"restoration":trip.desiredEnergy==="stimulating"?"energy and discovery":"balance";const social=trip.socialPreference==="quiet"?"a quiet rhythm":trip.socialPreference==="lively"?"lively energy":"a flexible social rhythm";return `${energy}, ${social}, ${trip.nights} nights, ${trip.groupSize} travellers`;}const energy=trip.desiredEnergy==="restore"?"αποφόρτιση":trip.desiredEnergy==="stimulating"?"ένταση και ανακάλυψη":"ισορροπία";const social=trip.socialPreference==="quiet"?"ήσυχο ρυθμό":trip.socialPreference==="lively"?"ζωντανή ενέργεια":"ευέλικτο κοινωνικό ρυθμό";return `${energy}, ${social}, ${trip.nights} νύχτες, ${trip.groupSize} ταξιδιώτες`;}
function stayRequirementAudit(spec:{hard:string[];soft:string[];source:string},extra:Record<string,unknown>={}){return{hard:spec.hard,soft:spec.soft,source:spec.source,...extra}}
function stayNoResultMessage(trip:TripRequest,hard:string[]){const beachfront=hard.includes("BEACHFRONT"),charging=hard.includes("EV_CHARGING");if(trip.language==="en"){if(charging)return"I could not verify EV charging at an eligible stay for all selected dates. I will not assume a charger exists.";return beachfront?"I could not verify a beachfront stay for every selected date. I will not substitute a merely coastal destination.":"I could not verify a stay that satisfies every mandatory accommodation requirement for those dates.";}if(charging)return"Δεν μπόρεσα να επαληθεύσω φόρτιση EV σε επιλέξιμο κατάλυμα για όλες τις ημερομηνίες. Δεν θα υποθέσω ότι υπάρχει φορτιστής.";return beachfront?"Δεν βρήκα κατάλυμα με επαληθευμένο «μπροστά στη θάλασσα» για όλες τις ημερομηνίες σου. Δεν θα το αντικαταστήσω με απλώς παραθαλάσσιο προορισμό.":"Δεν βρήκα κατάλυμα που να καλύπτει όλα τα υποχρεωτικά κριτήρια διαμονής για αυτές τις ημερομηνίες."}
function noResult(trip:TripRequest){return trip.language==="en"?"No verified destination satisfies every red line and criterion in that combination yet.":"Δεν υπάρχει ακόμη επαληθευμένος προορισμός που να καλύπτει όλες τις κόκκινες γραμμές και τα κριτήρια αυτού του συνδυασμού."}

export async function runTravelOrchestratorV26(trip:TripRequest,sessionId:string,emit:TravelOrchestratorEmitter=noop):Promise<V8RecommendationResponse>{
 const started=Date.now(),timings:Record<string,number>={},roles=runtimeAgentRoles().map(role=>role.id),llmBudget=createLLMRequestBudgetV16();let stage="start",last=started;
 const mark=(name:string)=>{const now=Date.now();timings[name]=now-last;last=now;stage=name};
 const signal=(type:string,progress:number,payload:Record<string,unknown>={})=>emit({type,progress,payload});
 try{
  signal("understand:start",8,{hasFreeText:Boolean(trip.tripText),agent:"intent-constraint"});signal("catalog:start",12,{agent:"orchestrator"});
  stage="intent+catalog";
  const[intent,rawStayRequirements,allDestinations]=await Promise.all([interpretIntentV8(trip,llmBudget),interpretStayConstraintsV16(trip.tripText,llmBudget),loadV8DestinationCatalog()]);
  const stayRequirements=mergeStructuredStayRequirementsV26(trip,rawStayRequirements),catalog=allDestinations.filter(destination=>destination.countryCode==="GR"),choiceProfiles=buildDestinationChoiceProfilesV26(catalog),{hardConstraint,constrainedCatalog,rankingTrip}=canonicalRankingInputsV19(trip,catalog);mark("intent+catalog");
  const hasHardSemanticContext=Boolean(hardConstraint||stayRequirements.hard.length||stayRequirements.soft.length||trip.mustHave!=="none"||trip.avoid!=="none"||trip.transportMode!=="any");
  if(semanticNeedsClarificationV19(intent,trip.tripText,hasHardSemanticContext)){
   signal("understand:clarify",24,{agent:"intent-constraint",confidence:intent.semantic?.confidence??0});
   writeRecommendationAudit({sessionId,status:"no-result",stage:"intent-clarification",timingsMs:{...timings,total:Date.now()-started},intentSource:intent.source,hardConstraint:hardConstraint?.id??null,stayRequirements:stayRequirementAudit(stayRequirements),llmBudget:llmBudget.snapshot(),catalogSize:catalog.length,auditor:{roles}});
   throw new TravelDecisionError(422,trip.language==="en"?"I could not understand the free-text note with enough confidence. Add one concrete thing you want or want to avoid.":"Δεν κατάλαβα το ελεύθερο κείμενο με αρκετή βεβαιότητα. Γράψε ένα συγκεκριμένο πράγμα που θέλεις ή δεν θέλεις.","intent-clarification");
  }
  signal("understand:ready",24,{summary:intent.summary,semanticSource:intent.source,semanticPriorities:intent.semantic?.priorities??[],hardStayRequirements:stayRequirements.hard,agent:"intent-constraint"});signal("catalog:ready",36,{catalogSize:catalog.length,verifiedChoiceProfiles:choiceProfiles.size,agent:"orchestrator"});

  const rawPre=preRankV8(rankingTrip,intent,constrainedCatalog,Math.max(30,constrainedCatalog.length)),preTruth=applyCriterionTruthV26(trip,intent,rawPre),semanticPre=applySemanticIntentRankingV18(preTruth.ranked,intent),criterionPre=applyCriterionRelevanceV22(trip,intent,semanticPre,choiceProfiles),criterionTruth=applyCriterionTruthV26(trip,intent,criterionPre.ranked);
  stage="choice-correctness";
  const choice=await applyChoiceCorrectnessV21(trip,intent,stayRequirements,criterionTruth.ranked),preAll=choice.ranked.slice(0,30),minimum=(hardConstraint||stayRequirements.hard.length||trip.mustHave!=="none"||trip.avoid!=="none")?1:3;mark("pre-rank");
  signal("choice:ready",39,{agent:"orchestrator",semanticRejected:choice.audit.semanticRejected.length,criterionRejected:criterionTruth.audit.rejected,budgetCorrections:criterionTruth.audit.budgetCorrections,globalStayScan:choice.audit.stayScanRan&&!choice.audit.stayScanFailed,mappedStays:choice.audit.mappedStayCount,hardStayRejected:choice.audit.hardStayRejected.length,criterionProfilesUsed:criterionPre.audit.profilesUsed,activeCriteria:criterionPre.audit.activeDimensions});
  if(preAll.length<minimum){
   writeRecommendationAudit({sessionId,status:"no-result",stage:"pre-rank",timingsMs:{...timings,total:Date.now()-started},intentSource:intent.source,hardConstraint:hardConstraint?.id??null,stayRequirements:stayRequirementAudit(stayRequirements,{choiceCorrectness:choice.audit,criterionRelevance:criterionPre.audit,criterionTruth:criterionTruth.audit}),llmBudget:llmBudget.snapshot(),catalogSize:catalog.length,preCandidates:preAll.map(item=>item.destination.slug),auditor:{roles}});
   throw new TravelDecisionError(422,noResult(trip),"pre-rank");
  }

  let pre=preAll,stayGate:{checked:boolean;checkedSlugs:string[];eligibleSlugs:string[];failedSlugs:string[]}={checked:false,checkedSlugs:[],eligibleSlugs:preAll.map(item=>item.destination.slug),failedSlugs:[]};
  if(stayRequirements.hard.length){
   signal("stay:start",40,{requirements:stayRequirements.hard,agent:"inventory-grounder"});stage="stay-requirements";
   const gated=await gateRankedByStayRequirementsV16(trip,preAll,stayRequirements,18);pre=gated.ranked;stayGate={checked:gated.audit.checked,checkedSlugs:gated.audit.checkedSlugs,eligibleSlugs:gated.audit.eligibleSlugs,failedSlugs:gated.audit.failedSlugs};mark("stay-requirements");
   signal("stay:ready",48,{requirements:stayRequirements.hard,eligible:pre.length,agent:"inventory-grounder"});
   if(!pre.length){writeRecommendationAudit({sessionId,status:"no-result",stage:"stay-requirements",timingsMs:{...timings,total:Date.now()-started},intentSource:intent.source,hardConstraint:hardConstraint?.id??null,stayRequirements:stayRequirementAudit(stayRequirements,{...stayGate,criterionTruth:criterionTruth.audit}),llmBudget:llmBudget.snapshot(),catalogSize:catalog.length,preCandidates:preAll.slice(0,12).map(item=>item.destination.slug),auditor:{roles}});throw new TravelDecisionError(422,stayNoResultMessage(trip,stayRequirements.hard),"stay-requirements");}
  }
  signal("shortlist:ready",50,{preview:pre.slice(0,7).map(x=>({destination:trip.language==="en"?x.destination.nameEn:x.destination.nameEl})),agent:"orchestrator"});

  signal("weather:start",56,{candidates:Math.min(18,pre.length),agent:"season-route"});stage="weather";
  const weather=await enrichV8Weather(trip,pre.map(x=>x.destination),18),weatherBase=applySemanticIntentRankingV18(finalRankV8(rankingTrip,intent,pre,weather),intent),weatherCriterion=applyCriterionRelevanceV22(trip,intent,weatherBase,choiceProfiles),weatherTruth=applyCriterionTruthV26(trip,intent,weatherCriterion.ranked),weatherRanked=weatherTruth.ranked;mark("weather");
  signal("weather:ready",70,{checked:weather.size,criterionRejected:weatherTruth.audit.rejected,criterionProfilesUsed:weatherCriterion.audit.profilesUsed,agent:"season-route"});

  stage="stored-evidence";const research=await screenResearchEvidence(trip,weatherRanked,18);mark("stored-evidence");
  signal("research:start",74,{webBacked:true,agent:"research-scout"});stage="research-scout";
  const researchScout=await runRecommendationResearchAgent(trip,research.ranked,llmBudget),researchRanked=applyResearchScoutRanking(research.ranked,researchScout),publicTruth=applyCriterionTruthV26(trip,intent,researchRanked,{publicStage:true}),ranked=publicTruth.ranked;mark("research-scout");
  signal("research:ready",84,{webBacked:researchScout.ran,checked:researchScout.inspectedSlugs.length,confidence:researchScout.confidence,criterionRejected:publicTruth.audit.rejected,accuracyFloor:publicTruth.audit.publicFloor,agent:"research-scout"});
  if(!ranked.length)throw new TravelDecisionError(422,noResult(trip),"criterion-truth");

  const selected=diversifyV8(ranked,12,rankingTrip),selectedIds=new Set(selected.map(x=>x.destination.slug)),verifyPool=[...selected,...ranked.filter(x=>!selectedIds.has(x.destination.slug))].slice(0,18);
  signal("verify:start",87,{conditional:true,agent:"skeptical-auditor"});stage="verifier";
  const verification=await verifyV8(trip,verifyPool,llmBudget),fixed=verification.checked&&!verification.passed?accuracyRepair(trip,intent,selected,ranked,verification.rejectSlugs):selected;mark("verifier");
  stage="auditor";const audited=await auditAndRepairV10(trip,fixed,ranked,12,research.evidence,llmBudget),auditedTruth=applyCriterionTruthV26(trip,intent,audited.items,{publicStage:true});mark("auditor");
  signal("verify:ready",91,{checked:true,corrected:audited.audit.attempts>1||auditedTruth.audit.rejected>0,confidence:audited.audit.confidence,criterionRejected:auditedTruth.audit.rejected,agent:"skeptical-auditor"});
  if(!audited.audit.passed||!auditedTruth.ranked.length){writeRecommendationAudit({sessionId,status:"no-result",stage:"auditor",timingsMs:{...timings,total:Date.now()-started},intentSource:intent.source,hardConstraint:hardConstraint?.id??null,stayRequirements:stayRequirementAudit(stayRequirements,{...stayGate,criterionTruth:auditedTruth.audit}),llmBudget:llmBudget.snapshot(),catalogSize:catalog.length,auditor:{passed:audited.audit.passed,confidence:audited.audit.confidence,attempts:audited.audit.attempts,roles}});throw new TravelDecisionError(422,noResult(trip),"auditor");}

  signal("council:start",93,{agent:"traveler-advocate"});stage="council";
  const portfolioTruth=applyCriterionTruthV26(trip,intent,filterPortfolioV21(auditedTruth.ranked),{publicStage:true}),councilPool=portfolioTruth.ranked;
  if(!councilPool.length)throw new TravelDecisionError(422,noResult(trip),"final-criterion-truth");
  const council=await runTravelCouncilV9(trip,councilPool,llmBudget),orderedRaw=council.agreement==="STRONG"?[...councilPool].sort((a,b)=>a.destination.slug===council.finalSlug?-1:b.destination.slug===council.finalSlug?1:0):councilPool,finalTruth=applyCriterionTruthV26(trip,intent,orderedRaw,{publicStage:true}),ordered=finalTruth.ranked;mark("council");
  signal("council:ready",97,{agreement:council.agreement,agent:"traveler-advocate",publicCandidates:ordered.length,criterionRejected:finalTruth.audit.rejected});
  if(!ordered.length)throw new TravelDecisionError(422,noResult(trip),"final-criterion-truth");

  const recommendations=toRecommendationsV8(trip,ordered).map(x=>({...x,dateWindows:buildSmartDateWindows(trip,x)})),publicIntent={...intent,interpretedText:undefined},publicStayRequirements={...stayRequirements,source:"deterministic" as const,needsSemanticAssist:false};
  const result:V8RecommendationResponse={version:9,experienceVersion:16,request:trip,generatedAt:new Date().toISOString(),source:"verified-travel-knowledge",intent:publicIntent,stayRequirements:publicStayRequirements,catalogSize:catalog.length,eligibleCount:ranked.length,explorationCount:Math.max(0,recommendations.length-3),mode:"guided",resultCount:recommendations.length,profileSummary:profileSummary(trip),feasibility:responseFeasibility(ordered),council,continuity:fullContinuity(),recommendations};

  stage="learning";await recordV8RecommendationSession(sessionId,trip,intent,recommendations,stayRequirements).catch(()=>false);mark("learning");
  writeRecommendationAudit({sessionId,status:"success",stage:"final-v26",timingsMs:{...timings,total:Date.now()-started},intentSource:intent.source,hardConstraint:hardConstraint?.id??null,stayRequirements:stayRequirementAudit(stayRequirements,{...stayGate,criterionTruth:{pre:criterionTruth.audit,weather:weatherTruth.audit,public:publicTruth.audit,final:finalTruth.audit},criterionRelevance:weatherCriterion.audit}),llmBudget:llmBudget.snapshot(),catalogSize:catalog.length,preCandidates:pre.slice(0,8).map(item=>item.destination.slug),researchScout:{ran:researchScout.ran,source:researchScout.source,inspectedSlugs:researchScout.inspectedSlugs,preferredSlugs:researchScout.preferredSlugs,rejectSlugs:researchScout.rejectSlugs,confidence:researchScout.confidence,evidenceDomains:researchScout.evidenceDomains},verifier:{checked:verification.checked,passed:verification.passed,rejectSlugs:verification.rejectSlugs,model:verification.model},auditor:{passed:audited.audit.passed,confidence:audited.audit.confidence,attempts:audited.audit.attempts,checkedBy:audited.audit.checkedBy,roles},council:{agreement:council.agreement,finalSlug:council.finalSlug,voices:council.voices.map(voice=>({role:voice.role,source:voice.source,pickSlug:voice.pickSlug,confidence:voice.confidence}))},finalSlugs:recommendations.slice(0,6).map(item=>item.slug)});
  return result;
 }catch(error){if(error instanceof TravelDecisionError)throw error;writeRecommendationAuditError(sessionId,stage,error,{...timings,total:Date.now()-started});throw error;}
}
