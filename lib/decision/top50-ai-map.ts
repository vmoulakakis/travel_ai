export type MapCandidate={productId:string;latitude:number;longitude:number;destinationSlug:string|null;intelligenceScore?:number;seasonalScore?:number;priceScore?:number;trackingUrl:string};
const distanceKm=(a:MapCandidate,b:MapCandidate)=>{
 const rad=Math.PI/180,dl=(b.latitude-a.latitude)*rad,doLon=(b.longitude-a.longitude)*rad;
 const h=Math.sin(dl/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(doLon/2)**2;
 return 12742*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
};
/** Geographic portfolio of 50 high-quality observed stay locations.
 * Not fifty independently verified attractions; that requires the experience knowledge pipeline.
 * Greedy spatial coverage keeps the default cinematic map readable at a national scale.
 */
export function selectTop50AiPoints<T extends MapCandidate>(rows:T[],max=50):T[]{
 const candidates=[...rows].filter(x=>Boolean(x.productId&&x.trackingUrl)&&Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)&&x.latitude>=34&&x.latitude<=42.5&&x.longitude>=19&&x.longitude<=30)
 .sort((a,b)=>(b.intelligenceScore??0)-(a.intelligenceScore??0)||(b.seasonalScore??0)-(a.seasonalScore??0)||a.productId.localeCompare(b.productId));
 const selected:T[]=[],ids=new Set<string>();
 for(const minDistance of [45,22,8,0]){
  for(const p of candidates){
   if(selected.length>=max)return selected;
   if(ids.has(p.productId))continue;
   if(minDistance&&selected.some(s=>distanceKm(s,p)<minDistance))continue;
   selected.push(p);ids.add(p.productId);
  }
 }
 return selected;
}
