import assert from "node:assert/strict";
import { buildV50Trip, inferTransportModeV71, interpretV50Conversation } from "../lib/ai/v50-agent-state";

assert.equal(inferTransportModeV71("θέλω διήμερο χωρίς αυτοκίνητο"),"no-car");
assert.equal(inferTransportModeV71("Χωρίς αμάξι, με ΚΤΕΛ"),"no-car");
assert.equal(inferTransportModeV71("weekend without a car from Athens"),"no-car");
assert.equal(inferTransportModeV71("xwris amaksi kai me leoforeio"),"no-car");
assert.equal(inferTransportModeV71("θα πάω με το αυτοκίνητο"),"car");
assert.equal(inferTransportModeV71("we will rent a car"),"car");
assert.equal(inferTransportModeV71("ταξίδι με ηλεκτρικό αυτοκίνητο"),"electric-car");
assert.equal(inferTransportModeV71("driving EV to Meteora"),"electric-car");
assert.equal(inferTransportModeV71("δεν θέλω να πάω χωρίς αυτοκίνητο"),"car");
assert.equal(inferTransportModeV71("μου αρέσουν τα αυτοκίνητα"),"any");
assert.equal(inferTransportModeV71("χωρίς αυτοκίνητο · τελικά θα πάω με το αμάξι"),"car",
 "User correction should override previous transportation preference");
assert.equal(inferTransportModeV71("με αυτοκίνητο · τελικά χωρίς αμάξι"),"no-car");

const input={userText:"Χωρίς αυτοκίνητο, θέλω χαλάρωση στην Ελλάδα",
 answers:{companions:"ζευγάρι",dates:"23 έως 25 Οκτωβρίου 2026"}};
const parsed=interpretV50Conversation(input,new Date("2026-10-09T12:00:00Z"));
assert.equal(parsed.transportMode,"no-car");
assert(parsed.signals.includes("transport"));
const trip=buildV50Trip(input,{...parsed,startDate:"2026-10-23",endDate:"2026-10-25",nights:2,travelerType:"couple"});
assert.equal(trip.transportMode,"no-car",
 "The consumer agent must not overwrite the hard no-car constraint with any");
console.log("v71-transport-intent-smoke: ok");
