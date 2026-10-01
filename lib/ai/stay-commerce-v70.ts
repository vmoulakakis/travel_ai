import type {JsonRecord,V70Locale} from "@/lib/ai/travel-intelligence-v70";

export type StayInventoryV70={
 source_product_id:string;place_id:string;property_name:string;location_label:string|null;description:string|null;tracking_url:string;image_url:string|null;
 in_stock:boolean|null;availability:string|null;valid_from:string|null;valid_to:string|null;currency:string|null;price:number|null;full_price:number|null;
 observed_at:string|null;latitude:number|null;longitude:number|null;semantic_text:string|null;semantic_tags:string[]|null;traveler_fit:JsonRecord|null;evidence_score:number|null;
};

const baseUrl=()=>process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co";
const serviceKey=()=>process.env.SUPABASE_SERVICE_ROLE_KEY??"";
function headers(extra:Record<string,string>={}){const key=serviceKey();if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");return{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json",...extra}}
async function json<T>(response:Response):Promise<T>{if(!response.ok)throw new Error(`V70 commerce ${response.status}: ${(await response.text()).slice(0,400)}`);return await response.json() as T}

export async function loadStayInventoryV70(destinationSlug:string,limit=80):Promise<StayInventoryV70[]>{
 const response=await fetch(`${baseUrl().replace(/\/$/,"")}/rest/v1/rpc/get_agentic_stay_inventory_v70`,{method:"POST",headers:headers(),body:JSON.stringify({p_destination_slug:destinationSlug,p_limit:Math.max(1,Math.min(200,limit))}),cache:"no-store",signal:AbortSignal.timeout(8000)});
 return json<StayInventoryV70[]>(response);
}
export async function loadStayOfferV70(sourceProductId:string):Promise<StayInventoryV70|null>{
 const response=await fetch(`${baseUrl().replace(/\/$/,"")}/rest/v1/stay_offers?source_product_id=eq.${encodeURIComponent(sourceProductId)}&select=source_product_id,place_id,property_name,location_label,description,tracking_url,image_url,in_stock,availability,valid_from,valid_to,currency,price,full_price,observed_at&limit=1`,{headers:headers(),cache:"no-store",signal:AbortSignal.timeout(5000)});
 const rows=await json<Array<Partial<StayInventoryV70>>>(response),row=rows[0];
 return row?.source_product_id&&row.tracking_url?{source_product_id:row.source_product_id,place_id:row.place_id??"",property_name:row.property_name??"",location_label:row.location_label??null,description:row.description??null,tracking_url:row.tracking_url,image_url:row.image_url??null,in_stock:row.in_stock??null,availability:row.availability??null,valid_from:row.valid_from??null,valid_to:row.valid_to??null,currency:row.currency??null,price:row.price??null,full_price:row.full_price??null,observed_at:row.observed_at??null,latitude:null,longitude:null,semantic_text:null,semantic_tags:null,traveler_fit:null,evidence_score:null}:null;
}

export async function createTrackingActionV70(input:{journeyId?:string|null;sessionId?:string|null;actionType:"stay"|"activity"|"transport"|"restaurant"|"other";subjectKey?:string|null;trackingUrl:string;metadata?:JsonRecord}){
 const code=crypto.randomUUID().replace(/-/g,"").slice(0,16);
 const response=await fetch(`${baseUrl().replace(/\/$/,"")}/rest/v1/travel_tracking_actions_v70`,{method:"POST",headers:headers({Prefer:"return=representation"}),body:JSON.stringify({code,journey_id:input.journeyId??null,session_id:input.sessionId??null,action_type:input.actionType,subject_key:input.subjectKey??null,tracking_url:input.trackingUrl,metadata:input.metadata??{}}),cache:"no-store",signal:AbortSignal.timeout(5000)});
 const rows=await json<Array<{id:string;code:string;tracking_url:string}>>(response);if(!rows[0])throw new Error("Tracking action insert returned no row");return rows[0];
}

export async function resolveTrackingActionV70(code:string){
 const response=await fetch(`${baseUrl().replace(/\/$/,"")}/rest/v1/travel_tracking_actions_v70?code=eq.${encodeURIComponent(code)}&select=id,code,tracking_url,click_count,expires_at&limit=1`,{headers:headers(),cache:"no-store",signal:AbortSignal.timeout(5000)});
 const rows=await json<Array<{id:string;code:string;tracking_url:string;click_count:number;expires_at:string|null}>>(response),row=rows[0];if(!row)return null;if(row.expires_at&&Date.parse(row.expires_at)<Date.now())return null;return row;
}
export async function markTrackingClickV70(id:string,count:number){
 await fetch(`${baseUrl().replace(/\/$/,"")}/rest/v1/travel_tracking_actions_v70?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:headers({Prefer:"return=minimal"}),body:JSON.stringify({click_count:Math.max(0,count)+1,last_clicked_at:new Date().toISOString()}),cache:"no-store",signal:AbortSignal.timeout(3500)}).catch(()=>null);
}

export function publicStayV70(stay:StayInventoryV70,locale:V70Locale){return{sourceProductId:stay.source_product_id,placeId:stay.place_id,propertyName:stay.property_name,locationLabel:stay.location_label,imageUrl:stay.image_url,price:stay.price,currency:stay.currency,availability:stay.in_stock===false?(locale==="en"?"provider unavailable":"μη διαθέσιμο στον πάροχο"):stay.availability??(locale==="en"?"confirm with provider":"επιβεβαίωση στον πάροχο"),validTo:stay.valid_to,latitude:stay.latitude,longitude:stay.longitude,semanticText:stay.semantic_text,semanticTags:stay.semantic_tags,travelerFit:stay.traveler_fit,evidenceScore:stay.evidence_score}}
