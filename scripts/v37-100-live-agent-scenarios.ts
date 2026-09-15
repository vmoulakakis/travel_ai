import { buildEscapeSolutionsV36 } from "../lib/decision/solution-ranking-v36";
import type { TripRequest, Mood, TravelerType, MustHave, HotelStyle, Avoidance } from "../lib/validation/trip";

const dates=[
 ["2026-09-18","2026-09-21"],["2026-09-25","2026-09-28"],
 ["2026-10-02","2026-10-05"],["2026-10-09","2026-10-12"],["2026-10-16","2026-10-19"],
 ["2026-10-23","2026-10-26"],["2026-11-06","2026-11-09"],["2026-11-13","2026-11-16"],
 ["2026-11-20","2026-11-23"],["2026-12-04","2026-12-07"]
] as const;
const moodSets:Mood[][]=[
 ["relax"],["romantic"],["food"],["warmth"],["city"],["nature"],["adventure"],["culture"],
 ["relax","romantic"],["food","culture"]
];
const travelers:TravelerType[]=["solo","couple","family","friends"];
const musts:MustHave[]=["none","sea","nature","culture","nightlife"];
const styles:HotelStyle[]=["any","value","boutique","resort","luxury"];
const avoids:Avoidance[]=["none","high-cost","long-travel","crowds"];
const budgets=[300,450,650,900,1200,1600,2200,3000];

const scenarios:TripRequest[]=[];
for(let i=0;i<100;i++){
 const [startDate,endDate]=dates[i%dates.length];
 const nights=Math.round((Date.parse(endDate)-Date.parse(startDate))/86400000);
 scenarios.push({
  origin:i%3===0?"Θεσσαλονίκη":"Αθήνα",startDate,endDate,month:startDate.slice(5,7)==="09"?"september":startDate.slice(5,7)==="10"?"october":startDate.slice(5,7)==="11"?"november":"flexible",nights,
  budget:budgets[i%budgets.length],moods:moodSets[i%moodSets.length],travelerType:travelers[i%travelers.length],language:i%4===0?"en":"el",
  distancePreference:i%5===0?"island":i%4===0?"nearby":"any",pace:i%3===0?"slow":i%3===1?"balanced":"full",
  hotelStyle:styles[i%styles.length],avoid:avoids[i%avoids.length],entryMode:i%3===0?"surprise":"unknown",groupSize:travelers[i%travelers.length]==="solo"?1:travelers[i%travelers.length]==="couple"?2:4,
  desiredEnergy:i%3===0?"restore":i%3===1?"balanced":"stimulating",socialPreference:i%3===0?"quiet":i%3===1?"balanced":"lively",
  noveltyPreference:i%3===0?"familiar":i%3===1?"balanced":"surprise",mustHave:musts[i%musts.length],dateFlexibility:i%3===0?"fixed":i%3===1?"few-days":"open",transportMode:i%4===0?"no-car":"any",stayLocationPreference:i%3===0?"central":i%3===1?"balanced":"outside"
 });
}

async function main(){
 let failures=0,totalSolutions=0,minSolutions=99,totalOffers=0;
 for(let batch=0;batch<scenarios.length;batch+=5){
  const slice=scenarios.slice(batch,batch+5);
  const results=await Promise.all(slice.map(async(request,index)=>{
   try{
    const result=await buildEscapeSolutionsV36(request,null,10);
    return {id:batch+index+1,request,result};
   }catch(error){return {id:batch+index+1,request,error};}
  }));
  for(const row of results){
   if("error" in row){failures++;console.error(`FAIL #${row.id}: engine error`,row.error);continue;}
   const n=row.result.solutionCount;totalSolutions+=n;minSolutions=Math.min(minSolutions,n);totalOffers+=row.result.inventoryOfferCount;
   if(n<1){failures++;console.error(`FAIL #${row.id}: 0 solutions`,JSON.stringify({start:row.request.startDate,end:row.request.endDate,budget:row.request.budget,moods:row.request.moods,traveler:row.request.travelerType,must:row.request.mustHave,candidates:row.result.candidateCount,offers:row.result.inventoryOfferCount}));}
   else console.log(`PASS #${row.id}: ${n} solutions / ${row.result.inventoryOfferCount} offers / top=${row.result.solutions[0].recommendation.slug}`);
  }
 }
 console.log(JSON.stringify({scenarios:100,failures,minSolutions,avgSolutions:Number((totalSolutions/100).toFixed(2)),avgInventoryOffers:Number((totalOffers/100).toFixed(2))},null,2));
 if(failures>0)process.exit(1);
}

main().catch(error=>{console.error(error);process.exit(1);});
