import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const json=(body:unknown,status=200,cache="no-store")=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":cache}});
async function sha256(v:string){const data=new TextEncoder().encode(v),hash=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join("")}
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
 const secret=req.headers.get("x-app-secret")||"";if(!secret)return json({error:"Unauthorized"},401);
 const sr=await fetch(`${base}/rest/v1/app_secrets?name=eq.ingest_api&select=sha256`,{headers:{apikey:key,Authorization:`Bearer ${key}`}}),rows=await sr.json().catch(()=>[]) as Array<{sha256?:string}>;if(!rows[0]?.sha256||await sha256(secret)!==rows[0].sha256)return json({error:"Unauthorized"},401);
 const r=await fetch(`${base}/rest/v1/rpc/get_destination_catalog_v8`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:"{}"});if(!r.ok)return json({error:"Catalog unavailable",detail:await r.text()},502);
 return json({version:8,destinations:await r.json()},200,"private, max-age=0");
});
