import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"public, max-age=30, s-maxage=120","access-control-allow-origin":"*"}});
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,OPTIONS"}});
  if(req.method!=="GET")return json({error:"Method not allowed"},405);
  const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
  const url=new URL(req.url),ids=(url.searchParams.get("ids")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,40),products=(url.searchParams.get("products")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,120),month=Number(url.searchParams.get("month")||0);
  if(!ids.length)return json({error:"ids required"},400);
  const rpc=await fetch(`${base}/rest/v1/rpc/get_semantic_match_data`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({p_destination_ids:ids,p_product_ids:products.length?products:null,p_travel_month:month>=1&&month<=12?month:null})});
  if(!rpc.ok)return json({error:"Semantic data unavailable",detail:await rpc.text()},502);
  return json(await rpc.json());
});
