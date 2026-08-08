import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"public, max-age=30, s-maxage=120","access-control-allow-origin":"*"}});
const iso=/^\d{4}-\d{2}-\d{2}$/;
function range(url:URL){const rawStart=url.searchParams.get("start_date"),rawEnd=url.searchParams.get("end_date");if(rawStart&&rawEnd&&iso.test(rawStart)&&iso.test(rawEnd)&&Date.parse(rawEnd)>Date.parse(rawStart))return{value:`${rawStart}/${rawEnd}`,start:`${rawStart}T00:00:00.000Z`,end:`${rawEnd}T23:59:59.999Z`};const now=new Date(),start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())),end=new Date(start.getTime()+3*86400000);return{value:`${start.toISOString().slice(0,10)}/${end.toISOString().slice(0,10)}`,start:start.toISOString(),end:end.toISOString()};}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,OPTIONS"}});
  if(req.method!=="GET")return json({error:"Method not allowed"},405);
  const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
  const url=new URL(req.url),destinationId=url.searchParams.get("destination_id"),period=range(url);if(!destinationId)return json({error:"destination_id required"},400);
  const rpc=await fetch(`${base}/rest/v1/rpc/get_affiliate_destination_detail`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({p_destination_id:destinationId,p_start:period.start,p_end:period.end})});
  if(!rpc.ok)return json({error:"Destination detail unavailable",detail:await rpc.text()},502);
  const payload=await rpc.json();
  return json({version:2,source:"linkwise-json-only",range:period.value,generatedAt:new Date().toISOString(),...payload});
});
