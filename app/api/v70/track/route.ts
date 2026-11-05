import {markTrackingClickV70,resolveTrackingActionV70} from "@/lib/ai/stay-commerce-v70";

export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){
 const code=(new URL(request.url).searchParams.get("code")??"").trim();if(!/^[a-z0-9]{12,40}$/i.test(code))return Response.json({error:"Invalid tracking action"},{status:400});
 const action=await resolveTrackingActionV70(code).catch(()=>null);if(!action)return Response.json({error:"Tracking action not found"},{status:404});
 let target:URL;try{target=new URL(action.tracking_url)}catch{return Response.json({error:"Invalid provider URL"},{status:502})}
 const allowed=target.protocol==="https:"&&(target.hostname==="linkwi.se"||target.hostname.endsWith(".linkwi.se"));if(!allowed)return Response.json({error:"Provider URL rejected"},{status:502});
 void markTrackingClickV70(action.id,action.click_count);
 return Response.redirect(target.toString(),302);
}
