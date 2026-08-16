import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TRAVEL_AGENT_ROLES_V15,runtimeAgentRoles,developmentAgentRoles } from "../lib/ai/agent-roles-v15";

const ids=TRAVEL_AGENT_ROLES_V15.map(role=>role.id);
assert.equal(new Set(ids).size,ids.length,"Agent role IDs must be unique");
const runtime=runtimeAgentRoles(),development=developmentAgentRoles();
assert(runtime.length>=7,"Runtime must keep the specialist decision team");
assert(development.some(role=>role.id==="fullstack-auditor"));
assert(development.some(role=>role.id==="web-design-critic"));
assert(development.some(role=>role.id==="regression-judge"));

const scout=runtime.find(role=>role.id==="research-scout");
assert.equal(scout?.kind,"agent");
assert(scout?.allowedTools.includes("searchTravelEvidence"),"Research Scout must have the grounded evidence tool");
assert(scout?.forbidden.some(rule=>rule.includes("model memory")),"Research Scout must not decide from model memory");
const inventory=runtime.find(role=>role.id==="inventory-grounder");
assert.equal(inventory?.kind,"deterministic");
assert(inventory?.forbidden.some(rule=>rule.includes("destination score")),"Stay inventory must never influence destination score");

const jsonRoute=readFileSync("app/api/recommend/route.ts","utf8"),streamRoute=readFileSync("app/api/recommend/stream/route.ts","utf8"),orchestrator=readFileSync("lib/ai/travel-orchestrator-v26.ts","utf8"),criterionTruth=readFileSync("lib/decision/criterion-truth-v26.ts","utf8"),research=readFileSync("lib/ai/recommendation-research-agent-v14.ts","utf8"),ui=readFileSync("components/travel-decision-experience.tsx","utf8"),cityRoute=readFileSync("app/api/stay-cities/route.ts","utf8");
for(const [name,source] of [["json",jsonRoute],["stream",streamRoute]] as const){
 assert(source.includes("runTravelOrchestratorV26"),`${name} route must use the V26 criterion-truth orchestrator`);
 assert(source.includes("v26-criterion-truth"),`${name} route must expose the active engine version`);
 assert(!source.includes("preRankV8"),`${name} route must not duplicate ranking internals`);
 assert(!source.includes("runRecommendationResearchAgent"),`${name} route must not duplicate research internals`);
}
assert(orchestrator.includes("runRecommendationResearchAgent"));
assert(orchestrator.includes("auditAndRepairV10"));
assert(orchestrator.includes("runTravelCouncilV9"));
assert(orchestrator.includes("applyCriterionTruthV26"),"V26 orchestrator must apply the central criterion truth gate");
assert(orchestrator.includes("buildDestinationChoiceProfilesV26"),"V26 must use curated destination choice profiles rather than hotel-derived profiles");
assert(criterionTruth.includes('request.mustHave==="nightlife"&&!destination.tags.includes("nightlife")'),"Nightlife hard truth must be literal");
assert(!criterionTruth.includes('tags.includes("city")||'),"CITY must never be a proxy for a hard NIGHTLIFE requirement");
assert(research.includes("ToolLoopAgent"),"Research Scout must remain a real tool-loop agent");
assert(research.includes("searchTravelEvidence"),"Research Scout evidence tool missing");
assert(research.includes("MUST call searchTravelEvidence"),"Research Scout prompt must require evidence tool use");
assert(ui.includes('/api/stay-cities?lang=${lang}'),"UI must load inventory-backed city options");
assert(ui.includes("<select"),"City idea field must remain a constrained selector");
assert(!ui.includes('className="destination-input"'),"Free-text destination city input must not return");
assert(ui.includes('"research:start"')&&ui.includes('"research:ready"'),"UI must represent real Research Scout stages");
assert(cityRoute.includes("buildInventoryDestinationOptionsV15"),"City API must map raw inventory to canonical destinations");
console.log("V26_AGENT_ARCHITECTURE_OK",JSON.stringify({roles:ids,runtime:runtime.map(role=>role.id),development:development.map(role=>role.id),sharedOrchestrator:true,criterionTruth:true,inventoryCitySelector:true,groundedScout:true}));
