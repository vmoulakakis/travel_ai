import assert from "node:assert/strict";
import { structuredIntent } from "../lib/ai/intent-v8";
import { canonicalRankingInputsV19 } from "../lib/decision/canonical-ranking-v19";
import { matchesLocationScopeV30 } from "../lib/decision/location-scope-v30";
import { diversifyV8,finalRankV8,preRankV8 } from "../lib/decision/v8-matcher";
import { loadV8DestinationCatalog } from "../lib/data/destination-v8";
import type { WeatherEvidence } from "../lib/decision/types";
import type { Mood,TripRequest } from "../lib/validation/trip";

const CASES=1000,seed=0x1700cafe;let state=seed;
const random=()=>{let t=state+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
const pick=<T>(items:readonly T[])=>items[Math.floor(random()*items.length)];
const addDays=(iso:string,days:number)=>new Date(Date.parse(`${iso}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);
const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
const moods:readonly Mood[]=["relax","romantic","food","warmth","city","nature","adventure","culture"];
const starts=["2026-09-18","2026-10-16","2026-11-13","2026-12-18","2027-01-15","2027-04-16","2027-06-18","2027-08-20"] as const;
const origins=["Athens","Thessaloniki","Patras","Heraklion","Larissa","Ioannina"] as const;
const inventoryIdeas=["Αθήνα","Σαντορίνη","Πάρος","Κέρκυρα","Νάξος","Ζάκυνθος","Θεσσαλονίκη","Καβάλα","Ναύπλιο","Χανιά","Λευκάδα","Πάργα","Ιωάννινα","Σκιάθος","Ρόδος","Εύβοια","Βόλος","Καρπενήσι","Καλαμάτα","Κεφαλονιά","Σύρος","Αίγινα","Αράχωβα","Μήλος","Μονεμβασιά","Αλεξανδρούπολη","Κως","Πήλιο","Σκόπελος","Σύμη","Τήνος","Μύκονος","Θάσος","Πρέβεζα","Άνδρος","Ηράκλειο","Λουτράκι"] as const;
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
 "θέλω κάτι διαφορετικό από τα συνηθισμένα, χωρίς όμως δύσκολη μετάβαση",
 "quiet island feel, local tavernas, no party crowds",
] as const;
const hardTexts=["θέλω μόνο δυτική Ελλάδα","χωρίς νησί παρακαλώ","θέλω μόνο Κρήτη","μόνο Κυκλάδες","θέλω μόνο βόρεια Ελλάδα","mainland only","only island","θέλω μόνο Ιόνιο"] as const;
const weather=(score:number):WeatherEvidence=>({source:"climatology",sourceLabel:"v30-choice-audit",score,confidence:"MEDIUM",typical:true,temperatureMeanC:score>=70?23:score>=55?19:15,summary:"audit evidence",researchedAt:new Date(0).toISOString()});

type Catalog=Awaited<ReturnType<typeof loadV8DestinationCatalog>>;
function exactDestination(name:string,catalog:Catalog){const n=norm(name);return catalog.find(destination=>[destination.slug,destination.nameEl,destination.nameEn,...destination.aliases].some(value=>norm(value)===n))??null}
function inc(map:Map<string,number>,key:string){map.set(key,(map.get(key)??0)+1)}
function profile(index:number,idea:string):TripRequest{
 const travelerType=pick(["solo","couple","family","friends"] as const),groupSize=travelerType==="solo"?1:travelerType==="couple"?2:pick([3,4,5,6]),startDate=pick(starts),nights=pick([2,3,4,5,7,9]),chosen=[...moods].sort(()=>random()-.5).slice(0,pick([1,2,3])),stress=index%4===0,unknown=index%5===0,ordinaryIdea=!stress&&!unknown;
 const tripText=stress?`${pick(hardTexts)}. ${pick(freeTexts)}`:pick(freeTexts);
 return{origin:pick(origins),startDate,endDate:addDays(startDate,nights),month:"flexible",nights,budget:Math.min(5000,Math.max(180,pick([65,95,130,180,240])*groupSize*nights)),moods:chosen,travelerType,language:index%8===0?"en":"el",distancePreference:ordinaryIdea?"any":stress?pick(["nearby","easy-hop","island","any"] as const):pick(["nearby","easy-hop","any"] as const),pace:pick(["slow","balanced","full"] as const),hotelStyle:ordinaryIdea?"any":pick(["luxury","boutique","resort","value","any"] as const),avoid:ordinaryIdea?"none":stress?pick(["long-travel","high-cost","crowds","none"] as const):pick(["crowds","none","high-cost"] as const),entryMode:unknown?"unknown":"idea",groupSize,desiredEnergy:pick(["restore","balanced","stimulating"] as const),socialPreference:pick(["quiet","balanced","lively"] as const),noveltyPreference:pick(["familiar","balanced","surprise"] as const),mustHave:ordinaryIdea?"none":stress?pick(["sea","nature","culture","nightlife","none"] as const):pick(["none","sea","culture","nature"] as const),dateFlexibility:pick(["fixed","few-days","open"] as const),transportMode:ordinaryIdea?"any":pick(["no-car","car","electric-car","any"] as const),stayLocationPreference:ordinaryIdea?"balanced":pick(["central","balanced","outside"] as const),consideredDestination:unknown?undefined:idea,tripText};
}
function rank(request:TripRequest,catalog:Catalog){
 const canonical=canonicalRankingInputsV19(request,catalog),intent=structuredIntent(request),pre=preRankV8(canonical.rankingTrip,intent,canonical.constrainedCatalog,30),evidence=new Map(pre.map(item=>[item.destination.slug,weather(item.destination.monthFit[Number(request.startDate.slice(5,7))-1]??60)])),result=diversifyV8(finalRankV8(canonical.rankingTrip,intent,pre,evidence),12,canonical.rankingTrip);
 return{...canonical,result};
}
function signature(items:ReturnType<typeof rank>["result"]){return items.map(item=>item.destination.slug).join("|")}

async function main(){
 const catalog=(await loadV8DestinationCatalog()).filter(item=>item.countryCode==="GR"),ideas=inventoryIdeas.filter(name=>exactDestination(name,catalog));
 assert(ideas.length>=30,`Only ${ideas.length} inventory ideas map to the active V30 catalog`);
 const winners=new Map<string,number>(),orders=new Set<string>(),leaks:string[]=[],duplicates:string[]=[];let stable=0,ordinaryIdea=0,ordinaryIdeaNonEmpty=0,ordinaryExact=0,ordinaryExactPass=0,unknown=0,unknownNonEmpty=0,stress=0,stressEmpty=0;
 for(let index=0;index<CASES;index++){
  const idea=ideas[index%ideas.length],request=profile(index,idea),first=rank(request,catalog),again=rank(request,catalog),result=first.result,isStress=index%4===0,isUnknown=index%5===0;
  if(signature(result)===signature(again.result))stable++;
  if(new Set(result.map(item=>item.destination.slug)).size!==result.length)duplicates.push(String(index));
  const outOfScope=result.filter(item=>!matchesLocationScopeV30(item.destination,first.hardConstraint));if(outOfScope.length)leaks.push(`${index}:${first.hardConstraint?.id}:${outOfScope.map(item=>item.destination.slug).join(",")}`);
  if(isUnknown){unknown++;if(result.length)unknownNonEmpty++;}
  else if(!isStress){ordinaryIdea++;if(result.length)ordinaryIdeaNonEmpty++;const target=exactDestination(idea,catalog);if(result.length&&target){ordinaryExact++;if(result.every(item=>item.destination.slug===target.slug))ordinaryExactPass++;}}
  if(isStress){stress++;if(!result.length)stressEmpty++;}
  if(result[0])inc(winners,result[0].destination.slug);orders.add(signature(result));
 }
 const topWinner=[...winners].sort((a,b)=>b[1]-a[1])[0]??["none",0] as [string,number],output={seed,cases:CASES,catalogSize:catalog.length,inventoryIdeas:ideas.length,deterministicRate:stable/CASES,locationScopeViolations:leaks.length,duplicatePortfolios:duplicates.length,ordinaryIdeaNonEmptyRate:ordinaryIdeaNonEmpty/Math.max(1,ordinaryIdea),ordinaryExactSelectedCityRate:ordinaryExactPass/Math.max(1,ordinaryExact),unknownNonEmptyRate:unknownNonEmpty/Math.max(1,unknown),stressNoResultRate:stressEmpty/Math.max(1,stress),uniqueWinners:winners.size,uniqueOrders:orders.size,maxWinner:{slug:topWinner[0],count:topWinner[1],share:topWinner[1]/CASES}};
 console.log("V30_1000_CHOICE_AUDIT",JSON.stringify(output));
 assert.equal(leaks.length,0,`Location constraints leaked: ${leaks.slice(0,10)}`);
 assert.equal(duplicates.length,0,"Duplicate destinations appeared inside a portfolio");
 assert.equal(stable,CASES,"Identical deterministic inputs produced different portfolios");
 assert(ordinaryIdeaNonEmpty/Math.max(1,ordinaryIdea)>=.95,`Ordinary selected-city non-empty rate ${(ordinaryIdeaNonEmpty/Math.max(1,ordinaryIdea)*100).toFixed(1)}%`);
 assert.equal(ordinaryExactPass,ordinaryExact,"An ordinary selected-city request returned another destination");
 assert(unknownNonEmpty/Math.max(1,unknown)>=.7,`Open discovery non-empty rate ${(unknownNonEmpty/Math.max(1,unknown)*100).toFixed(1)}%`);
 assert(stressEmpty>0,"Contradictory/red-line stress cases must be allowed to fail closed");
 assert(winners.size>=28,`Only ${winners.size} unique winners`);
 assert(topWinner[1]/CASES<=.08,`Winner ${topWinner[0]} dominates ${(topWinner[1]/CASES*100).toFixed(1)}%`);
}
void main();
