import { NextResponse } from "next/server";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { seasonalStayFit } from "@/lib/decision/stay-seasonality-v66";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type StayPlace={
 id:string;
 property_name:string|null;
 location_label:string|null;
 address:string|null;
 city_raw:string|null;
 country_hint:string|null;
 latitude:number|null;
 longitude:number|null;
 category:string|null;
 hero_image_url:string|null;
 offer_count:number|null;
 min_price:number|null;
 currency:string|null;
 demand_score:number|null;
};
type OfferRow={
 source_product_id:string;
 place_id:string;
 property_name:string|null;
 location_label:string|null;
 tracking_url:string|null;
 image_url:string|null;
 thumb_url:string|null;
 in_stock:boolean|null;
 availability:string|null;
 valid_to:string|null;
 on_sale:boolean|null;
 currency:string|null;
 price:number|null;
 full_price:number|null;
 discount:number|null;
 demand_proxy:number|null;
 stay_places:StayPlace|null;
};
type Product={
 productId:string;placeId:string;name:string;location:string;address:string;latitude:number;longitude:number;
 category:string;imageUrl:string|null;price:number|null;fullPrice:number|null;discount:number|null;currency:string;
 onSale:boolean;availability:string;validTo:string|null;demandScore:number|null;trackingUrl:string;destinationSlug:string|null;
 intelligenceScore:number;seasonalScore:number;priceScore:number;demandSignal:number;mapSignal:"ai"|"demand"|"seasonal"|"value"|"explore";starTier:"gold"|"green"|"blue";
};

const base=()=>process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co";
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY??"";
const txt=(v:unknown)=>typeof v==="string"?v.trim():"";
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const norm=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
const rad=(n:number)=>n*Math.PI/180;
function kmBetween(aLat:number,aLon:number,bLat:number,bLon:number){const dLat=rad(bLat-aLat),dLon=rad(bLon-aLon),h=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
function enrichIntelligence(products:Product[],targetMonth:number,catalogBySlug:Map<string,{seasonProfile:string;tags:readonly string[]}>){
 const cleanProducts=products.map(p=>({
  ...p,
  price:p.price!=null&&p.price>=5?p.price:null,
  fullPrice:p.fullPrice!=null&&p.fullPrice>=5?p.fullPrice:null
 }));
 const groups=new Map<string,Product[]>();
 for(const p of cleanProducts){
  const k=p.destinationSlug||norm(p.location)||p.placeId;
  const arr=groups.get(k)??[];arr.push(p);groups.set(k,arr);
 }
 const demandValues=cleanProducts.map(x=>x.demandScore).filter((x):x is number=>typeof x==="number"&&Number.isFinite(x)).sort((a,b)=>a-b);
 const dLo=demandValues.length?demandValues[Math.floor(demandValues.length*.10)]:null;
 const dHi=demandValues.length?demandValues[Math.floor(demandValues.length*.90)]:null;
 const demandIsDiscriminating=dLo!=null&&dHi!=null&&dHi>dLo;
 const normalizeDemand=(v:number|null)=>{
  if(v==null||!demandIsDiscriminating)return 50;
  return Math.max(10,Math.min(100,Math.round(10+90*((v-dLo!)/(dHi!-dLo!)))));
 };
 const weights=demandIsDiscriminating?{demand:.40,seasonality:.33,priceValue:.27}:{demand:0,seasonality:.55,priceValue:.45};
 const localMedian=new Map<string,number|null>();
 for(const [k,rows] of groups){
  const ps=rows.map(x=>x.price).filter((x):x is number=>typeof x==="number"&&x>0).sort((a,b)=>a-b);
  localMedian.set(k,ps.length?ps[Math.floor(ps.length/2)]:null);
 }
 const enriched=cleanProducts.map(p=>{
  const groupKey=p.destinationSlug||norm(p.location)||p.placeId;
  const profile=p.destinationSlug?catalogBySlug.get(p.destinationSlug):null;
  const seasonal=seasonalStayFit({month:targetMonth,propertyName:p.name,category:p.category,location:[p.location,p.address].filter(Boolean).join(" "),destinationSlug:p.destinationSlug,destinationSeasonProfile:profile?.seasonProfile,destinationTags:profile?.tags}).score;
  const median=localMedian.get(groupKey)??null;
  const baseValue=median==null||p.price==null?52:Math.max(12,Math.min(100,Math.round((median/Math.max(1,p.price))*68)));
  const price=Math.max(10,Math.min(100,baseValue+(p.onSale?7:0)+(p.discount!=null&&p.discount>0?Math.min(10,Math.round(p.discount/5)):0)));
  const demand=normalizeDemand(p.demandScore);
  const score=Math.round(demand*weights.demand+seasonal*weights.seasonality+price*weights.priceValue);
  const mapSignal:Product["mapSignal"]=score>=84?"ai":demand>=78&&demand>=seasonal&&demand>=price?"demand":seasonal>=76&&seasonal>=price?"seasonal":price>=76?"value":"explore";
  const tier:Product["starTier"]=score>=84?"gold":score>=66?"green":"blue";
  return{...p,intelligenceScore:score,seasonalScore:seasonal,priceScore:price,demandSignal:demand,mapSignal,starTier:tier};
 });
 const ranked=[...groups.entries()].map(([key,rows0])=>{
  const rows=rows0.map(r=>enriched.find(x=>x.productId===r.productId)??r as Product);
  const top=[...rows].sort((a,b)=>b.intelligenceScore-a.intelligenceScore).slice(0,Math.min(6,rows.length));
  const score=top.reduce((s,x)=>s+x.intelligenceScore,0)/Math.max(1,top.length);
  const demand=top.reduce((s,x)=>s+(x.demandSignal??45),0)/Math.max(1,top.length);
  const seasonal=top.reduce((s,x)=>s+x.seasonalScore,0)/Math.max(1,top.length);
  const value=top.reduce((s,x)=>s+x.priceScore,0)/Math.max(1,top.length);
  return{key,rows,score,demand,seasonal,value};
 }).sort((a,b)=>b.score-a.score);
 const best=ranked[0];
 const focus=best?{
  latitude:best.rows.reduce((s,x)=>s+x.latitude,0)/best.rows.length,
  longitude:best.rows.reduce((s,x)=>s+x.longitude,0)/best.rows.length,
  zoom:best.rows.length>=8?9:10,
  label:best.rows[0]?.location||best.key,
  score:Math.round(best.score),
  demand:Math.round(best.demand),
  seasonality:Math.round(best.seasonal),
  value:Math.round(best.value),
  reason:demandIsDiscriminating?"live demand + seasonality + local best value":"seasonality + local best value · demand signal not discriminating"
 }:null;
 return{products:enriched,focus,weights,ratingUpgrade:"Verified external ratings may refine trust display; map intelligence never invents ratings.",demandIsDiscriminating,targetMonth};
}

async function page(offset:number,limit:number){
 const serviceKey=key();if(!serviceKey)throw new Error("service_role_missing");
 const url=new URL("/rest/v1/stay_offers",base());
 url.searchParams.set("select","source_product_id,place_id,property_name,location_label,tracking_url,image_url,thumb_url,in_stock,availability,valid_to,on_sale,currency,price,full_price,discount,demand_proxy,stay_places!inner(id,property_name,location_label,address,city_raw,country_hint,latitude,longitude,category,hero_image_url,offer_count,min_price,currency,demand_score)");
 url.searchParams.set("tracking_url","not.is.null");
 url.searchParams.set("order","demand_proxy.desc.nullslast,price.asc.nullslast");
 url.searchParams.set("limit",String(limit));
 url.searchParams.set("offset",String(offset));
 const response=await fetch(url,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8500)});
 if(!response.ok)throw new Error(`stay_map_${response.status}`);
 return await response.json() as OfferRow[];
}

export async function GET(request:Request){
 try{
  const requestUrl=new URL(request.url),quick=requestUrl.searchParams.get("mode")==="quick";
  const startRaw=requestUrl.searchParams.get("start")??"";
  const parsedMonth=/^\d{4}-(\d{2})-\d{2}$/.exec(startRaw)?.[1];
  const targetMonth=parsedMonth?Math.max(1,Math.min(12,Number(parsedMonth))):new Date().getUTCMonth()+1;
  const requested=Number(requestUrl.searchParams.get("limit")??(quick?24:1800));
  const limit=quick?Math.max(12,Math.min(60,Number.isFinite(requested)?Math.round(requested):24)):Math.max(100,Math.min(2000,Number.isFinite(requested)?Math.round(requested):1800));
  const catalog=await loadV8DestinationCatalog().catch(()=>[]),catalogBySlug=new Map(catalog.map(d=>[d.slug,{seasonProfile:d.seasonProfile,tags:d.tags as readonly string[]} ]));
  if(!key()){
   const fallbackUrl=new URL(process.env.SUPABASE_STAY_PRODUCT_MAP_V32_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/stay-product-map-v32");
   fallbackUrl.searchParams.set("limit",quick?String(limit):"300");
   const fallback=await fetch(fallbackUrl,{headers:{accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!fallback.ok)throw new Error("fallback_map_unavailable");
   const payload=await fallback.json() as Record<string,unknown>,rawProducts=Array.isArray(payload.products)?payload.products as Product[]:[];
   const intelligence=enrichIntelligence(rawProducts.map(p=>({...p,intelligenceScore:0,seasonalScore:0,priceScore:0,demandSignal:0,mapSignal:"explore",starTier:"blue" as const})),targetMonth,catalogBySlug);
   return NextResponse.json({...payload,products:intelligence.products,mapIntelligence:{focus:intelligence.focus,weights:intelligence.weights,ratingUpgrade:intelligence.ratingUpgrade,targetMonth:intelligence.targetMonth,demandIsDiscriminating:intelligence.demandIsDiscriminating},version:50,fullUniverse:false,demandLayer:{forecastStatus:"disabled",observedDemandStatus:intelligence.demandIsDiscriminating?"live-proxy":"non-discriminating",reason:intelligence.demandIsDiscriminating?"Map ranking uses observed inventory demand_proxy where it varies. This is not presented as demand forecasting.":"Observed demand_proxy is non-discriminating for this sample, so it is excluded from ranking rather than fabricated."}},{headers:{"cache-control":"private, max-age=0","x-content-type-options":"nosniff","x-travel-map":"v50-intelligence-fallback"}});
  }
  const destinationKeys=catalog.flatMap(d=>[d.nameEl,d.nameEn,...d.aliases].map(name=>({name:norm(name),slug:d.slug}))).filter(x=>x.name.length>=3).sort((a,b)=>b.name.length-a.name.length);
  const resolveDestination=(locationText:string,lat:number,lon:number)=>{
   const textual=destinationKeys.find(x=>locationText.includes(x.name))?.slug;
   if(textual)return textual;
   let best:{slug:string;km:number}|null=null;
   for(const d of catalog){
    const km=kmBetween(lat,lon,d.latitude,d.longitude);
    const radius=Math.max(18,Math.min(55,Number(d.hotelRadiusKm||30)+12));
    if(km<=radius&&(!best||km<best.km))best={slug:d.slug,km};
   }
   return best?.slug??null;
  };
  const rows:OfferRow[]=[],rowCeiling=quick?600:Math.max(limit*2,2000),offsetCeiling=quick?1000:3000;
  for(let offset=0;offset<offsetCeiling&&rows.length<rowCeiling;offset+=1000){
   const batch=await page(offset,quick?600:1000);rows.push(...batch);if(batch.length<(quick?600:1000))break;
  }
  const seen=new Set<string>(),today=new Date().toISOString().slice(0,10),products:Product[]=[];
  for(const row of rows){
   const place=row.stay_places,lat=num(place?.latitude),lon=num(place?.longitude),placeId=txt(row.place_id||place?.id),trackingUrl=txt(row.tracking_url),validTo=txt(row.valid_to);
   if(row.in_stock===false||(validTo&&validTo<today)||!placeId||seen.has(placeId)||lat==null||lon==null||!trackingUrl)continue;
   if(lat<34||lat>42.5||lon<19||lon>30)continue;
   seen.add(placeId);
   const locationText=norm([txt(row.location_label),txt(place?.location_label),txt(place?.city_raw),txt(place?.address)].filter(Boolean).join(" "));
   const destinationSlug=resolveDestination(locationText,lat,lon);
   products.push({
    productId:txt(row.source_product_id),placeId,name:txt(row.property_name)||txt(place?.property_name),
    location:txt(row.location_label)||txt(place?.location_label)||txt(place?.city_raw),
    address:txt(place?.address),latitude:lat,longitude:lon,category:txt(place?.category),
    imageUrl:txt(row.image_url)||txt(row.thumb_url)||txt(place?.hero_image_url)||null,
    price:num(row.price)??num(place?.min_price),fullPrice:num(row.full_price),discount:num(row.discount),
    currency:txt(row.currency)||txt(place?.currency)||"EUR",onSale:row.on_sale===true,
    availability:row.in_stock===true?"confirmed-active":txt(row.availability)||"valid-window-stock-unknown",
    validTo:validTo||null,demandScore:num(row.demand_proxy)??num(place?.demand_score),trackingUrl,destinationSlug,
    intelligenceScore:0,seasonalScore:0,priceScore:0,demandSignal:0,mapSignal:"explore",starTier:"blue"
   });
   if(products.length>=limit)break;
  }
  const intelligence=enrichIntelligence(products,targetMonth,catalogBySlug);
  return NextResponse.json({
   version:50,
   source:"supabase-stay-offers",
   generatedAt:new Date().toISOString(),
   count:intelligence.products.length,
   locationCount:new Set(intelligence.products.map(x=>x.location).filter(Boolean)).size,
   mapIntelligence:{focus:intelligence.focus,weights:intelligence.weights,ratingUpgrade:intelligence.ratingUpgrade,targetMonth:intelligence.targetMonth,demandIsDiscriminating:intelligence.demandIsDiscriminating},
   demandLayer:{forecastStatus:"disabled",observedDemandStatus:intelligence.demandIsDiscriminating?"live-proxy":"non-discriminating",reason:intelligence.demandIsDiscriminating?"Map ranking uses observed inventory demand_proxy where it varies. This is not presented as demand forecasting.":"Observed demand_proxy is non-discriminating for this sample, so it is excluded from ranking rather than fabricated."},
   products:intelligence.products
  },{headers:{"cache-control":"private, max-age=0","x-content-type-options":"nosniff","x-travel-map":"v50-intelligence"}});
 }catch(error){
  return NextResponse.json({version:50,source:"temporarily-unavailable",generatedAt:new Date().toISOString(),count:0,locationCount:0,products:[],degraded:true,detail:process.env.NODE_ENV==="development"&&error instanceof Error?error.message:undefined},{status:200,headers:{"cache-control":"public, max-age=30","x-travel-map":"degraded"}});
 }
}
