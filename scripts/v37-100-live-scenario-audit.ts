import { buildEscapeSolutionsV37,structuredIntentV37 } from "../lib/decision/solution-ranking-v37";
import type { V8RecommendationResponse } from "../lib/decision/v8-types";
import type { TripRequest,Mood } from "../lib/validation/trip";

const windows=[
 ["2026-09-18","2026-09-21"],["2026-09-25","2026-09-28"],["2026-10-02","2026-10-05"],["2026-10-09","2026-10-12"],["2026-10-16","2026-10-19"],
 ["2026-10-23","2026-10-26"],["2026-11-06","2026-11-09"],["2026-11-13","2026-11-16"],["2026-11-20","2026-11-23"],["2026-12-18","2026-12-21"]
] as const;
const moodSets:Mood[][]=[["relax"],["romantic","food"],["warmth","relax"],["city","culture"],["nature","adventure"],["food","city"],["romantic","nature"],["culture","food"],["adventure","nature"],["warmth","romantic"]];
const origins=["Athens","Thessaloniki","Patras","Larissa","Ioannina"];
const budgets=[250,350,500,650,800,1000,1400,2000,3000,4800];
const travelers=["solo","couple","family","friends"] as const;
const must=["none","sea","nature","culture","nightlife"] as const;
const avoids=["none","long-travel","high-cost","crowds"] as const;
const styles=["any","value","boutique","resort","luxury"] as const;
const flex=["fixed","few-days","open"] as const;
const distances=["any","nearby","easy-hop","island"] as const;
const energies=["restore","balanced","stimulating"] as const;
const social=["quiet","balanced","lively"] as const;
const novelty=["familiar","balanced","surprise"] as const;

function scenario(i:number):TripRequest{
 const [startDate,endDate]=windows[i%windows.length],travelerType=travelers[i%travelers.length];
 return{origin:origins[i%origins.length],startDate,endDate,month:"flexible",nights:3,budget:budgets[i%budgets.length],moods:moodSets[i%moodSets.length],travelerType,language:i%3===0?"en":"el",distancePreference:distances[(i*3)%distances.length],pace:i%3===0?"slow":i%3===1?"balanced":"full",hotelStyle:styles[(i*2)%styles.length],avoid:avoids[(i*3)%avoids.length],entryMode:i%2===0?"unknown":"surprise",groupSize:travelerType==="solo"?1:travelerType==="couple"?2:travelerType==="family"?4:4,desiredEnergy:energies[(i*2)%energies.length],socialPreference:social[(i*2)%social.length],noveltyPreference:novelty[(i*4)%novelty.length],mustHave:must[(i*2)%must.length],dateFlexibility:flex[(i*2)%flex.length],transportMode:i%5===0?"no-car":"any",stayLocationPreference:i%3===0?"central":i%3===1?"balanced":"outside",tripText:`audit scenario ${i+1}: ${moodSets[i%moodSets.length].join(" ")} ${must[(i*2)%must.length]}`};
}

async function runOne(i:number){
 const request=scenario(i),base={intent:structuredIntentV37(request),profileSummary:`audit-${i+1}`} as unknown as V8RecommendationResponse;
 const result=await buildEscapeSolutionsV37(request,base,10);
 const errors:string[]=[];
 if(result.solutionCount<10)errors.push(`expected 10 solutions, got ${result.solutionCount}`);
 if(result.inventoryOfferCount<1)errors.push("no inventory was checked");
 const slugs=new Set(result.solutions.map(x=>x.recommendation.slug));if(slugs.size!==result.solutions.length)errors.push("duplicate destinations");
 for(const solution of result.solutions){if(!solution.stay.trackingUrl.startsWith("https://go.linkwi.se/")||!solution.stay.trackingUrl.includes("/CD104/"))errors.push(`bad tracking ${solution.stay.sourceProductId}`);if(!solution.stay.propertyName)errors.push("missing property name");if(!solution.stay.imageUrl)errors.push(`missing image ${solution.stay.sourceProductId}`);}
 return{index:i+1,mode:result.sourceMode,offers:result.inventoryOfferCount,destinations:result.diagnostics.distinctDestinations,relaxations:result.relaxationsApplied,errors};
}

const results:Array<Awaited<ReturnType<typeof runOne>>>=[];
for(let start=0;start<100;start+=5){const batch=await Promise.all(Array.from({length:Math.min(5,100-start)},(_,j)=>runOne(start+j)));results.push(...batch);}
const failed=results.filter(x=>x.errors.length),modes=results.reduce<Record<string,number>>((acc,x)=>(acc[x.mode]=(acc[x.mode]??0)+1,acc),{}),minOffers=Math.min(...results.map(x=>x.offers)),minDestinations=Math.min(...results.map(x=>x.destinations));
console.log(JSON.stringify({suite:"v37-100-live-scenario-audit",scenarios:results.length,passed:results.length-failed.length,failed:failed.length,modes,minOffers,minDestinations,sampleFailures:failed.slice(0,10)},null,2));
if(failed.length)throw new Error(`V37 live audit failed ${failed.length}/100 scenarios`);
