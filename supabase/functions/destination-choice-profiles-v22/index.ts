import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Row={destination_slug?:string;semantic_vector?:string;profile_confidence?:number;source_property_count?:number};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=300, s-maxage=1800, stale-while-revalidate=7200","x-content-type-options":"nosniff","access-control-allow-origin":"*"}});
const vector=(value:unknown)=>typeof value==="string"?value.replace(/^\[/,"").replace(/\]$/,"").split(",").map(Number).filter(Number.isFinite).slice(0,24):[];

Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!base||!key)return json({error:"Runtime credentials missing"},500);
 const response=await fetch(`${base}/rest/v1/rpc/get_destination_choice_profiles_v22`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:"{}"});
 if(!response.ok)return json({error:"Choice profiles unavailable"},502);
 const rows=await response.json() as Row[],profiles=rows.map(row=>({slug:String(row.destination_slug??"").trim(),vector:vector(row.semantic_vector),confidence:Number.isFinite(Number(row.profile_confidence))?Number(row.profile_confidence):null})).filter(row=>row.slug&&row.vector.length===24);
 return json({version:22,source:"canonical-feed-derived-choice-profiles",count:profiles.length,profiles});
});
