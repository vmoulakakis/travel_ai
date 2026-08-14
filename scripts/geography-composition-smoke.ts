import assert from "node:assert/strict";
import { geographyConstraint, matchesGeographyConstraint } from "@/lib/decision/geography-constraint";
import type { V8Destination } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

function request(tripText:string):TripRequest{return{
 origin:"Αθήνα",startDate:"2026-09-12",endDate:"2026-09-15",month:"september",nights:3,budget:700,moods:["nature"],travelerType:"couple",language:"el",distancePreference:"any",pace:"balanced",hotelStyle:"any",avoid:"none",entryMode:"idea",groupSize:2,desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",dateFlexibility:"fixed",transportMode:"car",stayLocationPreference:"balanced",tripText,
}}
function destination(slug:string,regionGroup:string,latitude:number,longitude:number,tags:string[]=[]):V8Destination{return{
 slug,nameEl:slug,nameEn:slug,countryCode:"GR",countryEl:"Ελλάδα",countryEn:"Greece",latitude,longitude,regionGroup,aliases:[],tags:tags as V8Destination["tags"],vector:[],monthFit:Array(12).fill(70),idealNightsMin:2,idealNightsMax:5,costTier:2,effortAthens:"road-medium",effortThessaloniki:"road-medium",directFromAthens:false,routeConfidence:.9,travelerFit:{},crowdLevel:2,hotelRadiusKm:25,knowledgeSource:"test",seasonProfile:"all-year",
}}

const parga=destination("parga","epirus",39.285,20.400,["beach","nature"]);
const corfu=destination("corfu","ionian",39.624,19.922,["beach","nature"]);
const nafplio=destination("nafplio","peloponnese",37.568,22.806,["culture"]);
const lefkada=destination("lefkada","ionian",38.706,20.640,["beach"]);
const meteora=destination("meteora","thessaly",39.721,21.630,["nature"]);
const volos=destination("volos","thessaly",39.362,22.943,["city","beach"]);
const catalog=[parga,corfu,nafplio,lefkada,meteora,volos];

const westMainland=geographyConstraint(request("Θέλω μόνο Δυτική Ελλάδα χωρίς νησί"),catalog);
assert.ok(westMainland);
assert.equal(westMainland.geography,"mainland");
assert.equal(matchesGeographyConstraint(parga,westMainland),true);
assert.equal(matchesGeographyConstraint(corfu,westMainland),false);
assert.equal(matchesGeographyConstraint(nafplio,westMainland),false);

const mainland=geographyConstraint(request("Δεν θέλω νησί, θέλω κάτι ήσυχο"),catalog);
assert.ok(mainland);
assert.equal(mainland.geography,"mainland");
assert.equal(matchesGeographyConstraint(corfu,mainland),false);

const island=geographyConstraint(request("Θέλω μόνο νησί"),catalog);
assert.ok(island);
assert.equal(matchesGeographyConstraint(lefkada,island),true);

const nearMountain=geographyConstraint(request("Θέλω κάτι κοντά στη Λάρισα και βουνό"),catalog);
assert.ok(nearMountain);
assert.ok(nearMountain.proximityCenters?.length);
assert.ok(nearMountain.requiredSlugs?.has("meteora"));
assert.equal(matchesGeographyConstraint(meteora,nearMountain),true);
assert.equal(matchesGeographyConstraint(volos,nearMountain),false);

const notOnly=geographyConstraint(request("Δεν θέλω μόνο νησιά, είμαι ανοιχτός και σε ηπειρωτικά"),catalog);
assert.equal(notOnly,null);

console.log("geography composition smoke: ok");
