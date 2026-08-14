import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
 const u=new URL(req.url),slug=(u.searchParams.get("slug")||"").trim(),start=(u.searchParams.get("start_date")||"").trim(),end=(u.searchParams.get("end_date")||"").trim(),limit=Math.max(1,Math.min(40,Number(u.searchParams.get("limit")||18)));
 if(!/^[a-z0-9-]{2,80}$/.test(slug)||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||Date.parse(end)<=Date.parse(start))return json({error:"Valid destination and dates required"},400);
 const r=await fetch(`${base}/rest/v1/rpc/get_destination_stays_v8`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({p_slug:slug,p_start_date:start,p_end_date:end,p_limit:limit})});if(!r.ok)return json({error:"Stay lookup unavailable",detail:await r.text()},502);
 return json({version:9,slug,startDate:start,endDate:end,offers:await r.json()});
});
