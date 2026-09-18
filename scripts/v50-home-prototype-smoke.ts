import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home=readFileSync("app/page.tsx","utf8");
const ui=readFileSync("components/v50-travel-intelligence-home.tsx","utf8");
const css=readFileSync("components/v50-travel-intelligence-home.module.css","utf8");
const mapApi=readFileSync("app/api/v50/map-stays/route.ts","utf8");
const agentApi=readFileSync("app/api/v50/agent/route.ts","utf8");
const state=readFileSync("lib/ai/v50-agent-state.ts","utf8");
const skill=readFileSync("skills/web-design/SKILL.md","utf8");

assert(home.includes("V50TravelIntelligenceHome"),"V50 root must render the current homepage");
assert(ui.includes("/api/v50/map-stays?limit=1800"),"V50 must request the live stay universe");
assert(ui.includes("/api/v50/agent"),"V50 conversation must use the server-side V50 agent");
assert(ui.includes("quickReplies")&&ui.includes("Travel DNA"),"V50 must support adaptive conversation and infographic filters");
assert(ui.includes("v50TopStar")&&css.includes(":global(.v50TopStar)")&&css.includes("starPulse"),"Top-5 map pins must use blinking golden stars");
assert(ui.includes("flyTo"),"V50 must preserve map zoom/focus choreography");
assert(ui.includes("/api/v50/stay-rating")&&ui.includes("hoverStayCard"),"map hover cards must load verified ratings without LLM summaries");
assert(ui.includes("/escape/")&&ui.includes("/stay/"),"stay cards must link into the internal landing funnel");
assert(agentApi.includes("runTravelOrchestratorV45"),"V50 must use persistent V45 orchestration");
assert(agentApi.includes("loadV8StayOffers")&&agentApi.includes("assessStayAvailabilityV20"),"V50 must ground final solutions in real stay offers");
assert(agentApi.includes(".slice(0,10)"),"V50 public portfolio must cap at ten verified solutions");
assert(state.includes("nextV50Question")&&state.includes("parseNaturalWindowV50"),"V50 must clarify missing information and parse natural dates");
assert(mapApi.includes("SUPABASE_SERVICE_ROLE_KEY"),"full-inventory API must remain server-side");
assert(mapApi.includes('status:"disabled"')&&mapApi.includes("Demand forecasting is not used for public ranking"),"disabled demand forecasting must be explicit and must not be fabricated into public ranking");
for(const mode of ["map","satellite","terrain"])assert(ui.includes('"'+mode+'"'),"missing map mode "+mode);
assert(css.includes("@media(max-width:820px)")&&css.includes("prefers-reduced-motion"),"V50 needs responsive and reduced-motion contracts");
assert(css.includes(".droneCircle")&&css.includes(".heroMedia")&&css.includes(".intelDrone"),"V50 must apply the cinematic image-treatment system");
assert(skill.includes("agentic travel intelligence")||skill.includes("Agentic Travel Intelligence"),"project-local design skill must own the V50 production contract");

console.log("V50_HOME_OK conversation=ADAPTIVE v45=PERSISTENT real-stays=YES top5=YES ranked-pins=YES cinematic=YES");

const agentRoute=readFileSync("app/api/v50/agent/route.ts","utf8");
assert(agentRoute.includes("fallbackViaV42")&&agentRoute.includes("/api/escape/solve-v42"),"V50 agent must fail over to grounded V42 semantic live inventory");
assert(!ui.includes("Δεν θα μαντέψω"),"active V50 UI must never expose dead-end technical fallback copy");
assert(agentRoute.includes('state:"degraded"')&&agentRoute.includes("ok:true"),"V50 terminal fallback must preserve the conversation instead of hard-failing");
assert(agentRoute.includes('console.error("[v50-agent] primary pipeline failed"'),"V50 agent must emit observable primary-pipeline failures");
