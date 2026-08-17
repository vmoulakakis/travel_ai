import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyCriterionRelevanceV22 } from "../lib/decision/criterion-relevance-v22";
import { scoreStayOffer,stayOfferCriterionDeltaV22 } from "../lib/decision/stay-offer-score";
import type { DestinationChoiceProfileV22 } from "../lib/data/destination-choice-profiles-v22";
import type { StayConstraintSpec,V8Destination,V8Dimension,V8IntentProfile,V8StayOffer } from "../lib/decision/v8-types";
import { V8_DIMENSIONS } from "../lib/decision/v8-types";
import type { V8Ranked } from "../lib/decision/v8-matcher";
import type { TripRequest } from "../lib/validation/trip";

const trip:TripRequest={origin:"Athens",startDate:"2026-09-18",endDate:"2026-09-22",month:"september",nights:4,budget:900,moods:["food"],travelerType:"couple",language:"el",distancePreference:"any",pace:"balanced",hotelStyle:"boutique",avoid:"none",entryMode:"unknown",groupSize:2,desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",dateFlexibility:"fixed",transportMode:"any",stayLocationPreference:"balanced"};
const dimIndex=Object.fromEntries(V8_DIMENSIONS.map((d,i)=>[d,i])) as Record<V8Dimension,number>;
function destination(slug:string):V8Destination{const vector=Array(16).fill(.05);vector[dimIndex.food]=1;vector[dimIndex.culture]=1;vector[dimIndex.nature]=1;return{slug,nameEl:slug,nameEn:slug,countryCode:"GR",countryEl:"Ελλάδα",countryEn:"Greece",latitude:38,longitude:23,regionGroup:"test",aliases:[],tags:["food","culture","nature"],vector,monthFit:Array(12).fill(85),idealNightsMin:2,idealNightsMax:5,costTier:3,effortAthens:"road-medium",effortThessaloniki:"road-medium",directFromAthens:true,routeConfidence:.9,travelerFit:{},crowdLevel:3,hotelRadiusKm:30,knowledgeSource:"test",seasonProfile:"test"};}
function ranked(slug:string):V8Ranked{return{destination:destination(slug),score:70,preScore:70,breakdown:{intent:80,season:80,effort:80,duration:90,budget:80,weather:70,traveler:80,crowdFit:80,routeConfidence:90}};}
function profile(slug:string,food:number,culture:number,nature:number,nightlife=.25):DestinationChoiceProfileV22{const vector=Array(24).fill(.35);vector[2]=food;vector[7]=culture;vector[5]=nature;vector[20]=nightlife;return{slug,vector,confidence:1};}
const pool=[ranked("thessaloniki"),ranked("syros"),ranked("zagori"),ranked("generic")],profiles=new Map<string,DestinationChoiceProfileV22>([
 ["thessaloniki",profile("thessaloniki",.85,.35,.3,.55)],
 ["syros",profile("syros",.3,.9,.3,.35)],
 ["zagori",profile("zagori",.3,.35,.9,.1)],
 ["generic",profile("generic",.3,.35,.3,.25)],
]);
function intent(primary:V8Dimension):V8IntentProfile{const weights=Object.fromEntries(V8_DIMENSIONS.map(d=>[d,d===primary?1.75:0])) as Record<V8Dimension,number>;return{weights,source:"structured+free",summary:primary,semantic:{positive:{[primary]:.95},negative:{},priorities:[primary],qualifiers:{avoidCrowds:0,easyAccess:0,slowRhythm:0,walkable:0,localCharacter:0},confidence:.95,source:"structured+free",rationale:[]}};}
const food=applyCriterionRelevanceV22({...trip,moods:["food"]},intent("food"),pool,profiles).ranked;
const culture=applyCriterionRelevanceV22({...trip,moods:["culture"]},intent("culture"),pool,profiles).ranked;
const nature=applyCriterionRelevanceV22({...trip,moods:["nature"]},intent("nature"),pool,profiles).ranked;
assert.equal(food[0].destination.slug,"thessaloniki");assert.equal(culture[0].destination.slug,"syros");assert.equal(nature[0].destination.slug,"zagori");
assert.notDeepEqual(food.slice(0,3).map(x=>x.destination.slug),culture.slice(0,3).map(x=>x.destination.slug),"changing the primary criterion must change the public choice order");
assert.notDeepEqual(culture.slice(0,3).map(x=>x.destination.slug),nature.slice(0,3).map(x=>x.destination.slug),"culture and nature must not collapse to the same Top-3 order");

const negativeIntent=intent("food");negativeIntent.semantic!.negative.nightlife=.95;const noNightlife=applyCriterionRelevanceV22({...trip,moods:["food"]},negativeIntent,pool,profiles).ranked;assert.ok(noNightlife.find(x=>x.destination.slug==="thessaloniki")!.score<food.find(x=>x.destination.slug==="thessaloniki")!.score,"strong negative nightlife must reduce a nightlife-heavy candidate");

const spec:StayConstraintSpec={hard:[],soft:["BREAKFAST"],confidence:"HIGH",source:"deterministic",needsSemanticAssist:false};
function stay(id:string,description:string):V8StayOffer{return{sourceProductId:id,propertyName:id,description,trackingUrl:"https://go.linkwi.se/z/CD104/x",distanceKm:2,raw:{}};}
const withBreakfast=stay("with-breakfast","Boutique hotel with breakfast included"),withoutBreakfast=stay("without-breakfast","Boutique hotel near the centre");withBreakfast.semanticScore=stayOfferCriterionDeltaV22(withBreakfast,spec);withoutBreakfast.semanticScore=stayOfferCriterionDeltaV22(withoutBreakfast,spec);
assert.ok((withBreakfast.semanticScore??0)>(withoutBreakfast.semanticScore??0)+20,"soft stay evidence must materially affect relevance");assert.ok(scoreStayOffer(withBreakfast,"boutique","balanced")>scoreStayOffer(withoutBreakfast,"boutique","balanced"),"UI stay sorter must preserve backend criterion relevance");

const health=readFileSync("app/api/health/route.ts","utf8");
assert.match(health,/release:\"V28\"/);assert.match(health,/engineVersion:\"V26\"/);assert.match(health,/choiceProfilesReady/);assert.match(health,/criterionSensitivityGate:true/);assert.match(health,/negationSafeStayEvidence:true/);
console.log("V22 criterion relevance and choice sensitivity: PASS");
