const STAY_PRODUCT_MAP_URL=process.env.SUPABASE_STAY_PRODUCT_MAP_V32_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/stay-product-map-v32";

export interface StayMapProductV32{
 productId:string;
 placeId:string;
 name:string;
 location:string;
 address:string;
 latitude:number;
 longitude:number;
 category:string;
 imageUrl:string|null;
 price:number|null;
 fullPrice:number|null;
 discount:number|null;
 currency:string;
 onSale:boolean;
 availability:string;
 validTo:string|null;
 demandScore:number;
 trackingUrl:string;
}
export interface StayProductMapPayloadV32{version:number;source:string;generatedAt:string;count:number;locationCount:number;mapBounds:string;products:StayMapProductV32[]}
const finite=(value:unknown)=>Number.isFinite(Number(value))?Number(value):null;
const text=(value:unknown)=>typeof value==="string"?value.trim():"";

export async function loadStayProductMapV32(limit=220):Promise<StayProductMapPayloadV32>{
 const url=new URL(STAY_PRODUCT_MAP_URL);url.searchParams.set("limit",String(Math.max(20,Math.min(300,limit))));
 const response=await fetch(url,{next:{revalidate:300},headers:{accept:"application/json","user-agent":"ai-greece-travel/32"},signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw new Error(`Stay product map ${response.status}`);
 const raw=await response.json() as Record<string,unknown>,rows=Array.isArray(raw.products)?raw.products:[],products:StayMapProductV32[]=[];
 for(const value of rows){
  if(!value||typeof value!=="object"||Array.isArray(value))continue;const row=value as Record<string,unknown>,latitude=finite(row.latitude),longitude=finite(row.longitude),trackingUrl=text(row.trackingUrl),name=text(row.name),placeId=text(row.placeId),productId=text(row.productId);
  if(latitude==null||longitude==null||!trackingUrl||!name||!placeId||!productId)continue;
  products.push({productId,placeId,name,location:text(row.location),address:text(row.address),latitude,longitude,category:text(row.category),imageUrl:text(row.imageUrl)||null,price:finite(row.price),fullPrice:finite(row.fullPrice),discount:finite(row.discount),currency:text(row.currency)||"EUR",onSale:row.onSale===true,availability:text(row.availability),validTo:text(row.validTo)||null,demandScore:finite(row.demandScore)??0,trackingUrl});
 }
 return{version:32,source:text(raw.source)||"supabase-stay-offers",generatedAt:text(raw.generatedAt)||new Date().toISOString(),count:products.length,locationCount:Number(raw.locationCount)||new Set(products.map(item=>item.location)).size,mapBounds:"greece",products};
}
