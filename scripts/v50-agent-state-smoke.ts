import assert from "node:assert/strict";
import { buildV50Trip,interpretV50Conversation,nextV50Question } from "../lib/ai/v50-agent-state";

const now=new Date("2026-09-18T09:00:00Z");
const text="Βρες μου ένα μοναδικό ΣΚ βουνό μετά τις 01/10/2026";
const base={userText:text,origin:"Αθήνα",budget:800,filters:{calm:72,food:68,nature:70,discovery:64,nightlife:24,value:74}};

const interpreted=interpretV50Conversation(base,now);
assert.equal(interpreted.startDate,"2026-10-02","first Friday after 01/10/2026 must be selected");
assert.equal(interpreted.endDate,"2026-10-04","weekend must end Sunday");
assert.equal(interpreted.nights,2);
assert.equal(interpreted.weekend,true);
assert.equal(interpreted.terrainIntent,"mountain");
assert.equal(interpreted.mustHave,"nature");
assert.equal(interpreted.noveltyPreference,"surprise");
assert(interpreted.moods.includes("nature"),"mountain intent must include nature mood");

const natural=interpretV50Conversation({userText:"το πρώτο ΣΚ μετά τις 10 Οκτωβρίου"},now);
assert.equal(natural.startDate,"2026-10-16","Greek month without year must resolve to the next future occurrence");
assert.equal(natural.endDate,"2026-10-18");
assert.equal(natural.weekend,true);

const range=interpretV50Conversation({userText:"15-17 Νοεμβρίου"},now);
assert.equal(range.startDate,"2026-11-15","Greek day range must parse naturally");
assert.equal(range.endDate,"2026-11-17");

const firstQuestion=nextV50Question(interpreted,{});
assert.equal(firstQuestion?.id,"companions","agent should ask the highest-value missing context instead of guessing companions");

const answers={companions:"couple",outcome:"restore",friction:"easy-hop"} as const;
const complete=interpretV50Conversation({...base,answers},now);
const next=nextV50Question(complete,answers);
assert.equal(next,null,"explicit answers should complete the compact brief");

const trip=buildV50Trip({...base,answers},complete);
assert.equal(trip.startDate,"2026-10-02");
assert.equal(trip.endDate,"2026-10-04");
assert.equal(trip.travelerType,"couple");
assert.equal(trip.distancePreference,"easy-hop");
assert.equal(trip.noveltyPreference,"surprise");
assert.equal(trip.mustHave,"nature");
assert(trip.tripText?.includes("βουνό"));

console.log("V50_AGENT_STATE_OK weekend=2026-10-02..04 terrain=mountain clarification=companions compact-trip=PASS");
