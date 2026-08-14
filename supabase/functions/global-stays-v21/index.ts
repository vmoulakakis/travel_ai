import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","access-control-allow-origin":"*"}});
const iso=/^\d{4}-\d{2}-\d{2}$/;
const clean=(value:unknown)=>typeof value==="string"?value.replace(/<[^>]*>/g," ").replace(/&[a-z]+;/gi," ").replace(/\s+/g," ").trim():"";
const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
const parseVector=(value:unknown)=>typeof value==="string"?value.replace(/^\[/,"").replace(/\]$/,"").split(",").map(Number).filter(Number.isFinite).slice(0,24):[];
const distanceMeters=(text:string)=>{for(const pattern of [/(\d{1,4})\s*(?:m|meters?|metres?|μετρ(?:α|ων)?)\s*(?:(?:from|απο)\s*)?(?:(?:the|την|τη)\s*)?(?:beach|παραλι)/i,/(?:beach|παραλι).{0,25}?(\d{1,4})\s*(?:m|meters?|metres?|μετρ(?:α|ων)?)/i]){const match=text.match(pattern);if(match){const n=Number(match[1]);if(Number.isFinite(n))return n;}}return null;};
function evidence(text:string){const d=distanceMeters(text);return{
 BEACHFRONT:/(?:\bbeachfront\b|\bsea[ -]?front\b|\bon the beach\b|\bdirectly on the beach\b|μπροστα.{0,35}(?:θαλασσ|παραλι)|πανω.{0,35}(?:θαλασσ|παραλι)|ακριβως.{0,35}παραλι|παραθαλασσι(?:ο|α|ες))/i.test(text),
 NEAR_BEACH:(d!=null&&d<=500)||/(?:walking distance.{0,30}(?:beach|sea)|near (?:the )?beach|close to (?:the )?beach|διπλα.{0,30}(?:θαλασσ|παραλι)|κοντα.{0,30}παραλι)/i.test(text),
 SEA_VIEW:/(?:sea view|ocean view|θεα.{0,20}θαλασσ|θαλασσ.{0,20}θεα)/i.test(text),POOL:/(?:\bpool\b|πισιν)/i.test(text),PARKING:/(?:\bparking\b|παρκιν)/i.test(text),EV_CHARGING:/(?:(?:ev|electric).{0,20}(?:charg|φορτι)|φορτιστ.{0,20}(?:ηλεκτρ|ev))/i.test(text),BREAKFAST:/(?:breakfast|πρωιν)/i.test(text),PET_FRIENDLY:/(?:pet[ -]?friendly|pet allowed|κατοικιδ)/i.test(text),FAMILY_ROOM:/(?:family rooms?|οικογενειακ.{0,20}δωματι)/i.test(text),ADULTS_ONLY:/(?:adults?[ -]?only|μονο.{0,15}ενηλικ)/i.test(text)};
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
 const url=new URL(req.url),start=(url.searchParams.get("start_date")||"").trim(),end=(url.searchParams.get("end_date")||"").trim(),perDestination=Math.max(1,Math.min(60,Number(url.searchParams.get("per_destination")||40)));
 if(!iso.test(start)||!iso.test(end)||Date.parse(end)<=Date.parse(start))return json({error:"Valid date range required"},400);
 const response=await fetch(`${base}/rest/v1/rpc/get_global_stays_v21`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({p_start_date:start,p_end_date:end,p_per_destination:perDestination})});
 if(!response.ok)return json({error:"Global stay retrieval unavailable"},502);
 const rows=await response.json() as Array<Record<string,unknown>>,features=rows.map(row=>{const raw=row.raw&&typeof row.raw==="object"&&!Array.isArray(row.raw)?row.raw as Record<string,unknown>:{},propertyName=clean(row.property_name),text=norm([propertyName,clean(row.description),clean(row.city),clean(row.address),clean(raw.details),clean(raw.product_name),clean(raw.extra_title),clean(raw.type)].filter(Boolean).join(" ")),starMatch=propertyName.match(/(?:^|\s)([1-5])\s*\*/),price=Number(row.price);return{destination_slug:String(row.destination_slug??""),distance_km:Number.isFinite(Number(row.distance_km))?Number(row.distance_km):null,availability_truth:row.in_stock===true?"CONFIRMED_ACTIVE":"VALID_WINDOW_STOCK_UNKNOWN",semantic_vector:parseVector(row.semantic_vector),semantic_confidence:Number.isFinite(Number(row.semantic_confidence))?Number(row.semantic_confidence):null,star_level:starMatch?Number(starMatch[1]):null,value_signal:Number.isFinite(price)?Math.max(42,Math.min(90,92-price/3)):58,style_hints:{boutique:/boutique|design|concept/i.test(text),resort:/resort|all inclusive|spa/i.test(text),luxury:/luxury|palace|premium/i.test(text)},constraint_evidence:evidence(text)};}).filter(row=>row.destination_slug);
 return json({version:21,source:"safe-derived-global-stay-fit",startDate:start,endDate:end,count:features.length,stays:features});
});
