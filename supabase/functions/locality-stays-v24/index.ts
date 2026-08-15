import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const iso=/^\d{4}-\d{2}-\d{2}$/,locality=/^[0-9a-f]{32}$/i;
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),secret=Deno.env.get("SUPABASE_INGEST_SECRET");
 if(!base||!key||!secret)return json({error:"Runtime credentials missing"},500);
 if((req.headers.get("x-app-secret")||"")!==secret)return json({error:"Unauthorized"},401);
 const u=new URL(req.url),localityId=(u.searchParams.get("locality_id")||"").trim(),start=(u.searchParams.get("start_date")||"").trim(),end=(u.searchParams.get("end_date")||"").trim(),limit=Math.max(1,Math.min(40,Number(u.searchParams.get("limit")||30)));
 if(!locality.test(localityId)||!iso.test(start)||!iso.test(end)||Date.parse(end)<=Date.parse(start))return json({error:"Valid locality and dates required"},400);
 const r=await fetch(`${base}/rest/v1/rpc/get_locality_stays_v23`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({p_locality_id:localityId,p_start_date:start,p_end_date:end,p_limit:limit})});
 if(!r.ok)return json({error:"Exact locality stay lookup unavailable"},502);
 const offers=await r.json();return json({release:"V24",version:24,localityId,startDate:start,endDate:end,offers});
});
