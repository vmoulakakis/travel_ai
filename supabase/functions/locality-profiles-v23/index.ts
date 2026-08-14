import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const iso=/^\d{4}-\d{2}-\d{2}$/;
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),secret=Deno.env.get("SUPABASE_INGEST_SECRET");
 if(!base||!key||!secret)return json({error:"Runtime credentials missing"},500);
 if((req.headers.get("x-app-secret")||"")!==secret)return json({error:"Unauthorized"},401);
 const url=new URL(req.url),start=(url.searchParams.get("start_date")||"").trim(),end=(url.searchParams.get("end_date")||"").trim();
 if(!iso.test(start)||!iso.test(end)||Date.parse(end)<=Date.parse(start))return json({error:"Valid date range required"},400);
 const response=await fetch(`${base}/rest/v1/rpc/get_locality_profiles_v23`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({p_start_date:start,p_end_date:end})});
 if(!response.ok)return json({error:"Locality retrieval unavailable"},502);
 const rows=await response.json() as Array<Record<string,unknown>>;
 return json({release:"V23",version:23,source:"dated-locality-semantic-profiles",count:rows.length,localities:rows});
});
