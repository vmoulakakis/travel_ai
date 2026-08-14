import assert from "node:assert/strict";
import { structuredIntent } from "../lib/ai/intent-v8";
import { geographyConstraint,matchesGeographyConstraint } from "../lib/decision/geography-constraint";
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
const inventoryBackedCityNames=["Σαντορίνη","Πάρος","Κέρκυρα","Νάξος","Ζάκυνθος","Θεσσαλονίκη","Καβάλα","Ναύπλιο","Χανιά","Λευκάδα","Πάργα","Ιωάννινα","Σκιάθος","Ρόδος","Εύβοια","Βόλος","Καρπενήσι","Καλαμάτα","Κεφαλονιά","Σύρος","Αίγινα","Αράχωβα","Μήλος","Μονεμβασιά","Αλεξανδρούπολη","Κως","Πήλιο","Σκόπελος","Σύμη","Τήνος"] as const;
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
const weather=(score:number):WeatherEvidence=>({source:"climatology",sourceLabel:"v15-1000-audit",score,confidence:"MEDIUM",typical:true,temperatureMeanC:score>=70?23:18,summary:"audit evidence",researchedAt:new Date(0).toISOString()});

function exactDestination(name:string,catalog:Awaited<ReturnType<typeof loadV8DestinationCatalog>>){const n=norm(name);return catalog.find(destination=>[destination.slug,destination.nameEl,destination.nameEn,...destination.aliases].some(value=>norm(value)===n))??null}
function baseRequest(index:number,city:string,stress:boolean):TripRequest{
 const travelerType=pick(["solo","couple","family","friends"] as const),groupSize=travelerType==="solo"?1:travelerType==="couple"?2:pick([3,4,5,6]),startDate=pick(starts),nights=pick([2,3,4,5,7,9]),chosen=[...moods].sort(()=>random()-.5).slice(0,pick([1,2,3]));
 const tripText=stress?`${pick(hardTexts)}. ${pick(freeTexts)}`:pick(freeTexts);
 return{origin:pick(origins),startDate,endDate:addDays(startDate,nights),month:"flexible",nights,budget:Math.min(5000,Math.max(180,pick([65,95,130,180])*groupSize*nights)),moods:chosen,travelerType,language:index%9===0?"en":"el",distancePreference:stress?pick(["nearby","easy-hop","island","any"] as const):"any",pace:pick(["slow","balanced","full"] as const),hotelStyle:pick(["luxury","boutique","resort","value","any"] as const),avoid:stress?pick(["long-travel","high-cost","crowds","none"] as const):"none",entryMode:"idea",groupSize,desiredEnergy:pick(["restore","balanced","stimulating"] as const),socialPreference:pick(["quiet","balanced","lively"] as const),noveltyPreference:pick(["familiar","balanced","surprise"] as const),mustHave:stress?pick(["sea","nature","culture","nightlife","none"] as const):"none",dateFlexibility:pick(["fixed","few-days","open"] as const),transportMode:pick(["no-car","car","electric-car","any"] as const),stayLocationPreference:pick(["central","balanced","outside"] as const),consideredDestination:city,tripText};
}
function rank(request:TripRequest,catalog:Awaited<ReturnType<typeof loadV8DestinationCatalog>>){const intent=structuredIntent(request),pre=preRankV8(request,intent,catalog,30),evidence=new Map(pre.map(item=>[item.destination.slug,weather(item.destination.monthFit[Number(request.startDate.slice(5,7))-1]??60)]));return diversifyV8(finalRankV8(request,intent,pre,evidence),12)}

async function main(){
 const catalog=(await loadV8DestinationCatalog()).filter(item=>item.countryCode==="GR");
 const inventoryCities=inventoryBackedCityNames.filter(name=>exactDestination(name,catalog));
 assert(inventoryCities.length>=24,`Only ${inventoryCities.length} live-inventory city names map to the active catalog`);
 const supported=new Set(inventoryCities.map(norm)),violations:string[]=[],unsupported:string[]=[],duplicates:string[]=[];let nonEmpty=0,stable=0,cityFocus=0,cityVisible=0,freeTextChanged=0;const winners=new Map<string,number>(),orders=new Set<string>();
 for(let index=0;index<CASES;index+=1){
  const city=inventoryCities[index%inventoryCities.length],stress=index%3===0,request=baseRequest(index,city,stress);
  if(!supported.has(norm(request.consideredDestination??"")))unsupported.push(request.consideredDestination??"");
  const result=rank(request,catalog),again=rank(request,catalog),withoutText=rank({...request,tripText:undefined},catalog);
  if(result.length)nonEmpty+=1;
  if(result.map(item=>item.destination.slug).join("|")===again.map(item=>item.destination.slug).join("|"))stable+=1;
  if(result.slice(0,3).map(item=>item.destination.slug).join("|")!==withoutText.slice(0,3).map(item=>item.destination.slug).join("|"))freeTextChanged+=1;
  const constraint=geographyConstraint(request,catalog),leaked=result.filter(item=>!matchesGeographyConstraint(item.destination,constraint));if(leaked.length)violations.push(`${index}:${constraint?.id}:${leaked.map(item=>item.destination.slug).join(",")}`);
  if(new Set(result.map(item=>item.destination.slug)).size!==result.length)duplicates.push(String(index));
  if(result[0])winners.set(result[0].destination.slug,(winners.get(result[0].destination.slug)??0)+1);
  orders.add(result.map(item=>item.destination.slug).join("|"));
  if(!stress){cityFocus+=1;const target=exactDestination(city,catalog);if(target&&result.some(item=>item.destination.slug===target.slug))cityVisible+=1;}
 }
 const topWinner=[...winners].sort((a,b)=>b[1]-a[1])[0]??["none",0] as [string,number];
 const output={seed,cases:CASES,catalogSize:catalog.length,inventoryCities:inventoryCities.length,nonEmptyRate:nonEmpty/CASES,deterministicRate:stable/CASES,hardConstraintViolations:violations.length,unsupportedCitySelections:unsupported.length,duplicateResultSets:duplicates.length,freeTextTop3ChangeRate:freeTextChanged/CASES,cityIdeaVisibilityRate:cityFocus?cityVisible/cityFocus:0,uniqueWinners:winners.size,uniqueOrders:orders.size,maxWinner:{slug:topWinner[0],count:topWinner[1],share:topWinner[1]/CASES}};
 console.log("V15_1000_SEARCH_AUDIT_OK",JSON.stringify(output));
 assert.equal(unsupported.length,0,`Unsupported city field values: ${unsupported.slice(0,10)}`);
 assert.equal(violations.length,0,`Hard constraint leaks: ${violations.slice(0,10)}`);
 assert.equal(duplicates.length,0,"Duplicate destinations appeared in a result portfolio");
 assert.equal(stable,CASES,"Deterministic path changed for identical input/evidence");
 assert(nonEmpty/CASES>=.9,`Non-empty rate ${(nonEmpty/CASES*100).toFixed(1)}% is too low`);
 assert(freeTextChanged/CASES>=.55,`Free text affects only ${(freeTextChanged/CASES*100).toFixed(1)}% of top-three outputs`);
 assert(cityVisible/Math.max(1,cityFocus)>=.72,`Inventory-backed city idea appears in only ${(cityVisible/Math.max(1,cityFocus)*100).toFixed(1)}% of unconstrained portfolios`);
 assert(winners.size>=18,`Only ${winners.size} unique winners across 1000 searches`);
 assert(topWinner[1]/CASES<=.24,`One destination dominates ${(topWinner[1]/CASES*100).toFixed(1)}% of searches`);
}
void main();
