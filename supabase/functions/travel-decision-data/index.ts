import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"public, max-age=60, s-maxage=300","access-control-allow-origin":"*"}});

Deno.serve(async (req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,OPTIONS"}});
  if(req.method!=="GET") return json({error:"Method not allowed"},405);
  const base=Deno.env.get("SUPABASE_URL"); const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!base||!key) return json({error:"Runtime credentials missing"},500);
  const headers={apikey:key,Authorization:`Bearer ${key}`};
  const [dest,evidence,routes]=await Promise.all([
    fetch(`${base}/rest/v1/destinations?enabled=eq.true&select=*&order=name.asc`,{headers}),
    fetch(`${base}/rest/v1/travel_evidence?select=destination_id,evidence_type,source_name,source_url,payload,observed_at,valid_until,confidence&order=observed_at.desc&limit=200`,{headers}),
    fetch(`${base}/rest/v1/route_evidence?enabled=eq.true&select=origin,destination_id,mode,operator_name,duration_minutes,seasonal_months,source_url,observed_at,valid_until,confidence&limit=200`,{headers})
  ]);
  if(!dest.ok) return json({error:"Destination store unavailable"},502);
  return json({version:2,generatedAt:new Date().toISOString(),destinations:await dest.json(),evidence:evidence.ok?await evidence.json():[],routes:routes.ok?await routes.json():[]});
});
