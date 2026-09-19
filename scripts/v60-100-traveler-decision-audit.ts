import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildV50Trip,interpretV50Conversation } from "../lib/ai/v50-agent-state";

const now=new Date("2026-09-19T12:00:00Z");
const intents=[
 {text:"Θέλω περιπέτεια και δράση στα βουνά",mood:"adventure",energy:"stimulating"},
 {text:"Nightlife, party και club",mood:"city",energy:"stimulating"},
 {text:"Θέλω reset, χαλάρωση και ξεκούραση",mood:"relax",energy:"restore"},
 {text:"Ήρεμες διακοπές χωρίς άγχος",mood:"relax",energy:"restore"},
 {text:"Γαστρονομία, φαγητό και κρασί",mood:"food",energy:null},
 {text:"Πολιτισμός, ιστορία και μουσεία",mood:"culture",energy:null},
 {text:"Ρομαντικό ταξίδι με σύντροφο",mood:"romantic",energy:null},
 {text:"Θάλασσα, παραλία και ήλιο",mood:"warmth",energy:null},
 {text:"Φύση, δάσος και μονοπάτια",mood:"nature",energy:null},
 {text:"Θέλω να ανακαλύψω κάτι διαφορετικό και unique",mood:"adventure",energy:"stimulating"}
] as const;

const hostileFilters=[
 {calm:100,food:20,nature:20,discovery:20,nightlife:5,value:50},
 {calm:5,food:20,nature:20,discovery:100,nightlife:5,value:50},
 {calm:20,food:100,nature:20,discovery:20,nightlife:5,value:50},
 {calm:20,food:20,nature:100,discovery:20,nightlife:5,value:50},
 {calm:20,food:20,nature:20,discovery:20,nightlife:100,value:50},
 {calm:86,food:86,nature:20,discovery:20,nightlife:5,value:50},
 {calm:20,food:20,nature:86,discovery:86,nightlife:5,value:50},
 {calm:78,food:72,nature:74,discovery:68,nightlife:28,value:70},
 {calm:95,food:95,nature:95,discovery:95,nightlife:95,value:50},
 {calm:10,food:10,nature:10,discovery:10,nightlife:10,value:95}
] as const;

let cases=0;
for(const intent of intents){
 for(const filters of hostileFilters){
  const x=interpretV50Conversation({
   userText:intent.text,
   filters,
   answers:{dates:"2026-10-10 – 2026-10-13",companions:"couple"}
  },now);
  assert.ok(x.moods.includes(intent.mood),`explicit mood ${intent.mood} lost under UI priors for: ${intent.text}; got ${x.moods.join(",")}`);
  if(intent.energy)assert.equal(x.desiredEnergy,intent.energy,`explicit energy lost under UI priors for: ${intent.text}`);
  cases++;
 }
}
assert.equal(cases,100);

const open=interpretV50Conversation({userText:"Θέλω περιπέτεια",answers:{dates:"2026-10-10 – 2026-10-13",companions:"couple"}},now);
const openTrip=buildV50Trip({userText:"Θέλω περιπέτεια",answers:{dates:"2026-10-10 – 2026-10-13",companions:"couple"}},open);
assert.equal(openTrip.consideredDestination,undefined,"open search must not inherit a hidden default destination");

const fixed=interpretV50Conversation({userText:"Θέλω ρομαντικό ταξίδι",destination:"Νάξος",answers:{dates:"2026-10-10 – 2026-10-13",companions:"couple"}},now);
const fixedTrip=buildV50Trip({userText:"Θέλω ρομαντικό ταξίδι",destination:"Νάξος",answers:{dates:"2026-10-10 – 2026-10-13",companions:"couple"}},fixed);
assert.equal(fixedTrip.consideredDestination,"Νάξος","explicit destination must be preserved");

const fallback=readFileSync("app/api/escape/solve-v42/route.ts","utf8");
assert.ok(fallback.includes("runTravelOrchestratorV26"),"fallback must use canonical destination orchestration");
assert.ok(fallback.includes('knowledgeMode:"canonical-destination-first"'),"fallback must explicitly remain destination-first");
assert.ok(!fallback.includes("destinationScore*.43+stayScore*.57"),"fallback must never let stay score rerank destination truth");
console.log(`V60_TRAVELER_DECISION_AUDIT_OK cases=${cases} explicit-intent=PRIORITY hidden-destination=NONE fallback=DESTINATION_FIRST`);
