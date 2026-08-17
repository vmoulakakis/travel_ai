import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCityMapRankingV30,type BookingCitySignalV30,type TripadvisorCitySignalV30 } from "@/lib/ai/city-map-ranking-v30";
import { V30_FALLBACK_DESTINATIONS,mergeV30DestinationFallbacks } from "@/lib/data/destination-fallback-v30";
import { canonicalRankingInputsV19 } from "@/lib/decision/canonical-ranking-v19";
import { resolveLocationScopeV30,matchesLocationScopeV30 } from "@/lib/decision/location-scope-v30";
import type { InventoryDestinationOptionV15 } from "@/lib/data/stay-cities-v15";
import type { V8Destination } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

function destination(slug:string,nameEl:string,nameEn:string,regionGroup:string,latitude:number,longitude:number,aliases:string[]=[]):V8Destination{return{slug,nameEl,nameEn,countryCode:"GR",countryEl:"Ελλάδα",countryEn:"Greece",latitude,longitude,regionGroup,aliases,tags:["relax","food","culture","beach","value"],vector:Array(16).fill(.65),monthFit:[45,48,58,72,84,94,98,98,94,78,60,48],idealNightsMin:2,idealNightsMax:6,costTier:2,effortAthens:"road-medium",effortThessaloniki:"road-medium",directFromAthens:false,routeConfidence:.93,travelerFit:{},crowdLevel:3,hotelRadiusKm:30,knowledgeSource:"v30-test",seasonProfile:"coast_city"}}
const dbCatalog:V8Destination[]=[
 destination("naxos","Νάξος","Naxos","cyclades",37.1036,25.3764,["Νάξος"]),
 destination("chania","Χανιά","Chania","crete",35.5138,24.018,["Χανιά","Χανιά, Κρήτη"]),
 destination("rethymno","Ρέθυμνο","Rethymno","crete",35.3656,24.4822,["Ρέθυμνο","Ρέθυμνο, Κρήτη"]),
 destination("larissa","Λάρισα","Larissa","thessaly",39.639,22.419,["Λάρισα","Λάρισας","Larissa"]),
 destination("volos","Βόλος","Volos","thessaly",39.362,22.943,["Βόλος","Βόλο","Volos"]),
];
const catalog=mergeV30DestinationFallbacks(dbCatalog);
assert(catalog.some(item=>item.slug==="athens"),"Athens must exist even when the remote canonical catalog is missing it");
assert.equal(new Set(catalog.map(item=>item.slug)).size,catalog.length,"Fallback merge must not duplicate remote destinations");

function request(overrides:Partial<TripRequest>={}):TripRequest{return{origin:"Athens",startDate:"2026-09-18",endDate:"2026-09-23",month:"september",nights:5,budget:1200,moods:["relax","food"],travelerType:"couple",language:"el",distancePreference:"any",pace:"balanced",hotelStyle:"any",avoid:"none",entryMode:"unknown",groupSize:2,desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",dateFlexibility:"few-days",transportMode:"any",stayLocationPreference:"balanced",...overrides}}

const selectedNaxos=resolveLocationScopeV30(request({entryMode:"idea",consideredDestination:"naxos"}),catalog);
assert(selectedNaxos&&matchesLocationScopeV30(catalog.find(item=>item.slug==="naxos")!,selectedNaxos));
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="chania")!,selectedNaxos),false,"Selected Naxos must reject Chania before ranking");

const greekCase=resolveLocationScopeV30(request({tripText:"Θέλω διακοπές στη Νάξο, καλό φαγητό και παραλία"}),catalog);
assert(greekCase?.selectedSlugs?.has("naxos"),"Greek accusative Νάξο must resolve to canonical Naxos");
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="naxos")!,greekCase),true);
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="rethymno")!,greekCase),false);

const athensText=resolveLocationScopeV30(request({tripText:"Athens, Greece"}),catalog);
assert(athensText?.selectedSlugs?.has("athens"),"Athens, Greece must bind to canonical Athens");
const canonicalAthens=canonicalRankingInputsV19(request({tripText:"Athens, Greece"}),catalog);
assert.deepEqual(canonicalAthens.constrainedCatalog.map(item=>item.slug),["athens"],"Canonical ranking must receive only Athens");
assert.equal(canonicalAthens.rankingTrip.tripText,"","Legacy ranker must not reinterpret location text");
assert.equal(canonicalAthens.rankingTrip.consideredDestination,undefined,"Legacy consideredDestination bonus must be disabled after location truth");

const crete=resolveLocationScopeV30(request({tripText:"I want a vacation in Crete"}),catalog);
assert(crete,"Crete must create a region scope");
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="chania")!,crete),true);
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="heraklion")!,crete),true);
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="naxos")!,crete),false,"Crete request must never leak Cyclades");

const fromAthensToCrete=resolveLocationScopeV30(request({origin:"Athens",tripText:"from Athens to Crete, quiet hotel"}),catalog);
assert(fromAthensToCrete,"Route text must create a destination scope");
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="athens")!,fromAthensToCrete),false,"Origin Athens must not become destination");
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="chania")!,fromAthensToCrete),true);

const nearLarissa=resolveLocationScopeV30(request({tripText:"Θέλω κάτι κοντά στη Λάρισα και βουνό"}),catalog);
assert(nearLarissa,"Near-Larissa constraint must survive V30");
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="naxos")!,nearLarissa),false);

const outside=resolveLocationScopeV30(request({language:"en",tripText:"I want Rome, Italy for five nights"}),catalog);
assert.equal(outside?.source,"foreign-out-of-scope");
assert.equal(catalog.filter(item=>matchesLocationScopeV30(item,outside)).length,0,"Foreign destination must fail closed instead of returning unrelated Greece");
const foreignOrigin=resolveLocationScopeV30(request({language:"en",origin:"Rome",tripText:"from Rome, Italy to Crete"}),catalog);
assert.notEqual(foreignOrigin?.source,"foreign-out-of-scope","Foreign origin must not block a Greek destination");
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="chania")!,foreignOrigin),true);

const islandScope=resolveLocationScopeV30(request({distancePreference:"island"}),catalog);
for(const slug of ["naxos","mykonos","andros","thasos","astypalaia"]){const item=catalog.find(candidate=>candidate.slug===slug);assert(item,`${slug} fallback missing`);assert.equal(matchesLocationScopeV30(item!,islandScope),true,`${slug} must be recognized as an island`)}
assert.equal(matchesLocationScopeV30(catalog.find(item=>item.slug==="athens")!,islandScope),false);

const rankingCatalog=V30_FALLBACK_DESTINATIONS.filter(item=>["athens","mykonos"].includes(item.slug));
const inventory:InventoryDestinationOptionV15[]=[{slug:"athens",value:"athens",label:"Athens",propertyCount:47,offerCount:47,sourceCities:["Αθήνα"]},{slug:"mykonos",value:"mykonos",label:"Mykonos",propertyCount:19,offerCount:19,sourceCities:["Μύκονος"]}];
const base=buildCityMapRankingV30({catalog:rankingCatalog,inventory,month:9,limit:4});
assert(base.length===2);
assert(base.every(item=>item.aiScore===item.baseAiScore),"Missing external APIs must not create synthetic review scores");
const ta=new Map<string,TripadvisorCitySignalV30>([["mykonos",{status:"live",rating5:4.9,reviewCount:12000,bestRanking:1,sampleSize:6,sourceMonth:"September 2026"}]]),booking=new Map<string,BookingCitySignalV30>([["mykonos",{status:"live",reviewScore10:9.4,reviewCount:8000,accommodationCount:10,sourceDate:"2026-08-17"}]]),withExternal=buildCityMapRankingV30({catalog:rankingCatalog,inventory,month:9,tripadvisor:ta,booking,limit:4}),mykonos=withExternal.find(item=>item.slug==="mykonos")!;
assert(mykonos.tripadvisor?.rating5===4.9&&mykonos.booking?.reviewScore10===9.4);
assert(mykonos.aiScore>=0&&mykonos.aiScore<=100);

const mapComponent=readFileSync("components/ai-destination-map-v30.tsx","utf8"),mapApi=readFileSync("app/api/ai-map/route.ts","utf8"),mapDetail=readFileSync("app/api/ai-map/[slug]/route.ts","utf8"),home=readFileSync("components/ai-greece-home-v28.tsx","utf8"),bookingAdapter=readFileSync("lib/data/booking-demand-v30.ts","utf8");
assert(mapComponent.includes("leaflet")&&mapComponent.includes("OpenStreetMap"),"AI Map must use the open-source Leaflet/OSM path");
assert(mapComponent.includes("DAILY RANKING")&&mapComponent.includes("Tripadvisor")&&mapComponent.includes("Booking.com"));
assert(mapApi.includes("buildCityMapRankingV30")&&mapApi.includes("s-maxage=86400"),"Daily map API must be cacheable for a daily ranking cycle");
assert(mapDetail.includes("getTripadvisorBundleV25"),"Marker details must load trusted Tripadvisor evidence");
assert(home.includes('"/ai-map"')&&home.includes('"/en/ai-map"'),"AI Map must be reachable from the main bilingual menu");
assert(bookingAdapter.includes("BOOKING_DEMAND_API_KEY")&&bookingAdapter.includes("BOOKING_AFFILIATE_ID")&&bookingAdapter.includes("not-configured"),"Booking adapter must fail closed without partner credentials");

console.log("V30_LOCATION_MAP_OK",JSON.stringify({catalog:catalog.length,locationScenarios:9,mapRanking:true,foreignFailClosed:true,externalRatingsFailClosed:true}));
