import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const json=(body:unknown,status=200,cache="no-store")=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":cache,"x-content-type-options":"nosniff"}});
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
 const r=await fetch(`${base}/rest/v1/rpc/get_destination_catalog_v8`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:"{}"});if(!r.ok)return json({error:"Catalog unavailable",detail:await r.text()},502);
 return json({version:9,destinations:await r.json()},200,"public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
});
