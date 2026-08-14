import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type CityRow={city:string;property_count:number;offer_count:number;min_price:number|null;currency:string|null;freshest_offer_at:string|null};
const json=(body:unknown,status=200,cache="public, max-age=180, s-maxage=900, stale-while-revalidate=3600")=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":cache,"x-content-type-options":"nosniff","access-control-allow-origin":"*"}});

Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json({error:"Method not allowed"},405,"no-store");
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!base||!key)return json({error:"Runtime credentials missing"},500,"no-store");
 const url=new URL(req.url),limit=Math.max(1,Math.min(300,Number(url.searchParams.get("limit")||180)));
 const response=await fetch(`${base}/rest/v1/rpc/get_active_stay_cities_v15`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({p_limit:limit})});
 if(!response.ok)return json({error:"Stay city inventory unavailable"},502,"no-store");
 const rows=await response.json() as CityRow[];
 const cities=rows.map(row=>({value:row.city,label:row.city,propertyCount:Number(row.property_count)||0,offerCount:Number(row.offer_count)||0,minPrice:row.min_price==null?null:Number(row.min_price),currency:row.currency??null,freshestOfferAt:row.freshest_offer_at??null})).filter(row=>row.value&&row.propertyCount>0&&row.offerCount>0);
 return json({version:15,source:"active-stay-inventory",count:cities.length,cities});
});
