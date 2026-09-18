import assert from "node:assert/strict";
import { structuredIntent } from "../lib/ai/intent-v8";
import { applyKnowledgePriorV45,learnedPreferencesV45,type KnowledgePriorV45 } from "../lib/ai/travel-intelligence-v45";
import type { TripRequest } from "../lib/validation/trip";

function trip(overrides:Partial<TripRequest>={}):TripRequest{
  return {
    origin:"Athens",
    startDate:"2026-10-10",
    endDate:"2026-10-13",
    month:"october",
    nights:3,
    budget:900,
    moods:["relax"],
    travelerType:"couple",
    language:"el",
    distancePreference:"any",
    pace:"balanced",
    hotelStyle:"any",
    avoid:"none",
    entryMode:"idea",
    groupSize:2,
    desiredEnergy:"balanced",
    socialPreference:"balanced",
    noveltyPreference:"balanced",
    mustHave:"none",
    dateFlexibility:"fixed",
    transportMode:"any",
    stayLocationPreference:"balanced",
    ...overrides
  };
}

{
  const intent=structuredIntent(trip({socialPreference:"quiet"}),{nightlife:.35});
  assert.equal(intent.weights.nightlife,0,"quiet current request must block remembered nightlife");
}

{
  const intent=structuredIntent(trip({avoid:"high-cost"}),{luxury:.35});
  assert.equal(intent.weights.luxury,0,"high-cost avoidance must block remembered luxury");
}

{
  const intent=structuredIntent(trip(),{food:.35});
  assert(intent.weights.food>0,"non-conflicting memory should add a soft prior");
  assert(intent.weights.food<=.16,"persistent-memory effective lift must remain capped");
}

{
  const intent=structuredIntent(trip({mustHave:"sea"}),{food:.35});
  assert(intent.weights.beach>=.98,"hard/current sea preference must remain dominant");
}

{
  const learned=learnedPreferencesV45({learnedPreferences:{food:.9,relax:.2}});
  assert.equal(learned.food,.35,"stored learned preference must be clamped to .35");
  assert.equal(learned.relax,.2);
}

{
  const items:any[]=[
    {score:80,preScore:80,destination:{slug:"chania"}},
    {score:80,preScore:80,destination:{slug:"athens"}}
  ];
  const prior:KnowledgePriorV45={enabled:true,hits:[],bySlug:new Map([["chania",1]])};
  const ranked=applyKnowledgePriorV45(items,prior);
  const chania=ranked.find(x=>x.destination.slug==="chania");
  const athens=ranked.find(x=>x.destination.slug==="athens");
  assert.equal(chania.score,84,"knowledge retrieval may add at most four points");
  assert.equal(athens.score,80,"unmatched candidate must not receive semantic lift");
}

console.log("v45-memory-policy-smoke: ok");
