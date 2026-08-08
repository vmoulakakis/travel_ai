import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
async function sha256(v:string){const data=new TextEncoder().encode(v),hash=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join("")}
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
 const secret=req.headers.get("x-app-secret")||"";if(!secret)return json({error:"Unauthorized"},401);
 const sr=await fetch(`${base}/rest/v1/app_secrets?name=eq.ingest_api&select=sha256`,{headers:{apikey:key,Authorization:`Bearer ${key}`}}),rows=await sr.json().catch(()=>[]) as Array<{sha256?:string}>;if(!rows[0]?.sha256||await sha256(secret)!==rows[0].sha256)return json({error:"Unauthorized"},401);
 const u=new URL(req.url),slug=(u.searchParams.get("slug")||"").trim(),start=(u.searchParams.get("start_date")||"").trim(),end=(u.searchParams.get("end_date")||"").trim(),limit=Math.max(1,Math.min(30,Number(u.searchParams.get("limit")||18)));
 if(!slug||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))return json({error:"slug/start_date/end_date required"},400);
 const r=await fetch(`${base}/rest/v1/rpc/get_destination_stays_v8`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({p_slug:slug,p_start_date:start,p_end_date:end,p_limit:limit})});if(!r.ok)return json({error:"Stay lookup unavailable",detail:await r.text()},502);
 return json({version:8,slug,startDate:start,endDate:end,offers:await r.json()});
});
