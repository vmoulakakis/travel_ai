import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { structuredIntent } from "../lib/ai/intent-v8";
import { budgetTargetTierV26,criterionTruthV26,applyCriterionTruthV26 } from "../lib/decision/criterion-truth-v26";
import { mergeStructuredStayRequirementsV26,requiresVerifiedEvChargingV26 } from "../lib/decision/structured-stay-requirements-v26";
import { buildDestinationChoiceProfilesV26 } from "../lib/data/destination-choice-profiles-v26";
import { GREEK_ISLAND_SLUGS } from "../lib/decision/geography-constraint";
import { V8_DIMENSIONS,type V8Destination,type V8Dimension,type V8IntentProfile,type StayConstraintSpec } from "../lib/decision/v8-types";
import { preRankV8,type V8Ranked } from "../lib/decision/v8-matcher";
import type { TripRequest,Mood } from "../lib/validation/trip";

const baseVector=Object.fromEntries(V8_DIMENSIONS.map(d=>[d,.55])) as Record<V8Dimension,number>;
function destination(slug:string,tags:V8Dimension[],costTier:1|2|3|4|5=2,crowdLevel:1|2|3|4|5=2):V8Destination{
 const values={...baseVector};for(const tag of tags)values[tag]=.9;
 return{slug,nameEl:slug,nameEn:slug,countryCode:"GR",countryEl:"Ελλάδα",countryEn:"Greece",latitude:38,longitude:23,regionGroup:"test",aliases:[],tags,vector:V8_DIMENSIONS.map(d=>values[d]),monthFit:Array(12).fill(80),idealNightsMin:1,idealNightsMax:7,costTier,effortAthens:"road-near",effortThessaloniki:"road-medium",directFromAthens:true,routeConfidence:.95,travelerFit:{solo:.8,couple:.8,family:.8,friends:.8},crowdLevel,hotelRadiusKm:20,knowledgeSource:"curated-v26-test",seasonProfile:"all-year"};
}
const candidates=[
 destination("city-only",["city","culture","food","short_break","value"]),
 destination("thessaloniki",["city","culture","food","nightlife","short_break","value"],2,4),
 destination("naxos",["beach","nature","culture","food","relax","value"],2,3),
 destination("hydra",["beach","culture","romantic","short_break"],4,4),
 destination("santorini",["beach","culture","romantic","luxury"],5,5),
 destination("zagori",["nature","culture","adventure","relax"],3,2),
];
const intent:V8IntentProfile={weights:Object.fromEntries(V8_DIMENSIONS.map(d=>[d,.2])) as Record<V8Dimension,number>,source:"structured",summary:"test",semantic:{positive:{},negative:{},priorities:[],qualifiers:{avoidCrowds:0,easyAccess:0,slowRhythm:0,walkable:0,localCharacter:0},confidence:1,source:"structured",rationale:[]}};
const moodValues:Mood[]=["relax","romantic","food","warmth","city","nature","adventure","culture"];
const moodSets:Mood[][]=[];for(let mask=1;mask<(1<<moodValues.length);mask+=1){const set=moodValues.filter((_,i)=>(mask&(1<<i))!==0);if(set.length<=3)moodSets.push(set)}
assert.equal(moodSets.length,92,"All valid 1-3 mood combinations must be represented");

function request(overrides:Partial<TripRequest>={}):TripRequest{return{origin:"Athens",startDate:"2026-09-18",endDate:"2026-09-19",month:"september",nights:1,budget:800,moods:["relax"],travelerType:"couple",language:"el",distancePreference:"any",pace:"balanced",hotelStyle:"any",avoid:"none",entryMode:"unknown",groupSize:2,desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",dateFlexibility:"fixed",transportMode:"any",stayLocationPreference:"balanced",...overrides}}
function topSlug(r:TripRequest,pool:V8Destination[]){return preRankV8(r,structuredIntent(r),pool,pool.length)[0]?.destination.slug;}
function signature(r:TripRequest,pool:V8Destination[]){return preRankV8(r,structuredIntent(r),pool,pool.length).map(x=>x.destination.slug).join("|");}

// Hard truth regressions.
assert.equal(criterionTruthV26(request({mustHave:"nightlife"}),candidates[0],{effortScore:90}).eligible,false,"CITY is never proof of NIGHTLIFE");
assert.equal(criterionTruthV26(request({mustHave:"nightlife"}),candidates[1],{effortScore:90}).eligible,true);
assert.equal(budgetTargetTierV26(request({nights:1,budget:300,groupSize:2})),3,"one-night budget must divide by one night");
assert.equal(budgetTargetTierV26(request({nights:2,budget:300,groupSize:2})),2);

// EV criterion ownership: do not create a false feed no-result. Verify at stay selection using
// property evidence OR a mapped nearby charger; the UI blocks selection until this is verified.
const emptyStay:StayConstraintSpec={hard:[],soft:[],confidence:"HIGH",source:"deterministic",needsSemanticAssist:false};
assert.deepEqual(mergeStructuredStayRequirementsV26(request({transportMode:"electric-car"}),emptyStay).hard,[]);
assert.equal(requiresVerifiedEvChargingV26(request({transportMode:"electric-car"})),true);
const ui=readFileSync("components/travel-decision-experience.tsx","utf8");
assert(ui.includes('fetch("/api/ev-charging"'),"EV travellers must trigger the evidence endpoint on stay cards");
assert(ui.includes('charging?.status==="AT_PROPERTY"||charging?.status==="NEARBY"'),"EV selection must accept only property or mapped-nearby charging evidence");
assert(ui.includes('disabled={needsCharging&&!chargingVerified}'),"EV stay selection must remain blocked without verified charging");

// Curated profiles are complete and derive destination choice from canonical destination vectors,
// not accommodation descriptions.
const profiles=buildDestinationChoiceProfilesV26(candidates);assert.equal(profiles.size,candidates.length);assert.equal(profiles.get("thessaloniki")?.vector[20],.9);assert.equal(profiles.get("city-only")?.vector[20],.55);

// Exhaustive hard/red-line interaction grid. Budgets, nights and all 92 mood sets are rotated
// through the full categorical grid; each surviving candidate must satisfy every invariant.
const mustHaves:TripRequest["mustHave"][]=["sea","nature","culture","nightlife","none"],avoids:TripRequest["avoid"][]=["long-travel","high-cost","crowds","none"],distances:TripRequest["distancePreference"][]=["nearby","easy-hop","island","any"],transports:TripRequest["transportMode"][]=["no-car","car","electric-car","any"],socials:TripRequest["socialPreference"][]=["quiet","balanced","lively"],energies:TripRequest["desiredEnergy"][]=["restore","balanced","stimulating"],paces:TripRequest["pace"][]=["slow","balanced","full"],travelers:TripRequest["travelerType"][]=["solo","couple","family","friends"],styles:TripRequest["hotelStyle"][]=["luxury","boutique","resort","value","any"],budgets=[300,500,800,1200,1800,2500],nights=[1,2,3,4,5,6,7,8,9,10,11,12,13,14];
let combinations=0,candidateChecks=0;
for(const mustHave of mustHaves)for(const avoid of avoids)for(const distancePreference of distances)for(const transportMode of transports)for(const socialPreference of socials)for(const desiredEnergy of energies)for(const pace of paces)for(const travelerType of travelers)for(const hotelStyle of styles){
 const i=combinations++,n=nights[i%nights.length],budget=budgets[i%budgets.length],moods=moodSets[i%moodSets.length],groupSize=travelerType==="solo"?1:travelerType==="couple"?2:4,r=request({mustHave,avoid,distancePreference,transportMode,socialPreference,desiredEnergy,pace,travelerType,hotelStyle,nights:n,budget,moods,groupSize});
 for(let c=0;c<candidates.length;c+=1){const d=candidates[c],effort=[48,82,72,88,64,55][c],truth=criterionTruthV26(r,d,{effortScore:effort,publicStage:true});candidateChecks+=1;if(!truth.eligible)continue;
  if(mustHave==="sea")assert.ok(d.tags.includes("beach"));if(mustHave==="nature")assert.ok(d.tags.includes("nature"));if(mustHave==="culture")assert.ok(d.tags.includes("culture"));if(mustHave==="nightlife")assert.ok(d.tags.includes("nightlife"));
  if(distancePreference==="island")assert.ok(GREEK_ISLAND_SLUGS.has(d.slug));if(distancePreference==="nearby")assert.ok(effort>=70);if(distancePreference==="easy-hop")assert.ok(effort>=55);
  if(avoid==="crowds")assert.ok(d.crowdLevel<5);if(avoid==="high-cost")assert.ok(d.costTier<5&&d.costTier<=budgetTargetTierV26(r)+1);if(avoid==="long-travel")assert.ok(effort>=60);
  if(transportMode==="no-car")assert.ok(d.slug==="hydra"||d.tags.includes("city"));
 }
}
assert.equal(combinations,172800,"All categorical UI combinations must be exercised");
assert.equal(candidateChecks,combinations*candidates.length);

// Soft-criterion dominance: every valid 1-3 mood combination must prefer a destination that is
// stronger on every selected mood when all non-mood facts are held equal.
let moodDominanceChecks=0;
for(const moods of moodSets){const ideal=destination(`ideal-${moodDominanceChecks}`,moods as V8Dimension[]),decoy=destination(`decoy-${moodDominanceChecks}`,[]),r=request({moods});assert.equal(topSlug(r,[decoy,ideal]),ideal.slug,`Mood dominance failed for ${moods.join("+")}`);moodDominanceChecks+=1;}

// Counterfactual soft criteria must move the winner in the expected direction.
const quiet=destination("quiet",["relax","nature"],2,1),lively=destination("lively",["city","nightlife"],2,4);
assert.equal(topSlug(request({moods:["food"],socialPreference:"quiet"}),[lively,quiet]),"quiet");
assert.equal(topSlug(request({moods:["food"],socialPreference:"lively"}),[quiet,lively]),"lively");
const restore=destination("restore",["relax","nature","wellness"],2,2),stimulating=destination("stimulating",["city","culture","adventure"],2,2);
assert.equal(topSlug(request({moods:["food"],desiredEnergy:"restore"}),[stimulating,restore]),"restore");
assert.equal(topSlug(request({moods:["food"],desiredEnergy:"stimulating"}),[restore,stimulating]),"stimulating");
const family=destination("family",["family","nature","beach"],2,2),friends=destination("friends",["nightlife","adventure","city"],2,2);
assert.equal(topSlug(request({moods:["food"],travelerType:"family",groupSize:4}),[friends,family]),"family");
assert.equal(topSlug(request({moods:["food"],travelerType:"friends",groupSize:4}),[family,friends]),"friends");
assert.equal(topSlug(request({moods:["food"],pace:"slow"}),[stimulating,restore]),"restore");
assert.equal(topSlug(request({moods:["food"],pace:"full"}),[restore,stimulating]),"stimulating");
assert((structuredIntent(request({noveltyPreference:"surprise"})).weights.adventure??0)>(structuredIntent(request({noveltyPreference:"familiar"})).weights.adventure??0),"Surprise must increase adventure affinity");

// Criterion ownership: accommodation/date presentation preferences must not leak into destination
// choice. They are applied downstream to stays/date windows, not used to fabricate a destination fit.
const ownershipPool=[quiet,lively,restore,stimulating,family,friends];
const ownershipBase=request({moods:["food"],hotelStyle:"any",dateFlexibility:"fixed",stayLocationPreference:"balanced"}),baseSignature=signature(ownershipBase,ownershipPool);
for(const hotelStyle of styles)assert.equal(signature({...ownershipBase,hotelStyle},ownershipPool),baseSignature,`hotelStyle ${hotelStyle} leaked into destination ranking`);
for(const dateFlexibility of ["fixed","few-days","open"] as const)assert.equal(signature({...ownershipBase,dateFlexibility},ownershipPool),baseSignature,`date flexibility ${dateFlexibility} leaked into destination ranking`);
for(const stayLocationPreference of ["central","balanced","outside"] as const)assert.equal(signature({...ownershipBase,stayLocationPreference},ownershipPool),baseSignature,`stay location ${stayLocationPreference} leaked into destination ranking`);

// Public diversification input can never contain a hard-criterion violation and gets an accuracy floor.
const ranked:V8Ranked[]=candidates.map((d,index)=>({destination:d,score:92-index*8,preScore:92-index*8,breakdown:{intent:80,season:80,effort:[80,82,72,88,64,55][index],duration:80,budget:80,weather:80,traveler:80,crowdFit:80,routeConfidence:95}}));
const publicNightlife=applyCriterionTruthV26(request({mustHave:"nightlife"}),intent,ranked,{publicStage:true});assert.ok(publicNightlife.ranked.length>0);assert.ok(publicNightlife.ranked.every(item=>item.destination.tags.includes("nightlife")));
const publicCrowds=applyCriterionTruthV26(request({avoid:"crowds"}),intent,ranked,{publicStage:true});assert.ok(publicCrowds.ranked.every(item=>item.destination.crowdLevel<5));

console.log(JSON.stringify({ok:true,version:"V26",categoricalCombinations:combinations,moodCombinations:moodSets.length,moodDominanceChecks,candidateChecks,nightlifeProxy:"rejected",oneNightBudget:"correct",evCharging:"verified-at-stay-selection",criterionOwnership:"enforced"}));
