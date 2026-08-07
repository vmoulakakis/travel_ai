import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"public, max-age=30, s-maxage=120","access-control-allow-origin":"*"}});

function bounds(raw:string|null){
  const now=new Date();
  if(raw==="flexible"){
    const year=now.getUTCFullYear();
    return{value:"flexible",start:new Date(Date.UTC(year,8,1)).toISOString(),end:new Date(Date.UTC(year,11,0,23,59,59)).toISOString()};
  }
  const fallback=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}`;
  const value=/^\d{4}-\d{2}$/.test(raw??"")?(raw as string):fallback;
  const[year,month]=value.split("-").map(Number);
  return{value,start:new Date(Date.UTC(year,month-1,1)).toISOString(),end:new Date(Date.UTC(year,month,0,23,59,59)).toISOString()};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,OPTIONS"}});
  if(req.method!=="GET")return json({error:"Method not allowed"},405);
  const base=Deno.env.get("SUPABASE_URL");
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!base||!key)return json({error:"Runtime credentials missing"},500);
  const url=new URL(req.url);
  const destinationId=url.searchParams.get("destination_id");
  const range=bounds(url.searchParams.get("month"));
  if(!destinationId)return json({error:"destination_id required"},400);
  const rpc=await fetch(`${base}/rest/v1/rpc/get_affiliate_destination_detail`,{
    method:"POST",
    headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},
    body:JSON.stringify({p_destination_id:destinationId,p_start:range.start,p_end:range.end})
  });
  if(!rpc.ok)return json({error:"Destination detail unavailable",detail:await rpc.text()},502);
  const payload=await rpc.json();
  return json({version:1,source:"linkwise-json-only",range:range.value,generatedAt:new Date().toISOString(),...payload});
});
