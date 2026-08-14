import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const iso=/^\d{4}-\d{2}-\d{2}$/;

Deno.serve(async(req:Request)=>{
  if(req.method!=="GET")return json({error:"Method not allowed"},405);
  const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),appSecret=Deno.env.get("SUPABASE_INGEST_SECRET");
  if(!base||!key||!appSecret)return json({error:"Runtime credentials missing"},500);
  if(req.headers.get("x-app-secret")!==appSecret)return json({error:"Unauthorized"},401);

  const url=new URL(req.url),start=(url.searchParams.get("start_date")||"").trim(),end=(url.searchParams.get("end_date")||"").trim(),perDestination=Math.max(1,Math.min(60,Number(url.searchParams.get("per_destination")||40)));
  if(!iso.test(start)||!iso.test(end)||Date.parse(end)<=Date.parse(start))return json({error:"Valid date range required"},400);

  const response=await fetch(`${base}/rest/v1/rpc/get_global_stays_v21`,{
    method:"POST",
    headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},
    body:JSON.stringify({p_start_date:start,p_end_date:end,p_per_destination:perDestination}),
  });
  if(!response.ok)return json({error:"Global stay retrieval unavailable",detail:await response.text()},502);
  const stays=await response.json();
  return json({version:21,source:"canonical-global-stay-retrieval",startDate:start,endDate:end,count:Array.isArray(stays)?stays.length:0,stays});
});
