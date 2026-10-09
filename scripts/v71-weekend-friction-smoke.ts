import assert from "node:assert/strict";
import { weekendFrictionChecksV71 } from "../lib/ai/travel-weekend-friction-v71";
import type { TripRequest } from "../lib/validation/trip";

const trip:TripRequest={
 origin:"Athens", startDate:"2026-10-23", endDate:"2026-10-25",month:"october",
 nights:2,budget:600,moods:["nature"],travelerType:"couple",language:"el",
 transportMode:"no-car",distancePreference:"any",pace:"balanced",hotelStyle:"any",
 avoid:"none",entryMode:"idea",groupSize:2,desiredEnergy:"balanced",
 socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",
 dateFlexibility:"fixed",stayLocationPreference:"balanced"
};

{
 const out=weekendFrictionChecksV71(trip,{
  slug:"aegina",regionGroup:"saronic",routeConfidence:.95,effortAthens:"ferry-easy",effortThessaloniki:"medium"
 });
 assert.deepEqual(out.checks.map(x=>x.key),["ferry-check","return-transport","last-mile"],
  "No-car island weekend must surface ferry, return and last mile before lower risks");
 assert(out.checks.every(x=>x.status==="not-verified"),"Never fabricate live verification");
}
{
 const out=weekendFrictionChecksV71({...trip,origin:"Patras",transportMode:"car"},{
  slug:"aegina",regionGroup:"saronic",routeConfidence:.95,effortAthens:"ferry-easy",effortThessaloniki:"medium"
 });
 assert(!out.checks.some(x=>x.key==="ferry-check"),
  "Do not apply Athens-specific route effort to an unknown starting city");
 assert(out.checks.some(x=>x.key==="whole-trip-budget"));
}
{
 const out=weekendFrictionChecksV71({...trip,transportMode:"car"},{
  slug:"zagori",regionGroup:"epirus",routeConfidence:.8,
  effortAthens:"domestic-flight-plus-road",effortThessaloniki:"road-medium"
 });
 assert(out.checks.some(x=>x.key==="weekend-hours"),
  "Two-night long-connection journey needs usable-time check");
}
{
 const out=weekendFrictionChecksV71({...trip,travelerType:"family",transportMode:"car",moods:["relax"],budget:0}, {
  slug:"nafplio",regionGroup:"peloponnese",routeConfidence:.95,
  effortAthens:"road-near",effortThessaloniki:"road-medium"
 },4);
 assert(out.checks.some(x=>x.key==="family-access"));
 assert(!out.checks.some(x=>x.key==="whole-trip-budget"));
 assert(out.checks.some(x=>x.key==="seasonal-opening"));
}
{
 const out=weekendFrictionChecksV71({...trip,transportMode:"electric-car",moods:["culture"]},{
  slug:"nafplio",regionGroup:"peloponnese",routeConfidence:.95,effortAthens:"road-near"
 },4);
 assert(out.checks.some(x=>x.key==="ev-charging"));
}
{
 const out=weekendFrictionChecksV71({...trip,transportMode:"car",moods:["culture"],startDate:"2027-07-02",endDate:"2027-07-04"},{
  slug:"nafplio",regionGroup:"peloponnese",routeConfidence:.95,effortAthens:"road-near"
 },4);
 assert(!out.checks.some(x=>x.key==="seasonal-opening"),"No generic winter notice in summer");
 assert.equal(out.evidenceStatus,"pre-booking-checks-not-live-verification");
}
console.log("v71-weekend-friction-smoke: ok");
