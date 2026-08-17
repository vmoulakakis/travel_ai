import assert from "node:assert/strict";
import { structuredIntent } from "../lib/ai/intent-v8";
import { canonicalRankingInputsV19 } from "../lib/decision/canonical-ranking-v19";
import { matchesLocationScopeV30 } from "../lib/decision/location-scope-v30";
import { diversifyV8,finalRankV8,preRankV8 } from "../lib/decision/v8-matcher";
import { loadV8DestinationCatalog } from "../lib/data/destination-v8";
import type { WeatherEvidence } from "../lib/decision/types";
import type { Mood,TripRequest } from "../lib/validation/trip";

const CASES=1000,seed=0x15a11ce;let state=seed;
const random=()=>{let t=state+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
const pick=<T>(items:readonly T[])=>items[Math.floor(random()*items.length)];
const addDays=(iso:string,days:number)=>new Date(Date.parse(`${iso}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);
const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
const moods:readonly Mood[]=["relax","romantic","food","warmth","city","nature","adventure","culture"];
const starts=["2026-09-18","2026-10-16","2026-11-13","2027-01-15","2027-04-16","2027-06-18","2027-08-20"] as const;
const origins=["Athens","Thessaloniki","Patras","Heraklion","Larissa","Ioannina"] as const;
const inventoryBackedCityNames=["Αθήνα","Σαντορίνη","Πάρος","Κέρκυρα","Νάξος","Ζάκυνθος","Θεσσαλονίκη","Καβάλα","Ναύπλιο","Χανιά","Λευκάδα","Πάργα","Ιωάννινα","Σκιάθος","Ρόδος","Εύβοια","Βόλος","Καρπενήσι","Καλαμάτα","Κεφαλονιά","Σύρος","Αίγινα","Αράχωβα","Μήλος","Μονεμβασιά","Αλεξανδρούπολη","Κως","Πήλιο","Σκόπελος","Σύμη","Τήνος","Μύκονος","Θάσος","Πρέβεζα","Άνδρος","Ηράκλειο","Λουτράκι"] as const;
const freeTexts=[
 "θέλω ησυχία, καλό φαγητό και να μην τρέχουμε όλη μέρα",
 "thelo xalarosi kai kalo fagito, oxi tourist trap",
 "ζευγάρι, ωραία βόλτα, τοπικός χαρακτήρας και χωρίς πολύ άγχος",
 "couple trip, quiet local character, good food and an easy rhythm",
 "me paidia, fusi kai pragmata na kanoume xwris poly odigisi",
 "θέλω θάλασσα αλλά όχι πρόγραμμα μαραθώνιο",
 "pame kapou omorfa me paralia kai xalarosi",
 "θέλω πολιτισμό, παλιά πόλη και πραγματική αίσθηση τόπου",
 "food first, walkable atmosphere, not a generic resort feeling",
 "να πάρω ανάσα στη φύση αλλά να μη χαθεί όλη η μέρα στη μετάβαση",
 "friends trip with energy, food and some nightlife but not chaos",
 "romantic weekend, beautiful setting, slow mornings and good dinner",
] as const;
const hardTexts=["θέλω μόνο δυτική Ελλάδα","χωρίς νησί παρακαλώ","θέλω μόνο Κρήτη","μόνο Κυκλάδες","θέλω μόνο βόρεια Ελλάδα","mainland only","only island","θέλω μόνο Ιόνιο"] as const;
const weather=(score:number):WeatherEvidence=>({source:"climatology",sourceLabel:"v30-1000-location-audit",score,confidence:"MEDIUM",typical:true,temperatureMeanC:score>=70?23:18,summary:"audit evidence",researchedAt:new Date(0).toISOString()});

function exactDestination(name:string,catalog:Awaited<ReturnType<typeof loadV8DestinationCatalog>>){const n=norm(name);return catalog.find(destination=>[destination.slug,destination.nameEl,destination.nameEn,...destination.aliases].some(value=>norm(value)===n))??null}
function baseRequest(index:number,city:string,stress:boolean):TripRequest{
 const travelerType=pick(["solo","couple","family","friends"] as const),groupSize=travelerType==="solo"?1:travelerType==="couple"?2:pick([3,4,5,6]),startDate=pick(starts),nights=pick([2,3,4,5,7,9]),chosen=[...moods].sort(()=>random()-.5).slice(0,pick([1,2,3]));
 const tripText=stress?`${pick(hardTexts)}. ${pick(freeTexts)}`:pick(freeTexts);
 return{origin:pick(origins),startDate,endDate:addDays(startDate,nights),month:"flexible",nights,budget:Math.min(5000,Math.max(180,pick([65,95,130,180])*groupSize*nights)),moods:chosen,travelerType,language:index%9===0?"en":"el",distancePreference:stress?pick(["nearby","easy-hop","island","any"] as const):"any",pace:pick(["slow","balanced","full"] as const),hotelStyle:pick(["luxury","boutique","resort","value","any"] as const),avoid:stress?pick(["long-travel","high-cost","crowds","none"] as const):"none",entryMode:"idea",groupSize,desiredEnergy:pick(["restore","balanced","stimulating"] as const),socialPreference:pick(["quiet","balanced","lively"] as const),noveltyPreference:pick(["familiar","balanced","surprise"] as const),mustHave:stress?pick(["sea","nature","culture","nightlife","none"] as const):"none",dateFlexibility:pick(["fixed","few-days","open"] as const),transportMode:pick(["no-car","car","electric-car","any"] as const),stayLocationPreference:pick(["central","balanced","outside"] as const),consideredDestination:city,tripText};
}
function rank(request:TripRequest,catalog:Awaited<ReturnType<typeof loadV8DestinationCatalog>>){
 const{hardConstraint,constrainedCatalog,rankingTrip}=canonicalRankingInputsV19(request,catalog),intent=structuredIntent(request),pre=preRankV8(rankingTrip,intent,constrainedCatalog,30),evidence=new Map(pre.map(item=>[item.destination.slug,weather(item.destination.monthFit[Number(request.startDate.slice(5,7))-1]??60)])),result=diversifyV8(finalRankV8(rankingTrip,intent,pre,evidence),12,rankingTrip);
 return{result,hardConstraint};
}

async function main(){
 const catalog=(await loadV8DestinationCatalog()).filter(item=>item.countryCode==="GR"),inventoryCities=inventoryBackedCityNames.filter(name=>exactDestination(name,catalog));
 assert(inventoryCities.length>=30,`Only ${inventoryCities.length} inventory-backed names map to the active V30 catalog`);
 const supported=new Set(inventoryCities.map(norm)),violations:string[]=[],unsupported:string[]=[],duplicates:string[]=[];let nonEmpty=0,nonStress=0,nonStressNonEmpty=0,stressEmpty=0,stable=0,exactCityChecks=0,exactCityPass=0;const winners=new Map<string,number>(),orders=new Set<string>();
 for(let index=0;index<CASES;index+=1){
  const city=inventoryCities[index%inventoryCities.length],stress=index%3===0,request=baseRequest(index,city,stress);
  if(!supported.has(norm(request.consideredDestination??"")))unsupported.push(request.consideredDestination??"");
  const first=rank(request,catalog),second=rank(request,catalog),result=first.result,again=second.result;
  if(result.length)nonEmpty+=1;if(!stress){nonStress+=1;if(result.length)nonStressNonEmpty+=1}else if(!result.length)stressEmpty+=1;
  if(result.map(item=>item.destination.slug).join("|")===again.map(item=>item.destination.slug).join("|"))stable+=1;
  const leaked=result.filter(item=>!matchesLocationScopeV30(item.destination,first.hardConstraint));if(leaked.length)violations.push(`${index}:${first.hardConstraint?.id}:${leaked.map(item=>item.destination.slug).join(",")}`);
  if(new Set(result.map(item=>item.destination.slug)).size!==result.length)duplicates.push(String(index));
  const target=exactDestination(city,catalog);if(result.length&&target){exactCityChecks+=1;if(result.every(item=>item.destination.slug===target.slug))exactCityPass+=1;}
  if(result[0])winners.set(result[0].destination.slug,(winners.get(result[0].destination.slug)??0)+1);
  orders.add(result.map(item=>item.destination.slug).join("|"));
 }
 const topWinner=[...winners].sort((a,b)=>b[1]-a[1])[0]??["none",0] as [string,number],output={seed,cases:CASES,catalogSize:catalog.length,inventoryCities:inventoryCities.length,nonEmptyRate:nonEmpty/CASES,nonStressNonEmptyRate:nonStressNonEmpty/Math.max(1,nonStress),stressNoResultRate:stressEmpty/Math.ceil(CASES/3),deterministicRate:stable/CASES,locationScopeViolations:violations.length,unsupportedCitySelections:unsupported.length,duplicateResultSets:duplicates.length,exactSelectedCityRate:exactCityPass/Math.max(1,exactCityChecks),uniqueWinners:winners.size,uniqueOrders:orders.size,maxWinner:{slug:topWinner[0],count:topWinner[1],share:topWinner[1]/CASES}};
 console.log("V30_1000_SEARCH_AUDIT_OK",JSON.stringify(output));
 assert.equal(unsupported.length,0,`Unsupported city field values: ${unsupported.slice(0,10)}`);
 assert.equal(violations.length,0,`Location scope leaks: ${violations.slice(0,10)}`);
 assert.equal(duplicates.length,0,"Duplicate destinations appeared in a result portfolio");
 assert.equal(stable,CASES,"Deterministic path changed for identical input/evidence");
 assert(nonStressNonEmpty/Math.max(1,nonStress)>=.9,`Ordinary selected-city requests return results in only ${(nonStressNonEmpty/Math.max(1,nonStress)*100).toFixed(1)}% of cases`);
 assert.equal(exactCityPass,exactCityChecks,"A non-empty selected-city result contained an unrelated destination");
 assert(stressEmpty>0,"Contradictory/red-line stress requests should be allowed to fail closed");
 assert(winners.size>=24,`Only ${winners.size} unique selected-city winners across 1000 searches`);
 assert(topWinner[1]/CASES<=.08,`One destination dominates ${(topWinner[1]/CASES*100).toFixed(1)}% of searches`);
}
void main();
