import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type TruthPayload={activeGreekDestinations?:number;stayPlaces?:number;activeStayLocalities?:number;eligibleStayOffers?:number;confirmedStockOffers?:number;unknownStockOffers?:number;verifiedEvidenceRows?:number;verifiedEvidenceDestinations?:number;routeEvidenceRows?:number;travelEvidenceRows?:number;checkedAt?:string};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","access-control-allow-origin":"*"}});
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return json({error:"Runtime credentials missing"},500);
 const response=await fetch(`${base}/rest/v1/rpc/get_production_truth_v20`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},body:"{}"});if(!response.ok)return json({error:"Production truth unavailable"},502);
 const truth=await response.json() as TruthPayload,destinations=Math.max(0,Number(truth.activeGreekDestinations)||0),covered=Math.max(0,Number(truth.verifiedEvidenceDestinations)||0),evidenceCoveragePercent=destinations?Number(((covered/destinations)*100).toFixed(2)):0,unknownStockOffers=Math.max(0,Number(truth.unknownStockOffers)||0),confirmedStockOffers=Math.max(0,Number(truth.confirmedStockOffers)||0);
 return json({version:20,release:"V20",source:"production-truth-v20",checkedAt:truth.checkedAt??new Date().toISOString(),evidenceCoveragePercent,availabilitySemantics:unknownStockOffers>0?"TRI_STATE_STOCK_TRUTH":"EXPLICIT_STOCK_TRUTH",evidenceDepth:evidenceCoveragePercent>=80?"BROAD":evidenceCoveragePercent>=30?"PARTIAL":"LIMITED",truth:{...truth,confirmedStockOffers,unknownStockOffers}});
});
