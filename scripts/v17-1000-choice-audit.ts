import assert from "node:assert/strict";
import { structuredIntent } from "../lib/ai/intent-v8";
import { geographyConstraint,matchesGeographyConstraint } from "../lib/decision/geography-constraint";
import { diversifyV8,finalRankV8,preRankV8,V8_ISLAND_SLUGS } from "../lib/decision/v8-matcher";
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
const inventoryIdeas=["Σαντορίνη","Πάρος","Κέρκυρα","Νάξος","Ζάκυνθος","Θεσσαλονίκη","Καβάλα","Ναύπλιο","Χανιά","Λευκάδα","Πάργα","Ιωάννινα","Σκιάθος","Ρόδος","Εύβοια","Βόλος","Καρπενήσι","Καλαμάτα","Κεφαλονιά","Σύρος","Αίγινα","Αράχωβα","Μήλος","Μονεμβασιά","Αλεξανδρούπολη","Κως","Πήλιο","Σκόπελος","Σύμη","Τήνος"] as const;
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
 "city break με κουλτούρα και φαγητό αλλά να υπάρχει και θάλασσα κοντά",
] as const;
const hardTexts=["θέλω μόνο δυτική Ελλάδα","χωρίς νησί παρακαλώ","θέλω μόνο Κρήτη","μόνο Κυκλάδες","θέλω μόνο βόρεια Ελλάδα","mainland only","only island","θέλω μόνο Ιόνιο"] as const;
const weather=(score:number):WeatherEvidence=>({source:"climatology",sourceLabel:"v17-choice-audit",score,confidence:"MEDIUM",typical:true,temperatureMeanC:score>=70?23:score>=55?19:15,summary:"audit evidence",researchedAt:new Date(0).toISOString()});

type Catalog=Awaited<ReturnType<typeof loadV8DestinationCatalog>>;
function exactDestination(name:string,catalog:Catalog){const n=norm(name);return catalog.find(destination=>[destination.slug,destination.nameEl,destination.nameEn,...destination.aliases].some(value=>norm(value)===n))??null}
function inc(map:Map<string,number>,key:string,by=1){map.set(key,(map.get(key)??0)+by)}
function top(map:Map<string,number>,n=15){return [...map].sort((a,b)=>b[1]-a[1]).slice(0,n)}
function profile(index:number,idea:string):TripRequest{
 const travelerType=pick(["solo","couple","family","friends"] as const),groupSize=travelerType==="solo"?1:travelerType==="couple"?2:pick([3,4,5,6]),startDate=pick(starts),nights=pick([2,3,4,5,7,9]),chosen=[...moods].sort(()=>random()-.5).slice(0,pick([1,2,3])),stress=index%4===0;
 const text=stress?`${pick(hardTexts)}. ${pick(freeTexts)}`:pick(freeTexts);
 return{origin:pick(origins),startDate,endDate:addDays(startDate,nights),month:"flexible",nights,budget:Math.min(5000,Math.max(180,pick([65,95,130,180,240])*groupSize*nights)),moods:chosen,travelerType,language:index%8===0?"en":"el",distancePreference:stress?pick(["nearby","easy-hop","island","any"] as const):pick(["nearby","easy-hop","any"] as const),pace:pick(["slow","balanced","full"] as const),hotelStyle:pick(["luxury","boutique","resort","value","any"] as const),avoid:stress?pick(["long-travel","high-cost","crowds","none"] as const):pick(["crowds","none","high-cost"] as const),entryMode:index%5===0?"unknown":"idea",groupSize,desiredEnergy:pick(["restore","balanced","stimulating"] as const),socialPreference:pick(["quiet","balanced","lively"] as const),noveltyPreference:pick(["familiar","balanced","surprise"] as const),mustHave:stress?pick(["sea","nature","culture","nightlife","none"] as const):pick(["none","sea","culture","nature"] as const),dateFlexibility:pick(["fixed","few-days","open"] as const),transportMode:pick(["no-car","car","electric-car","any"] as const),stayLocationPreference:pick(["central","balanced","outside"] as const),consideredDestination:index%5===0?undefined:idea,tripText:text};
}
function rank(request:TripRequest,catalog:Catalog){const intent=structuredIntent(request),pre=preRankV8(request,intent,catalog,30),evidence=new Map(pre.map(item=>[item.destination.slug,weather(item.destination.monthFit[Number(request.startDate.slice(5,7))-1]??60)]));return diversifyV8(finalRankV8(request,intent,pre,evidence),12)}
function signature(items:ReturnType<typeof rank>,n=3){return items.slice(0,n).map(item=>item.destination.slug).join("|")}

async function main(){
 const catalog=(await loadV8DestinationCatalog()).filter(item=>item.countryCode==="GR"),ideas=inventoryIdeas.filter(name=>exactDestination(name,catalog));
 assert(ideas.length>=24,`Only ${ideas.length} inventory ideas map to the active catalog`);
 const winners=new Map<string,number>(),top3=new Map<string,number>(),finalists=new Map<string,number>(),regions=new Map<string,number>(),segments=new Map<string,Map<string,number>>(),orders=new Set<string>(),pairings=new Map<string,number>();
 let nonEmpty=0,stable=0,hardLeaks=0,duplicates=0,ideaEligible=0,ideaVisible=0,ideaTop3=0,freeTextChanged=0,lowMargin=0,top3SameRegion=0,allIslandTop3=0,allMainlandTop3=0;
 const samples:Array<{index:number;segment:string;idea?:string;winner?:string;top3:string[];scores:number[];text:string}>=[];
 for(let index=0;index<CASES;index++){
  const idea=ideas[index%ideas.length],request=profile(index,idea),result=rank(request,catalog),again=rank(request,catalog),withoutText=rank({...request,tripText:undefined},catalog);
  if(result.length)nonEmpty++;if(signature(result,12)===signature(again,12))stable++;if(signature(result)!==signature(withoutText))freeTextChanged++;
  if(new Set(result.map(x=>x.destination.slug)).size!==result.length)duplicates++;
  const geo=geographyConstraint(request,catalog);if(result.some(item=>!matchesGeographyConstraint(item.destination,geo)))hardLeaks++;
  if(result[0]){inc(winners,result[0].destination.slug);inc(regions,result[0].destination.regionGroup);const segment=`${request.travelerType}|${request.desiredEnergy}|${request.socialPreference}`;if(!segments.has(segment))segments.set(segment,new Map());inc(segments.get(segment)!,result[0].destination.slug);}
  result.slice(0,3).forEach(item=>inc(top3,item.destination.slug));result.forEach(item=>inc(finalists,item.destination.slug));orders.add(signature(result,12));
  const t3=result.slice(0,3);for(let a=0;a<t3.length;a++)for(let b=a+1;b<t3.length;b++)inc(pairings,[t3[a].destination.slug,t3[b].destination.slug].sort().join("+"));
  if(t3.length===3){if(new Set(t3.map(x=>x.destination.regionGroup)).size===1)top3SameRegion++;const islands=t3.filter(x=>V8_ISLAND_SLUGS.has(x.destination.slug)).length;if(islands===3)allIslandTop3++;if(islands===0)allMainlandTop3++;}
  if(result.length>=2&&result[0].score-result[1].score<2)lowMargin++;
  if(request.consideredDestination){const target=exactDestination(request.consideredDestination,catalog),fullEligible=preRankV8(request,structuredIntent(request),catalog,catalog.length);if(target&&fullEligible.some(item=>item.destination.slug===target.slug)){ideaEligible++;const pos=result.findIndex(item=>item.destination.slug===target.slug);if(pos>=0)ideaVisible++;if(pos>=0&&pos<3)ideaTop3++;}}
  if(index<40||index%97===0)samples.push({index,segment:`${request.travelerType}|${request.desiredEnergy}|${request.socialPreference}`,idea:request.consideredDestination,winner:result[0]?.destination.slug,top3:t3.map(x=>x.destination.slug),scores:t3.map(x=>Number(x.score.toFixed(2))),text:request.tripText??""});
 }
 const maxWinner=top(winners,1)[0]??["none",0],maxTop3=top(top3,1)[0]??["none",0],maxFinalist=top(finalists,1)[0]??["none",0],segmentWinners=Object.fromEntries([...segments].slice(0,20).map(([segment,map])=>[segment,top(map,5)]));
 const output={seed,cases:CASES,catalogSize:catalog.length,inventoryIdeas:ideas.length,nonEmptyRate:nonEmpty/CASES,deterministicRate:stable/CASES,hardConstraintViolations:hardLeaks,duplicatePortfolios:duplicates,freeTextTop3ChangeRate:freeTextChanged/CASES,feasibleIdeaCases:ideaEligible,ideaVisibilityRate:ideaVisible/Math.max(1,ideaEligible),ideaTop3Rate:ideaTop3/Math.max(1,ideaEligible),uniqueWinners:winners.size,uniqueOrders:orders.size,maxWinner:{slug:maxWinner[0],count:maxWinner[1],share:maxWinner[1]/CASES},maxTop3Presence:{slug:maxTop3[0],count:maxTop3[1],share:maxTop3[1]/(CASES*3)},maxFinalistPresence:{slug:maxFinalist[0],count:maxFinalist[1],share:maxFinalist[1]/(CASES*12)},lowWinnerMarginRate:lowMargin/CASES,top3SameRegionRate:top3SameRegion/CASES,allIslandTop3Rate:allIslandTop3/CASES,allMainlandTop3Rate:allMainlandTop3/CASES,topWinners:top(winners,20),top3Presence:top(top3,20),finalistPresence:top(finalists,20),winnerRegions:top(regions,20),topPairings:top(pairings,20),segmentWinners,samples};
 console.log("V17_1000_CHOICE_AUDIT",JSON.stringify(output));
 assert.equal(hardLeaks,0,"Hard geography constraints leaked into the portfolio");assert.equal(duplicates,0,"Duplicate destinations appeared inside a portfolio");assert.equal(stable,CASES,"Identical deterministic inputs produced different portfolios");assert(nonEmpty/CASES>=.93,`Non-empty rate ${(nonEmpty/CASES*100).toFixed(1)}%`);assert(freeTextChanged/CASES>=.6,`Free text affects only ${(freeTextChanged/CASES*100).toFixed(1)}% of top-three outputs`);assert(winners.size>=28,`Only ${winners.size} unique winners`);assert(maxWinner[1]/CASES<=.18,`Winner ${maxWinner[0]} dominates ${(maxWinner[1]/CASES*100).toFixed(1)}%`);assert(maxTop3[1]/(CASES*3)<=.16,`Top-three presence of ${maxTop3[0]} is too high`);assert(top3SameRegion/CASES<=.18,`Top three all come from one region in ${(top3SameRegion/CASES*100).toFixed(1)}% of searches`);assert(ideaVisible/Math.max(1,ideaEligible)>=.85,`Explicit feasible idea visible only ${(ideaVisible/Math.max(1,ideaEligible)*100).toFixed(1)}%`);
}
void main();