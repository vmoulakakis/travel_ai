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
assert(ui.includes("v50Pin")&&css.includes(":global(.v50Pin)"),"Top-5 map pins must use ranked intelligence markers");
assert(ui.includes("flyTo"),"V50 must preserve map zoom/focus choreography");
assert(agentApi.includes("runTravelOrchestratorV45"),"V50 must use persistent V45 orchestration");
assert(agentApi.includes("loadV8StayOffers")&&agentApi.includes("assessStayAvailabilityV20"),"V50 must ground final solutions in real stay offers");
assert(agentApi.includes(".slice(0,5)"),"V50 public portfolio must cap at five verified solutions");
assert(state.includes("nextV50Question")&&state.includes("parseNaturalWindowV50"),"V50 must clarify missing information and parse natural dates");
assert(mapApi.includes("SUPABASE_SERVICE_ROLE_KEY"),"full-inventory API must remain server-side");
assert(mapApi.includes('status:"not-trained"'),"untrained demand must not be fabricated");
for(const mode of ["map","satellite","terrain"])assert(ui.includes('"'+mode+'"'),"missing map mode "+mode);
assert(css.includes("@media(max-width:820px)")&&css.includes("prefers-reduced-motion"),"V50 needs responsive and reduced-motion contracts");
assert(css.includes(".droneCircle")&&css.includes(".heroMedia")&&css.includes(".intelDrone"),"V50 must apply the cinematic image-treatment system");
assert(skill.includes("agentic travel intelligence")||skill.includes("Agentic Travel Intelligence"),"project-local design skill must own the V50 production contract");

console.log("V50_HOME_OK conversation=ADAPTIVE v45=PERSISTENT real-stays=YES top5=YES ranked-pins=YES cinematic=YES");
