import assert from "node:assert/strict";
import { structuredIntent } from "../lib/ai/intent-v8";
import { diversifyV8,type V8Ranked } from "../lib/decision/v8-matcher";
import { filterPortfolioV21,scoreGlobalStayCandidateV21,semanticEligibilityReasonV21 } from "../lib/decision/choice-correctness-v21";
import type { GlobalStayCandidateV21 } from "../lib/data/global-stays-v21";
import type { StayConstraintSpec,V8Destination,V8IntentProfile } from "../lib/decision/v8-types";
import type { TripRequest } from "../lib/validation/trip";

const trip:TripRequest={origin:"Athens",startDate:"2026-09-18",endDate:"2026-09-22",month:"september",nights:4,budget:900,moods:["food","relax"],travelerType:"couple",language:"el",distancePreference:"easy-hop",pace:"balanced",hotelStyle:"boutique",avoid:"none",entryMode:"unknown",groupSize:2,desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",dateFlexibility:"fixed",transportMode:"any",stayLocationPreference:"central",tripText:"φαγητό πρώτα αλλά όχι nightlife"};
const parsed=structuredIntent(trip);
assert.ok(parsed.weights.food>1,"V21 priority must outrank a normal structured mood");
assert.ok((parsed.semantic?.negative.nightlife??0)>.5,"negative nightlife must survive canonical parsing");

const blankVector=()=>Array(16).fill(.05);
function destination(slug:string,overrides:Partial<V8Destination>={}):V8Destination{return{slug,nameEl:slug,nameEn:slug,countryCode:"GR",countryEl:"Ελλάδα",countryEn:"Greece",latitude:38,longitude:23,regionGroup:"test",aliases:[],tags:[],vector:blankVector(),monthFit:Array(12).fill(80),idealNightsMin:2,idealNightsMax:5,costTier:3,effortAthens:"road-near",effortThessaloniki:"road-medium",directFromAthens:true,routeConfidence:.9,travelerFit:{},crowdLevel:2,hotelRadiusKm:30,knowledgeSource:"test",seasonProfile:"test",...overrides};}
function ranked(d:V8Destination,score=75):V8Ranked{return{destination:d,score,preScore:score,breakdown:{intent:80,season:80,effort:80,duration:90,budget:80,weather:70,traveler:80,crowdFit:80,routeConfidence:90}};}
const nightlife=destination("party",{tags:["nightlife"],vector:(()=>{const v=blankVector();v[8]=1;return v})()});
const food=destination("food",{tags:["food"],vector:(()=>{const v=blankVector();v[2]=1;return v})()});
const semanticIntent:V8IntentProfile={weights:{romantic:0,relax:0,food:1.75,culture:0,city:0,nature:0,beach:0,adventure:0,nightlife:0,family:0,luxury:0,value:0,warmth:0,wellness:0,short_break:0,shoulder_season:0},source:"structured+free",summary:"food first, no nightlife",semantic:{positive:{food:.95},negative:{nightlife:.95},priorities:["food"],qualifiers:{avoidCrowds:0,easyAccess:0,slowRhythm:0,walkable:0,localCharacter:0},confidence:.95,source:"structured+free",rationale:[]}};
assert.equal(semanticEligibilityReasonV21(ranked(nightlife),semanticIntent),"negative:nightlife");
assert.equal(semanticEligibilityReasonV21(ranked(destination("no-food")),semanticIntent),"priority-miss:food");
assert.equal(semanticEligibilityReasonV21(ranked(food),semanticIntent),null);

const spec:StayConstraintSpec={hard:[],soft:["BREAKFAST"],confidence:"HIGH",source:"deterministic",needsSemanticAssist:false};
function stay(name:string,description:string,semanticVector:number[]):GlobalStayCandidateV21{return{destinationSlug:"food",sourceProductId:name,propertyName:name,trackingUrl:"https://go.linkwi.se/z/CD104/test",description,inStock:null,validFrom:"2026-09-01T00:00:00Z",validTo:"2026-10-01T00:00:00Z",city:"food",address:"food",distanceKm:1,raw:{},semanticVector,semanticConfidence:.7};}
const boutiqueVector=Array(24).fill(.4);boutiqueVector[9]=.9;boutiqueVector[13]=.9;
const genericVector=Array(24).fill(.4);genericVector[9]=.25;genericVector[13]=.55;
const strongStay=scoreGlobalStayCandidateV21(stay("Boutique Breakfast House","boutique hotel with breakfast",boutiqueVector),trip,spec);
const weakStay=scoreGlobalStayCandidateV21(stay("Generic Hotel","standard hotel",genericVector),trip,spec);
assert.ok(strongStay.eligible&&weakStay.eligible);
assert.ok(strongStay.score>weakStay.score+10,"best property fit must react to stay criteria without using inventory count");

const rawPortfolio=diversifyV8([ranked(food,82),ranked(destination("relevant"),70),ranked(destination("weak"),45)],12,trip),portfolio=filterPortfolioV21(rawPortfolio);
assert.ok(portfolio.some(item=>item.destination.slug==="relevant"));
assert.ok(!portfolio.some(item=>item.destination.slug==="weak"),"final portfolio must not expose an irrelevant low-score diversity filler");
const compromise=filterPortfolioV21([ranked(destination("c1"),55),ranked(destination("c2"),44),ranked(destination("c3"),38),ranked(destination("c4"),33)]);
assert.equal(compromise.length,4,"a wholly compromise set may retain broad feasible exploration instead of pretending three strong answers exist");

console.log("V21 choice correctness smoke: PASS");
