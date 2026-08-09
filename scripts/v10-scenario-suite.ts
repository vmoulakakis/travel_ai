import assert from "node:assert/strict";
import { structuredIntent } from "../lib/ai/intent-v8";
import { diversifyV8, finalRankV8, preRankV8, responseFeasibility, toRecommendationsV8, V8_ISLAND_SLUGS } from "../lib/decision/v8-matcher";
import { loadV8DestinationCatalog } from "../lib/data/destination-v8";
import type { WeatherEvidence } from "../lib/decision/types";
import type { TripRequest } from "../lib/validation/trip";

type Archetype={name:string;request:Partial<TripRequest>};
const archetypes:Archetype[]=[
  {name:"couple_restore_food",request:{travelerType:"couple",groupSize:2,moods:["relax","food"],desiredEnergy:"restore",socialPreference:"quiet",noveltyPreference:"balanced",mustHave:"none",avoid:"crowds",distancePreference:"easy-hop",budget:900}},
  {name:"couple_romance_idea",request:{travelerType:"couple",groupSize:2,moods:["romantic","culture"],desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"familiar",mustHave:"culture",avoid:"none",distancePreference:"any",consideredDestination:"Ναύπλιο",entryMode:"idea",budget:1100}},
  {name:"family_sea_value",request:{travelerType:"family",groupSize:4,moods:["relax","warmth"],desiredEnergy:"restore",socialPreference:"balanced",noveltyPreference:"familiar",mustHave:"sea",avoid:"high-cost",distancePreference:"island",budget:1400}},
  {name:"family_nature_quiet",request:{travelerType:"family",groupSize:4,moods:["nature","relax"],desiredEnergy:"restore",socialPreference:"quiet",noveltyPreference:"balanced",mustHave:"nature",avoid:"crowds",distancePreference:"nearby",budget:1100}},
  {name:"friends_lively",request:{travelerType:"friends",groupSize:4,moods:["food","city"],desiredEnergy:"stimulating",socialPreference:"lively",noveltyPreference:"balanced",mustHave:"nightlife",avoid:"none",distancePreference:"any",budget:1600}},
  {name:"solo_culture",request:{travelerType:"solo",groupSize:1,moods:["culture","city"],desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"familiar",mustHave:"culture",avoid:"long-travel",distancePreference:"easy-hop",budget:550}},
  {name:"solo_adventure",request:{travelerType:"solo",groupSize:1,moods:["adventure","nature"],desiredEnergy:"stimulating",socialPreference:"quiet",noveltyPreference:"surprise",mustHave:"nature",avoid:"none",distancePreference:"any",budget:700}},
  {name:"couple_sea_premium",request:{travelerType:"couple",groupSize:2,moods:["romantic","warmth"],desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"sea",avoid:"none",distancePreference:"island",budget:2400}},
  {name:"budget_culture",request:{travelerType:"friends",groupSize:3,moods:["food","culture"],desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"surprise",mustHave:"culture",avoid:"high-cost",distancePreference:"nearby",budget:650}},
  {name:"surprise_mixed",request:{travelerType:"couple",groupSize:2,moods:["food","nature"],desiredEnergy:"stimulating",socialPreference:"balanced",noveltyPreference:"surprise",mustHave:"none",avoid:"none",distancePreference:"any",entryMode:"surprise",budget:1200}},
];
const periods=["2026-09-18","2026-10-16","2026-11-13","2026-12-11","2027-01-15","2027-03-19","2027-05-14","2027-06-18","2027-07-16","2027-08-20"];
const addDays=(iso:string,days:number)=>new Date(Date.parse(`${iso}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);
const monthName=(iso:string):TripRequest["month"]=>iso.slice(5,7)==="09"?"september":iso.slice(5,7)==="10"?"october":iso.slice(5,7)==="11"?"november":"flexible";
const temperature=(month:number,warm:boolean)=>warm?([14,14,16,19,23,27,29,29,27,23,19,15][month]??20):([8,9,12,16,21,25,28,28,24,19,14,10][month]??18);
function evidence(score:number,mean:number):WeatherEvidence{return{source:"climatology",sourceLabel:"scenario-suite",score,confidence:"MEDIUM",typical:true,temperatureMeanC:mean,summary:`Εποχική ένδειξη ${score}`,researchedAt:new Date(0).toISOString()}}
function minimalRegionCap(ranked:ReturnType<typeof finalRankV8>,count:number){const capacity=new Map<string,number>();for(const item of ranked)capacity.set(item.destination.regionGroup,(capacity.get(item.destination.regionGroup)??0)+1);for(let cap=1;cap<=count;cap+=1)if([...capacity.values()].reduce((sum,value)=>sum+Math.min(value,cap),0)>=count)return cap;return count}

async function main(){
const catalog=(await loadV8DestinationCatalog()).filter(item=>item.countryCode==="GR");
assert(catalog.length>=20,`Expected a nationwide Greek catalog, got ${catalog.length}`);
let checks=0;const failures:string[]=[];const examples:Record<string,string[]>={};
for(let periodIndex=0;periodIndex<periods.length;periodIndex+=1){
  for(let archetypeIndex=0;archetypeIndex<archetypes.length;archetypeIndex+=1){
    const archetype=archetypes[archetypeIndex],startDate=periods[periodIndex],nights=2+((periodIndex+archetypeIndex)%6),origin=(periodIndex+archetypeIndex)%4===0?"Thessaloniki":(periodIndex+archetypeIndex)%4===1?"Patras":(periodIndex+archetypeIndex)%4===2?"Heraklion":"Athens";
    const request:TripRequest={origin,startDate,endDate:addDays(startDate,nights),month:monthName(startDate),nights,budget:900,moods:["relax"],travelerType:"couple",language:"el",distancePreference:"any",pace:archetype.request.desiredEnergy==="stimulating"?"full":archetype.request.desiredEnergy==="restore"?"slow":"balanced",hotelStyle:archetype.request.avoid==="high-cost"?"value":"any",avoid:"none",entryMode:"unknown",groupSize:2,desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",dateFlexibility:periodIndex%3===0?"few-days":"fixed",...archetype.request};
    const label=`${archetype.name}@${startDate}`;
    try{
      const intent=structuredIntent(request),pre=preRankV8(request,intent,catalog,30),month=Math.max(0,Number(startDate.slice(5,7))-1),weather=new Map(pre.map(item=>[item.destination.slug,evidence(item.destination.monthFit[month]??60,temperature(month,item.destination.tags.includes("warmth")))])),ranked=finalRankV8(request,intent,pre,weather),selected=diversifyV8(ranked,12),selectedAgain=diversifyV8(ranked,12);
      assert.equal(selected.length,Math.min(12,ranked.length),"must return up to twelve viable choices");checks+=1;
      assert.equal(new Set(selected.map(item=>item.destination.slug)).size,selected.length,"choices must be unique");checks+=1;
      assert(selected.every(item=>item.destination.countryCode==="GR"),"all choices must stay in Greece");checks+=1;
      assert.deepEqual(selectedAgain.map(item=>item.destination.slug),selected.map(item=>item.destination.slug),"same evidence must produce a stable answer");checks+=1;
      if(request.distancePreference==="island"){assert(selected.every(item=>V8_ISLAND_SLUGS.has(item.destination.slug)),"island-only leaked a mainland destination");checks+=1;}
      if(request.mustHave==="sea"){assert(selected.every(item=>item.destination.tags.includes("beach")),"sea must-have leaked a non-beach destination");checks+=1;}
      if(request.mustHave==="nature"){assert(selected.every(item=>item.destination.tags.includes("nature")),"nature must-have leaked a non-nature destination");checks+=1;}
      if(request.mustHave==="culture"){assert(selected.every(item=>item.destination.tags.includes("culture")),"culture must-have leaked a non-cultural destination");checks+=1;}
      if(request.mustHave==="nightlife"){assert(selected.every(item=>item.destination.tags.includes("nightlife")||item.destination.tags.includes("city")),"nightlife must-have leaked an unsuitable destination");checks+=1;}
      if(request.moods.includes("warmth")){const warmViable=ranked.filter(item=>item.breakdown.season>=55&&((item.weather?.temperatureMeanC??18)>=18));if(warmViable.length>=3)assert(selected.slice(0,3).every(item=>item.breakdown.season>=55&&((item.weather?.temperatureMeanC??18)>=18)),"warmth finalists ignored available season or temperature evidence");else assert(selected.slice(0,3).every(item=>item.score<=48),"an impossible warmth request must be labelled through compromise-level scores");checks+=1;}
      if(request.avoid==="crowds"){assert(selected.slice(0,3).every(item=>item.destination.crowdLevel<5),"avoid-crowds placed an extreme-crowd option in the finalists");checks+=1;}
      if(request.avoid==="high-cost"){assert(selected.slice(0,3).every(item=>item.destination.costTier<5),"avoid-high-cost placed a top-tier cost option in the finalists");checks+=1;}
      if(request.distancePreference==="nearby"){const nearbyViable=ranked.filter(item=>item.breakdown.effort>=65&&(request.avoid!=="crowds"||item.destination.crowdLevel<5)&&(request.avoid!=="high-cost"||item.destination.costTier<5));if(nearbyViable.length>0){assert(selected[0].breakdown.effort>=65,"nearby preference ignored an available low-friction first choice");checks+=1;}if(nearbyViable.length>=2){assert(selected.slice(0,3).filter(item=>item.breakdown.effort>=65).length>=2,"nearby preference ignored multiple available low-friction finalists");checks+=1;}}
      const counts=new Map<string,number>();for(const item of selected)counts.set(item.destination.regionGroup,(counts.get(item.destination.regionGroup)??0)+1);const maxRegion=Math.max(2,minimalRegionCap(ranked,selected.length));assert(Math.max(...counts.values())<=maxRegion,"too many choices came from the same region without a hard-constraint reason");checks+=1;
      const feasibility=responseFeasibility(selected);assert(["STRONG","MIXED","COMPROMISE"].includes(feasibility),"missing feasibility state");checks+=1;
      if(archetype.name==="couple_romance_idea")assert(selected.some(item=>item.destination.slug==="nafplio"),"a viable considered destination disappeared from all twelve options");
      examples[label]=selected.map(item=>item.destination.slug);
    }catch(error){failures.push(`${label}: ${error instanceof Error?error.message:String(error)}`)}
  }
}
const strictRequest:TripRequest={origin:"Athens",startDate:"2027-08-14",endDate:"2027-08-18",month:"flexible",nights:4,budget:800,moods:["nature","warmth"],travelerType:"family",language:"el",distancePreference:"nearby",pace:"slow",hotelStyle:"boutique",avoid:"crowds",entryMode:"unknown",groupSize:4,desiredEnergy:"balanced",socialPreference:"quiet",noveltyPreference:"surprise",mustHave:"sea",dateFlexibility:"fixed",tripText:"Οικογένεια με δύο παιδιά. Θέλω καθαρή θάλασσα, ησυχία, μικρή μετακίνηση, χωρίς πολύ κόσμο και αρκετές διαφορετικές επιλογές — όχι μόνο νησιά που μοιάζουν μεταξύ τους."};
const strictIntent=structuredIntent(strictRequest),strictPre=preRankV8(strictRequest,strictIntent,catalog,30),strictWeather=new Map(strictPre.map(item=>[item.destination.slug,evidence(item.destination.monthFit[7]??60,28)])),strictRanked=finalRankV8(strictRequest,strictIntent,strictPre,strictWeather),strictSelected=diversifyV8(strictRanked,12),strictRecommendations=toRecommendationsV8(strictRequest,strictSelected,12);
assert(strictSelected.length>=10,`strict family-sea scenario needs broad exploration, got ${strictSelected.length}`);checks+=1;
assert(strictSelected.some(item=>V8_ISLAND_SLUGS.has(item.destination.slug))&&strictSelected.some(item=>!V8_ISLAND_SLUGS.has(item.destination.slug)),"strict mixed-geography brief must contain both island and mainland/coastal paths");checks+=1;
assert(new Set(strictSelected.map(item=>item.destination.regionGroup)).size>=4,"strict scenario must span at least four regions");checks+=1;
assert(new Set(strictSelected.map(item=>item.explorationRole)).size>=8,"strict scenario must expose multiple exploration lenses");checks+=1;
assert.equal(new Set(strictRecommendations.map(item=>item.why)).size,strictRecommendations.length,"destination narratives must not be repeated");checks+=1;
assert.equal(failures.length,0,`V10 scenario failures (${failures.length}):\n${failures.join("\n")}`);
console.log("V10_100_SCENARIOS_OK",JSON.stringify({scenarios:100,checks,catalogSize:catalog.length,strictExplorer:strictSelected.map(item=>({slug:item.destination.slug,role:item.explorationRole})),examples:Object.fromEntries(Object.entries(examples).slice(0,5))}));
}
void main();
