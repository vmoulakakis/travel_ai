import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const allowed=new Set(["recommendation_impression","destination_selected","offer_view","offer_unlock","outbound_click","conversion","approved_conversion"]);
const rewards:Record<string,number>={recommendation_impression:.05,destination_selected:.6,offer_view:.3,offer_unlock:.8,outbound_click:1.5,conversion:3,approved_conversion:5};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function sha256(v:string){const data=new TextEncoder().encode(v),hash=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join("")}
const vector=(v:unknown,n:number)=>Array.isArray(v)?v.map(Number).filter(Number.isFinite).slice(0,n):[];
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
  const secret=req.headers.get("x-match-secret")||"";if(!secret)return json({error:"Unauthorized"},401);
  const s=await fetch(`${base}/rest/v1/app_secrets?name=eq.match_api_v9&select=sha256`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});const rows=await s.json().catch(()=>[]) as Array<{sha256?:string}>;if(!rows[0]?.sha256||await sha256(secret)!==rows[0].sha256)return json({error:"Unauthorized"},401);
  const b=await req.json().catch(()=>null) as Record<string,unknown>|null;if(!b)return json({error:"Invalid JSON"},400);
  const sessionId=typeof b.sessionId==="string"?b.sessionId:"",eventName=typeof b.eventName==="string"?b.eventName:"";if(!uuid.test(sessionId)||!allowed.has(eventName))return json({error:"Invalid event"},400);
  const travelMonth=Number(b.travelMonth),destinationId=typeof b.destinationId==="string"?b.destinationId:null,sourceProductId=typeof b.sourceProductId==="string"?b.sourceProductId:null;
  let resolvedMonth=travelMonth>=1&&travelMonth<=12?travelMonth:null;
  if(eventName==="recommendation_impression"&&Array.isArray(b.recommendations)){
    const fv=vector(b.featureVector,24);if(fv.length!==24)return json({error:"Invalid feature vector"},400);
    const constraints=b.constraints&&typeof b.constraints==="object"?b.constraints:{};
    const session=await fetch(`${base}/rest/v1/match_sessions?on_conflict=id`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json",Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({id:sessionId,feature_vector:`[${fv.join(",")}]`,constraints,model_version:typeof b.modelVersion==="string"?b.modelVersion:"semantic-neural-v1"})});if(!session.ok)return json({error:"Session write failed",detail:await session.text()},502);
    const impressions=(b.recommendations as Array<Record<string,unknown>>).slice(0,6).map(r=>{const pf=vector(r.pairFeatures,12);return pf.length===12?{session_id:sessionId,destination_id:typeof r.destinationId==="string"?r.destinationId:null,source_product_id:typeof r.sourceProductId==="string"?r.sourceProductId:null,event_name:"recommendation_impression",reward:rewards.recommendation_impression,travel_month:resolvedMonth,pair_features:`[${pf.join(",")}]`}:null}).filter(Boolean);
    if(!impressions.length)return json({error:"No valid impressions"},400);
    const existing=await fetch(`${base}/rest/v1/match_outcomes?session_id=eq.${encodeURIComponent(sessionId)}&event_name=eq.recommendation_impression&select=id&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});const already=await existing.json().catch(()=>[]) as Array<{id?:number}>;if(already.length)return json({ok:true,deduped:true,impressions:0});
    const out=await fetch(`${base}/rest/v1/match_outcomes`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(impressions)});if(!out.ok)return json({error:"Impression write failed",detail:await out.text()},502);
    return json({ok:true,impressions:impressions.length});
  }
  if(destinationId){const dupe=await fetch(`${base}/rest/v1/match_outcomes?session_id=eq.${encodeURIComponent(sessionId)}&destination_id=eq.${encodeURIComponent(destinationId)}&event_name=eq.${encodeURIComponent(eventName)}&select=id&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});const dupes=await dupe.json().catch(()=>[]) as Array<{id?:number}>;if(dupes.length)return json({ok:true,deduped:true});}
  let pf=vector(b.pairFeatures,12);
  if(pf.length!==12&&destinationId){const lookup=await fetch(`${base}/rest/v1/match_outcomes?session_id=eq.${encodeURIComponent(sessionId)}&destination_id=eq.${encodeURIComponent(destinationId)}&event_name=eq.recommendation_impression&select=pair_features,travel_month&order=created_at.desc&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});const found=await lookup.json().catch(()=>[]) as Array<{pair_features?:string;travel_month?:number}>;if(typeof found[0]?.pair_features==="string")pf=found[0].pair_features.replace(/^\[/,"").replace(/\]$/,"").split(",").map(Number).filter(Number.isFinite).slice(0,12);if(resolvedMonth==null&&Number(found[0]?.travel_month)>=1&&Number(found[0]?.travel_month)<=12)resolvedMonth=Number(found[0]?.travel_month);}
  if(pf.length!==12)return json({error:"Training features unavailable"},409);
  const out=await fetch(`${base}/rest/v1/match_outcomes`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({session_id:sessionId,destination_id:destinationId,source_product_id:sourceProductId,event_name:eventName,reward:rewards[eventName]??0,travel_month:resolvedMonth,pair_features:`[${pf.join(",")}]`})});if(!out.ok)return json({error:"Outcome write failed",detail:await out.text()},502);
  return json({ok:true});
});
