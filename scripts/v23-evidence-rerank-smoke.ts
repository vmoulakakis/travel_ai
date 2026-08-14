import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyLocalityEvidenceScoresV23,scoreEvidenceTextV23 } from "../lib/ai/locality-evidence-reranker-v23";
import { vectorFromSemanticMapV23 } from "../lib/decision/fuzzy-semantic-v23";
import type { V23FuzzyIntentContract,V23SemanticDimension,V8Destination } from "../lib/decision/v8-types";
import type { V8Ranked } from "../lib/decision/v8-matcher";

function contract(primary:V23SemanticDimension):V23FuzzyIntentContract{const positive:Partial<Record<V23SemanticDimension,number>>={[primary]:.98,couple:.7};return{positive,negative:{},priorities:[primary],qualifiers:{avoidCrowds:0,easyAccess:0,slowRhythm:0,walkable:0,localCharacter:0},confidence:.98,source:"structured+deepseek",positiveVector:vectorFromSemanticMapV23(positive),negativeVector:Array(24).fill(0)}}
const cultureText="Ancient archaeological museum, Byzantine castle, historic old town and UNESCO heritage monuments.";
const natureText="Mountain forest, deep gorge, hiking trails, river, waterfall and national park landscape.";
const cultureOnCulture=scoreEvidenceTextV23(cultureText,contract("culture")),natureOnCulture=scoreEvidenceTextV23(natureText,contract("culture"));
const natureOnNature=scoreEvidenceTextV23(natureText,contract("nature")),cultureOnNature=scoreEvidenceTextV23(cultureText,contract("nature"));
assert.ok(cultureOnCulture.fit>natureOnCulture.fit+.20,"culture evidence must materially win a culture query");
assert.ok(natureOnNature.fit>cultureOnNature.fit+.20,"nature evidence must materially win a nature query");
function destination(slug:string):V8Destination{return{slug,nameEl:slug,nameEn:slug,countryCode:"GR",countryEl:"Ελλάδα",countryEn:"Greece",latitude:38,longitude:23,regionGroup:"test",aliases:[],tags:[],vector:Array(16).fill(.5),monthFit:Array(12).fill(80),idealNightsMin:2,idealNightsMax:5,costTier:3,effortAthens:"road-medium",effortThessaloniki:"road-medium",directFromAthens:true,routeConfidence:.8,travelerFit:{},crowdLevel:3,hotelRadiusKm:30,knowledgeSource:"test",seasonProfile:"test"}}
function ranked(slug:string,score:number):V8Ranked{return{destination:destination(slug),score,preScore:score,breakdown:{intent:70,season:70,effort:70,duration:70,budget:70,weather:70,traveler:70,crowdFit:70,routeConfidence:70}}}
const reordered=applyLocalityEvidenceScoresV23([ranked("generic",72),ranked("evidence-fit",70)],{generic:40,"evidence-fit":95});assert.equal(reordered[0].destination.slug,"evidence-fit","grounded locality evidence must be able to correct coarse recall order");
const safeMigration=readFileSync("supabase/migrations/20260815013000_v23_safe_locality_identity.sql","utf8");assert.match(safeMigration,/parent\.km<=12\.0/i);assert.match(safeMigration,/left join lateral/i);assert.match(safeMigration,/get_locality_stays_v23/i);assert.doesNotMatch(safeMigration,/canonical_distance_km<=65/i,"wide nearest-canonical fallback must not return");
const orchestrator=readFileSync("lib/ai/travel-orchestrator-v23.ts","utf8"),evidenceIndex=orchestrator.indexOf("runLocalityEvidenceRerankerV23"),choiceIndex=orchestrator.indexOf("applyChoiceCorrectnessV21(trip,intent,stayRequirements,localityEvidence.ranked)");assert.ok(evidenceIndex>=0&&choiceIndex>evidenceIndex,"evidence reranking must happen before choice shortlist correctness");
console.log("V23_EVIDENCE_RERANK_OK",JSON.stringify({cultureOnCulture:cultureOnCulture.fit,natureOnNature:natureOnNature.fit,reordered:reordered.map(x=>x.destination.slug)}));
