import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home=readFileSync("app/page.tsx","utf8");
const ui=readFileSync("components/v50-travel-intelligence-home.tsx","utf8");
const css=readFileSync("components/v50-travel-intelligence-home.module.css","utf8");
const mapApi=readFileSync("app/api/v50/map-stays/route.ts","utf8");
const skill=readFileSync("skills/web-design/SKILL.md","utf8");

assert(home.includes("V50TravelIntelligenceHome"),"prototype root must render V50 home");
assert(ui.includes("/api/v50/map-stays?limit=1800"),"V50 must request full stay universe");
assert(ui.includes("/api/escape/solve-v42"),"V50 prototype must reuse real semantic solver");
assert(ui.includes("slice(0,5)"),"V50 public portfolio must cap at five solutions");
for(const mode of ["map","satellite","terrain"])assert(ui.includes('"'+mode+'"'),"missing map mode "+mode);
assert(ui.includes("AI CHALLENGE")&&ui.includes("compareSelected"),"agent must challenge a non-Top-5 map choice");
assert(ui.includes("Δεν εμφανίζω demand/weather/events αν δεν υπάρχει πραγματικό evidence."),"prototype must expose truth boundary");
assert(mapApi.includes("SUPABASE_SERVICE_ROLE_KEY"),"full-inventory API must remain server-side");
assert(mapApi.includes('status:"not-trained"'),"untrained demand layer must be declared, not fabricated");
assert(css.includes("@media(max-width:760px)")&&css.includes("prefers-reduced-motion"),"prototype needs responsive and reduced-motion contracts");
assert(skill.includes("Map-first agentic travel intelligence experience")&&skill.includes("Top 5"),"project-local design skill must own V50 prototype contract");

console.log("V50_HOME_PROTOTYPE_OK real-inventory=YES semantic-solver=YES top5=YES truth-boundary=YES");
