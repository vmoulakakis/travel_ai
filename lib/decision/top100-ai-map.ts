export type TravelMapCandidate={productId:string;latitude:number;longitude:number;destinationSlug:string|null;intelligenceScore?:number;seasonalScore?:number;priceScore?:number;demandSignal?:number;trackingUrl:string};
const distanceKm=(a:TravelMapCandidate,b:TravelMapCandidate)=>{
 const r=Math.PI/180,dLat=(b.latitude-a.latitude)*r,dLon=(b.longitude-a.longitude)*r;
 const h=Math.sin(dLat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dLon/2)**2;
 return 12742*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
};
const quality=(p:TravelMapCandidate)=>.58*(p.seasonalScore??50)+.28*(p.intelligenceScore??50)+.14*(p.priceScore??50);
/** Area-first shortlist over the observed nationwide stay inventory.
 * Step 1 ranks destination areas by robust median of best local candidates;
 * Step 2 selects high-fit stays, with geographical diversity and fair representation.
 * This is a transparent SHADOW retrieval baseline, not a trained neural model nor real guest ratings.
 */
export function selectTop100AiPoints<T extends TravelMapCandidate>(rows:T[],limit=100):T[]{
 const available=rows.filter(p=>!!p.productId&&!!p.trackingUrl&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&p.latitude>=34&&p.latitude<=42.5&&p.longitude>=19&&p.longitude<=30);
 const areas=new Map<string,T[]>();
 for(const p of available){const k=p.destinationSlug||`geo-${Math.round(p.latitude*2)/2}-${Math.round(p.longitude*2)/2}`;areas.set(k,[...(areas.get(k)??[]),p]);}
 const ranked=[...areas.entries()].map(([key,items])=>{
  const sorted=[...items].sort((a,b)=>quality(b)-quality(a)||a.productId.localeCompare(b.productId));
  const top=sorted.slice(0,Math.min(5,sorted.length)).map(quality).sort((a,b)=>a-b);
  const areaScore=top[Math.floor(top.length/2)]??0;
  return{key,sorted,areaScore};
 }).sort((a,b)=>b.areaScore-a.areaScore||a.key.localeCompare(b.key));
 const result:T[]=[],used=new Set<string>();
 for(const perArea of [1,2,3,5,100,101]){
  for(const area of ranked){
   let count=result.filter(x=>(x.destinationSlug||`geo-${Math.round(x.latitude*2)/2}-${Math.round(x.longitude*2)/2}`)===area.key).length;
   for(const p of area.sorted){
    if(result.length>=limit)return result;
    if(count>=perArea)break;
    if(used.has(p.productId)||result.some(x=>distanceKm(x,p)<(perArea===1?12:perArea===101?0:3)))continue;
    used.add(p.productId);result.push(p);count++;
   }
  }
 }
 return result;
}
