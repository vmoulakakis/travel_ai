import assert from "node:assert/strict";
import { structuredIntent } from "../lib/ai/intent-v8";
import type { TripRequest } from "../lib/validation/trip";

const base:TripRequest={origin:"Athens",startDate:"2026-10-16",endDate:"2026-10-20",month:"october",nights:4,budget:900,moods:["romantic"],travelerType:"couple",language:"el",distancePreference:"any",pace:"balanced",hotelStyle:"any",avoid:"none",entryMode:"unknown",groupSize:2,desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",dateFlexibility:"fixed",transportMode:"any",stayLocationPreference:"balanced"};

const leisure=structuredIntent({...base,tripText:"thelo xalarosi kai kalo fagito se paralia me fusi, me paidia"}).weights;
assert(leisure.relax>=.82,"xalarosi must map to relax");
assert(leisure.food>=.84,"fagito must map to food");
assert(leisure.beach>=.92,"paralia must map to beach");
assert(leisure.nature>=.9,"fusi must map to nature");
assert(leisure.family>=.9,"paidia must map to family");

const culture=structuredIntent({...base,tripText:"thelo palia poli, arxaia kai politismo"}).weights;
assert(culture.culture>=.98,"Greeklish ancient/culture language must map to culture");
assert(culture.city>=.88,"poli must map to city");

const effort=structuredIntent({...base,tripText:"xwris poly odigisi, thelo na einai xalara"}).weights;
assert(effort.short_break>=.65,"low-driving Greeklish must influence short-break/easy rhythm intent");
assert(effort.relax>=.55,"low-driving request must preserve relaxed rhythm");

console.log("V15_GREEKLISH_INTENT_OK",JSON.stringify({relax:leisure.relax,food:leisure.food,beach:leisure.beach,nature:leisure.nature,family:leisure.family,culture:culture.culture,shortBreak:effort.short_break}));
