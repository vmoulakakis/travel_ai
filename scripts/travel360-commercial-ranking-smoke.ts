import assert from "node:assert/strict";
import {rankCommercialTop100,rankCommercialAreas} from "../lib/decision/commercial-360-ranking";
import {selectTop100AiPoints} from "../lib/decision/top100-ai-map";
const row=(i:number,area:string,season=72,value=78,demand:number|null=null)=>({
 productId:`stay-${i}`,placeId:`place-${i}`,name:`Stay ${i}`,destinationSlug:area,
 latitude:37+(i%100)*.00001,longitude:23+(i%100)*.00001,
 trackingUrl:`https://go.linkwi.se/${i}`,seasonalScore:season,priceScore:value,
 intelligenceScore:Math.round((season+value)/2),demandScore:demand,demandSignal:demand??50,
 price:100,imageUrl:"https://example.org/property.jpg"
});
const data=Array.from({length:1630},(_,i)=>row(i,`a-${i%100}`,60+(i%20),65+(i%15),null));
const chosen=rankCommercialTop100(data);
assert.equal(chosen.points.length,100,"nationwide map must fill 100 when enough real candidates");
assert.equal(new Set(chosen.points.map(p=>p.productId)).size,100,"unique IDs");
assert.equal(new Set(chosen.points.map(p=>p.destinationSlug)).size,100,"first round covers areas");
assert.equal(chosen.areas.length,100);
assert.ok(chosen.areas.every(a=>a.demand===null),"non-discriminating demand must be excluded");
assert.deepEqual(selectTop100AiPoints([...data].reverse()),selectTop100AiPoints(data),"source order independent");
assert.equal(rankCommercialAreas([row(1,"a",70,80),row(2,"b",70,80)]).length,2);
assert.deepEqual(rankCommercialTop100([row(1,"a",70,80),row(1,"a",70,80)]).points.length,1);
assert.ok(chosen.areas[0].why.includes("εποχ")||chosen.areas[0].why.includes("Εποχ"));
console.log("TRAVELAI_COMMERCIAL360_RANKING_OK areas=100 stays=100 demand_non_discriminating_ignored");
