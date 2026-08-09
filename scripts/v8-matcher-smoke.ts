import assert from "node:assert/strict";
import { structuredIntent } from "../lib/ai/intent-v8";
import { diversifyV8, finalRankV8, preRankV8 } from "../lib/decision/v8-matcher";
import { V8_DIMENSIONS,type V8Destination } from "../lib/decision/v8-types";
import type { WeatherEvidence } from "../lib/decision/types";
import type { TripRequest } from "../lib/validation/trip";

const profiles:Record<string,number[]>={city_med:[80,82,90,94,90,75,60,58,88,96,92,84],city_cont:[70,72,88,94,96,88,78,78,96,96,88,76],summer_island:[25,30,45,65,85,98,100,100,96,72,42,30],mountain:[92,92,88,75,65,55,45,45,65,82,90,95],nature_all:[70,72,85,95,98,90,82,82,96,96,88,76],warm_winter:[88,90,94,94,88,75,65,65,82,94,94,90],coast_city:[55,60,80,92,96,98,100,100,96,90,70,55]};
const vector=(tags:string[])=>V8_DIMENSIONS.map(x=>tags.includes(x)?1:.05);
function d(slug:string,name:string,country:string,tags:string[],profile:string,cost:1|2|3|4|5,effort:string,crowd:1|2|3|4|5=3,route=.9,direct=true,region=country,nMin=2,nMax=5):V8Destination{return{slug,nameEl:name,nameEn:name,countryCode:country,countryEl:country,countryEn:country,latitude:40,longitude:20,regionGroup:region,aliases:[name],tags:tags as V8Destination["tags"],vector:vector(tags),monthFit:profiles[profile],idealNightsMin:nMin,idealNightsMax:nMax,costTier:cost,effortAthens:effort,effortThessaloniki:effort,directFromAthens:direct,routeConfidence:route,travelerFit:{},crowdLevel:crowd,hotelRadiusKm:30,knowledgeSource:"test",seasonProfile:profile}}
const catalog:V8Destination[]=[
 d("nafplio","Nafplio","GR",["romantic","food","culture","city","short_break","shoulder_season","value"],"city_med",2,"road-near",3,.95,false,"peloponnese",2,4),
 d("monemvasia","Monemvasia","GR",["romantic","relax","food","culture","nature","luxury","short_break","shoulder_season"],"city_med",3,"road-medium",2,.95,false,"peloponnese",2,4),
 d("thessaloniki","Thessaloniki","GR",["romantic","food","culture","city","nightlife","family","value","short_break","shoulder_season"],"city_cont",2,"domestic-flight",4,.98,true,"macedonia",2,4),
 d("santorini","Santorini","GR",["romantic","food","culture","beach","luxury","warmth","short_break","shoulder_season"],"summer_island",5,"domestic-flight",5,.98,true,"cyclades",2,5),
 d("halkidiki","Halkidiki","GR",["relax","nature","beach","family","luxury","warmth"],"summer_island",3,"domestic-flight-plus-road",5,.9,false,"macedonia",3,7),
 d("arachova","Arachova","GR",["romantic","relax","nature","adventure","luxury","wellness","short_break"],"mountain",3,"road-near",4,.95,false,"central-greece",2,4),
 d("karpenisi","Karpenisi","GR",["romantic","relax","nature","adventure","family","wellness","value"],"mountain",2,"road-medium",2,.95,false,"central-greece",2,5),
 d("zagori","Zagori","GR",["romantic","relax","food","nature","adventure","luxury","wellness","shoulder_season"],"nature_all",3,"domestic-flight-plus-road",2,.8,false,"epirus",3,5),
 d("bansko","Bansko","BG",["relax","nature","adventure","family","value","wellness"],"mountain",2,"road-long",4,.8,false,"balkans",3,6),
 d("sofia","Sofia","BG",["food","culture","city","nightlife","value","short_break","shoulder_season"],"city_cont",1,"short-flight",3,.85,true,"balkans",2,4),
 d("budapest","Budapest","HU",["romantic","relax","food","culture","city","nightlife","value","wellness","short_break","shoulder_season"],"city_cont",2,"short-flight",4,.85,true,"central-europe",3,5),
 d("istanbul","Istanbul","TR",["romantic","food","culture","city","nightlife","luxury","value","short_break","shoulder_season"],"city_med",2,"short-flight",5,.98,true,"east-med",3,5),
 d("rome","Rome","IT",["romantic","food","culture","city","luxury","short_break","shoulder_season"],"city_med",4,"short-flight",5,.98,true,"italy",3,5),
 d("venice","Venice","IT",["romantic","food","culture","city","luxury","short_break","shoulder_season"],"city_cont",5,"short-flight",5,.8,true,"italy",2,4),
 d("paris","Paris","FR",["romantic","food","culture","city","luxury","short_break","shoulder_season"],"city_cont",5,"medium-flight",5,.98,true,"western-europe",3,5),
 d("malta","Malta","MT",["romantic","relax","food","culture","city","beach","warmth","short_break","shoulder_season"],"warm_winter",3,"short-flight",3,.85,true,"med-islands",3,6),
 d("larnaca","Larnaca","CY",["relax","food","culture","city","beach","family","value","warmth","short_break","shoulder_season"],"warm_winter",2,"short-flight",3,.98,true,"east-med",2,5)
];
function trip(overrides:Partial<TripRequest>):TripRequest{return{origin:"Athens",startDate:"2026-10-16",endDate:"2026-10-19",month:"october",nights:3,budget:500,moods:["romantic","food"],travelerType:"couple",language:"en",distancePreference:"easy-hop",pace:"balanced",hotelStyle:"boutique",avoid:"long-travel",...overrides}}
function weather(score:number,mean:number):WeatherEvidence{return{source:"climatology",sourceLabel:"test",score,confidence:"MEDIUM",typical:true,temperatureMeanC:mean,summary:`test ${score}`,researchedAt:new Date(0).toISOString()}}
function rank(r:TripRequest,w:Record<string,[number,number]>={}){const intent=structuredIntent(r),pre=preRankV8(r,intent,catalog,catalog.length),wm=new Map<string,WeatherEvidence>(pre.map(x=>[x.destination.slug,weather(w[x.destination.slug]?.[0]??70,w[x.destination.slug]?.[1]??20)]));return finalRankV8(r,intent,pre,wm)}
function rankGreece(r:TripRequest,w:Record<string,[number,number]>={}){const intent=structuredIntent(r),greek=catalog.filter(x=>x.countryCode==="GR"),pre=preRankV8(r,intent,greek,greek.length),wm=new Map<string,WeatherEvidence>(pre.map(x=>[x.destination.slug,weather(w[x.destination.slug]?.[0]??70,w[x.destination.slug]?.[1]??20)]));return finalRankV8(r,intent,pre,wm)}

const romantic=rank(trip({moods:["romantic","food"]}));const romanticTop=diversifyV8(romantic,5).map(x=>x.destination.slug);
assert(romanticTop.includes("nafplio"),`October romantic/food should include Nafplio; got ${romanticTop}`);
assert(romanticTop.some(x=>["budapest","istanbul","rome"].includes(x)),`October romantic/food should include a strong abroad city break; got ${romanticTop}`);
assert(!romanticTop.includes("halkidiki"),`October romantic/food should not be supply-biased to Halkidiki; got ${romanticTop}`);

const warmTrip=trip({startDate:"2026-11-13",endDate:"2026-11-16",month:"november",moods:["warmth","relax"],hotelStyle:"resort"});
const warm=rank(warmTrip,{larnaca:[88,22],malta:[84,21],santorini:[42,17],halkidiki:[35,13],rome:[58,16],budapest:[30,7]});const warmTop=diversifyV8(warm,5).map(x=>x.destination.slug);
assert(warmTop.slice(0,3).includes("larnaca")&&warmTop.slice(0,3).includes("malta"),`November warmth should prioritize Larnaca + Malta; got ${warmTop}`);
assert(warmTop[0]==="larnaca"&&warmTop[1]==="malta",`November warmth must lead with the only strong mild-weather fits; got ${warmTop}`);

const cheap=rank(trip({startDate:"2026-11-06",endDate:"2026-11-09",month:"november",budget:350,moods:["city","culture"],travelerType:"solo",hotelStyle:"value",avoid:"high-cost"}));const cheapScores=Object.fromEntries(cheap.map(x=>[x.destination.slug,x.score]));
assert(cheapScores.sofia>0&&cheapScores.paris===undefined,`A high-cost red line must keep Sofia and exclude Paris: ${cheapScores.sofia} vs ${cheapScores.paris}`);
assert(cheapScores.budapest>0&&cheapScores.venice===undefined,`A high-cost red line must keep Budapest and exclude Venice: ${cheapScores.budapest} vs ${cheapScores.venice}`);

const winter=rank(trip({startDate:"2027-01-15",endDate:"2027-01-18",month:"flexible",moods:["nature","relax"],avoid:"crowds",distancePreference:"any"}),{arachova:[76,5],karpenisi:[74,4],bansko:[78,-1],zagori:[70,5],paris:[45,4]});const winterTop=diversifyV8(winter,5).map(x=>x.destination.slug);
assert(winterTop.slice(0,4).some(x=>["arachova","karpenisi","bansko","zagori"].includes(x)),`Winter nature/relax should prioritize mountain/nature options; got ${winterTop}`);
assert(!winterTop.slice(0,3).includes("paris"),`Winter nature/relax should not prioritize Paris; got ${winterTop}`);

console.log("V8_MATCHER_SMOKE_OK",JSON.stringify({romanticTop,warmTop,winterTop}));

const greekRomantic=diversifyV8(rankGreece(trip({moods:["romantic","food"]})),8);
assert(greekRomantic.length>=6&&greekRomantic.length<=8,"Greek Travel Guru must return six to eight viable choices");
assert(greekRomantic.every(x=>x.destination.countryCode==="GR"),`Greek Travel Guru leaked a foreign destination: ${greekRomantic.map(x=>x.destination.slug)}`);
assert(greekRomantic.some(x=>x.destination.slug==="nafplio"),`Greek romantic/food shortlist should include Nafplio; got ${greekRomantic.map(x=>x.destination.slug)}`);

const greekWarm=diversifyV8(rankGreece(warmTrip,{rhodes:[58,17],chania:[58,17],corfu:[45,15],arachova:[75,5],halkidiki:[35,13]}),3);
assert(greekWarm.every(x=>(x.weather?.temperatureMeanC??0)>=18&&x.breakdown.season>=55),`Explicit warmth must be supported by dates and weather, regardless of a static destination tag; got ${greekWarm.map(x=>x.destination.slug)}`);
console.log("GREECE_ONLY_GATE_OK",JSON.stringify({greekRomantic:greekRomantic.map(x=>x.destination.slug),greekWarm:greekWarm.map(x=>x.destination.slug)}));
