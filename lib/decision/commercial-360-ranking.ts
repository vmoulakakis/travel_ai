/**
 * TravelAI 360 commercial discovery portfolio, first deterministic baseline.
 *
 * Area first: rank a destination by demand, seasonal suitability, value,
 * and evidence coverage; then rank stays within the shortlisted areas.
 * Demand is omitted entirely if no observed variation is available.
 * These scores represent commercial opportunity proxies, NOT predicted
 * booking probabilities, neural embeddings, actual ratings, or guest reviews.
 */
export type CommercialStay={
 productId:string;placeId?:string;name?:string;latitude:number;longitude:number;
 destinationSlug:string|null;trackingUrl:string;
 intelligenceScore?:number;seasonalScore?:number;priceScore?:number;demandSignal?:number;
 demandScore?:number|null;imageUrl?:string|null;price?:number|null;
};
export type AreaInsight={key:string;score:number;season:number;demand:number|null;value:number;coverage:number;stayCount:number;why:string};
const clamp=(v:number)=>Math.max(0,Math.min(100,v));
const km=(a:CommercialStay,b:CommercialStay)=>{
 const r=Math.PI/180,lat=(b.latitude-a.latitude)*r,lon=(b.longitude-a.longitude)*r;
 const h=Math.sin(lat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(lon/2)**2;
 return 12742*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
};
const areaKey=(x:CommercialStay)=>x.destinationSlug||`geo-${Math.round(x.latitude*4)/4}-${Math.round(x.longitude*4)/4}`;
const median=(a:number[])=>{const n=[...a].sort((x,y)=>x-y);return n.length?n[Math.floor(n.length/2)]:50};
const valid=(p:CommercialStay)=>Boolean(p.productId&&p.trackingUrl)&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&p.latitude>=34&&p.latitude<=42.5&&p.longitude>=19&&p.longitude<=30;
export function rankCommercialAreas<T extends CommercialStay>(rows:T[]):AreaInsight[]{
 const groups=new Map<string,T[]>();
 for(const x of rows.filter(valid)){const key=areaKey(x);groups.set(key,[...(groups.get(key)||[]),x]);}
 const observations=rows.filter(valid).map(x=>x.demandScore).filter((x):x is number=>typeof x==="number"&&Number.isFinite(x));
 const demandActive=observations.length>=15&&Math.max(...observations)>Math.min(...observations);
 const result=[...groups].map(([key,items])=>{
  const top=[...items].sort((a,b)=>(b.intelligenceScore??50)-(a.intelligenceScore??50)).slice(0,Math.min(items.length,8));
  const season=median(top.map(x=>clamp(x.seasonalScore??50)));
  const value=median(top.map(x=>clamp(x.priceScore??50)));
  const demand=demandActive?median(top.map(x=>clamp(x.demandSignal??50))):null;
  const evidence=top.map(x=>(Boolean(x.imageUrl)?1:0)+(x.price!=null&&x.price>=5?1:0)+(Boolean(x.trackingUrl)?1:0));
  const coverage=clamp(Math.round(100*evidence.reduce((a,b)=>a+b,0)/(3*top.length)));
  // Stay inventory breadth is a modest reliability signal, never equal to demand.
  const breadth=clamp(50+Math.log2(1+items.length)*7);
  const score=Math.round(demand===null?season*.43+value*.32+coverage*.15+breadth*.10:
    season*.31+value*.26+demand*.23+coverage*.12+breadth*.08);
  const why=`Εποχικότητα ${Math.round(season)}/100 · αξία ${Math.round(value)}/100 · κάλυψη προσφορών ${coverage}%${demand===null?" · ζήτηση χωρίς διακριτική ένδειξη":` · παρατηρούμενη ζήτηση ${Math.round(demand)}/100`}`;
  return{key,score,season,demand,value,coverage,stayCount:items.length,why};
 });
 return result.sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
}
export function rankCommercialTop100<T extends CommercialStay>(rows:T[],limit=100):{areas:AreaInsight[];points:T[]}{
 const areas=rankCommercialAreas(rows);
 const byArea=new Map<string,T[]>();
 for(const x of rows.filter(valid)){const k=areaKey(x);byArea.set(k,[...(byArea.get(k)||[]),x]);}
 for(const [k,items] of byArea)byArea.set(k,items.sort((a,b)=>(b.intelligenceScore??50)-(a.intelligenceScore??50)||
  (b.seasonalScore??50)-(a.seasonalScore??50)||a.productId.localeCompare(b.productId)));
 const points:T[]=[],ids=new Set<string>(),areaCounts=new Map<string,number>();
 // Spread selection across top-ranked destinations before adding multiple stays.
 for(const cap of [1,2,3,5,12,100]){
  for(const area of areas){
   const items=byArea.get(area.key)||[];
   for(const stay of items){
    if(points.length>=limit)return{areas,points};
    if((areaCounts.get(area.key)||0)>=cap)break;
    if(ids.has(stay.productId)||points.some(x=>x.placeId&&stay.placeId&&x.placeId===stay.placeId))continue;
    if(cap<100&&points.some(x=>km(x,stay)<(cap===1?14:3)))continue;
    ids.add(stay.productId);points.push(stay);areaCounts.set(area.key,(areaCounts.get(area.key)||0)+1);
   }
  }
 }
 return{areas,points};
}
