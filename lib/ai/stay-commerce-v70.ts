import type {JsonRecord,V70Locale} from "@/lib/ai/travel-intelligence-v70";
import {callV70Backend} from "@/lib/ai/v70-supabase-gateway";

export type StayInventoryV70={
 source_product_id:string;place_id:string;property_name:string;location_label:string|null;description:string|null;tracking_url:string;image_url:string|null;
 in_stock:boolean|null;availability:string|null;valid_from:string|null;valid_to:string|null;currency:string|null;price:number|null;full_price:number|null;
 observed_at:string|null;latitude:number|null;longitude:number|null;semantic_text:string|null;semantic_tags:string[]|null;traveler_fit:JsonRecord|null;evidence_score:number|null;
};

export async function loadStayInventoryV70(destinationSlug:string,limit=80):Promise<StayInventoryV70[]>{
 return callV70Backend<StayInventoryV70[]>("stay_inventory",{destinationSlug,limit:Math.max(1,Math.min(200,limit))},9000);
}
export async function loadStayOfferV70(sourceProductId:string):Promise<StayInventoryV70|null>{
 const rows=await callV70Backend<Array<Partial<StayInventoryV70>>>("stay_offer",{sourceProductId},5000),row=rows[0];
 return row?.source_product_id&&row.tracking_url?{source_product_id:row.source_product_id,place_id:row.place_id??"",property_name:row.property_name??"",location_label:row.location_label??null,description:row.description??null,tracking_url:row.tracking_url,image_url:row.image_url??null,in_stock:row.in_stock??null,availability:row.availability??null,valid_from:row.valid_from??null,valid_to:row.valid_to??null,currency:row.currency??null,price:row.price??null,full_price:row.full_price??null,observed_at:row.observed_at??null,latitude:null,longitude:null,semantic_text:null,semantic_tags:null,traveler_fit:null,evidence_score:null}:null;
}

export async function createTrackingActionV70(input:{journeyId?:string|null;sessionId?:string|null;actionType:"stay"|"activity"|"transport"|"restaurant"|"other";subjectKey?:string|null;trackingUrl:string;metadata?:JsonRecord}){
 const code=crypto.randomUUID().replace(/-/g,"").slice(0,16);
 const rows=await callV70Backend<Array<{id:string;code:string;tracking_url:string}>>("create_tracking_action",{code,journeyId:input.journeyId??null,sessionId:input.sessionId??null,actionType:input.actionType,subjectKey:input.subjectKey??null,trackingUrl:input.trackingUrl,metadata:input.metadata??{}},5000);
 if(!rows[0])throw new Error("Tracking action insert returned no row");return rows[0];
}

export async function resolveTrackingActionV70(code:string){
 const rows=await callV70Backend<Array<{id:string;code:string;tracking_url:string;click_count:number;expires_at:string|null}>>("resolve_tracking_action",{code},5000),row=rows[0];if(!row)return null;if(row.expires_at&&Date.parse(row.expires_at)<Date.now())return null;return row;
}
export async function markTrackingClickV70(id:string,count:number){
 await callV70Backend<unknown>("mark_tracking_click",{id,count:Math.max(0,count)},3500).catch(()=>null);
}

export function publicStayV70(stay:StayInventoryV70,locale:V70Locale){return{sourceProductId:stay.source_product_id,placeId:stay.place_id,propertyName:stay.property_name,locationLabel:stay.location_label,imageUrl:stay.image_url,price:stay.price,currency:stay.currency,availability:stay.in_stock===false?(locale==="en"?"provider unavailable":"μη διαθέσιμο στον πάροχο"):stay.availability??(locale==="en"?"confirm with provider":"επιβεβαίωση στον πάροχο"),validTo:stay.valid_to,latitude:stay.latitude,longitude:stay.longitude,semanticText:stay.semantic_text,semanticTags:stay.semantic_tags,travelerFit:stay.traveler_fit,evidenceScore:stay.evidence_score}}
