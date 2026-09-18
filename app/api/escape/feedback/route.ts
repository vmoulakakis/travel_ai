import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { recordTravelerSignalV45,travelerProfileKeyFromRequest } from "@/lib/ai/travel-intelligence-v45";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slug=/^[a-z0-9-]{2,80}$/i;
const kinds=new Set(["destination","restaurant","nightlife","attraction","stay"]);
const rate=new Map<string,{count:number;until:number}>();
function limited(key:string){const now=Date.now(),r=rate.get(key);if(!r||r.until<now){rate.set(key,{count:1,until:now+15*60_000});return false}r.count++;return r.count>8}
function env(){const base=process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;return base&&key?{base:base.replace(/\/$/,""),key}:null}
function headers(key:string){return{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"}}
function safeText(v:unknown,max:number){return typeof v==="string"?v.trim().slice(0,max):""}
function windowEnd(value:unknown){if(!value||typeof value!=="object"||Array.isArray(value))return null;const row=value as Record<string,unknown>,v=typeof row.end==="string"?row.end:typeof row.endDate==="string"?row.endDate:null;return v&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:null}

export async function POST(request:Request){
 const profileKey=travelerProfileKeyFromRequest(request);
 const cfg=env();if(!cfg)return NextResponse.json({ok:false,error:"feedback_backend_unavailable"},{status:503});
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null,missionId=safeText(body?.missionId,64),destinationSlug=safeText(body?.destinationSlug,80).toLowerCase(),subjectKind=safeText(body?.subjectKind,24),subjectKey=safeText(body?.subjectKey,120),subjectName=safeText(body?.subjectName,160),comment=safeText(body?.comment,800),rating=Number(body?.rating),wouldRecommend=body?.wouldRecommend===true,went=body?.went===true;
 if(!uuid.test(missionId)||!slug.test(destinationSlug)||!kinds.has(subjectKind)||!subjectKey||!subjectName||!went||!Number.isInteger(rating)||rating<1||rating>5)return NextResponse.json({ok:false,error:"invalid_feedback"},{status:400});
 const ip=request.headers.get("x-forwarded-for")?.split(",")[0]??"unknown",fingerprint=createHash("sha256").update(`${ip}|${missionId}`).digest("hex").slice(0,24);if(limited(fingerprint))return NextResponse.json({ok:false,error:"rate_limited"},{status:429});
 const missionUrl=new URL(`${cfg.base}/rest/v1/travel_missions`);missionUrl.searchParams.set("id",`eq.${missionId}`);missionUrl.searchParams.set("select","id,chosen_destination_id,travel_window");missionUrl.searchParams.set("limit","1");const missionResponse=await fetch(missionUrl,{headers:headers(cfg.key),cache:"no-store",signal:AbortSignal.timeout(5000)}).catch(()=>null);if(!missionResponse?.ok)return NextResponse.json({ok:false,error:"mission_lookup_failed"},{status:503});const rows=await missionResponse.json() as Array<{chosen_destination_id?:string|null;travel_window?:unknown}>,mission=rows[0];if(!mission)return NextResponse.json({ok:false,error:"mission_not_found"},{status:404});
 const end=windowEnd(mission.travel_window);if(!end||end>new Date().toISOString().slice(0,10))return NextResponse.json({ok:false,error:"trip_not_completed"},{status:409});if(mission.chosen_destination_id&&mission.chosen_destination_id!==destinationSlug)return NextResponse.json({ok:false,error:"destination_mismatch"},{status:409});
 const insertUrl=`${cfg.base}/rest/v1/travel_escape_feedback?on_conflict=mission_id,subject_kind,subject_key`,payload={mission_id:missionId,destination_slug:destinationSlug,subject_kind:subjectKind,subject_key:subjectKey,subject_name:subjectName,went:true,rating,would_recommend:wouldRecommend,comment:comment||null,visited_on:end};const write=await fetch(insertUrl,{method:"POST",headers:{...headers(cfg.key),Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)}).catch(()=>null);if(!write?.ok)return NextResponse.json({ok:false,error:"feedback_write_failed"},{status:503});if(profileKey){const eventType=rating>=4||wouldRecommend?"positive_feedback":rating<=2&&!wouldRecommend?"negative_feedback":"feedback";await recordTravelerSignalV45({profileKey,missionId,eventType,subjectType:"destination",subjectKey:destinationSlug,value:rating,context:{subjectKind,wouldRecommend}}).catch(()=>null)}return NextResponse.json({ok:true},{headers:{"cache-control":"no-store"}})
}

export async function GET(request:Request){const cfg=env();if(!cfg)return NextResponse.json({ok:true,signal:null});const destinationSlug=(new URL(request.url).searchParams.get("destination")??"").trim().toLowerCase();if(!slug.test(destinationSlug))return NextResponse.json({ok:false,error:"invalid_destination"},{status:400});try{const response=await fetch(`${cfg.base}/rest/v1/rpc/get_ai_guest_signal_v38`,{method:"POST",headers:headers(cfg.key),body:JSON.stringify({p_destination_slug:destinationSlug,p_subject_kind:"destination",p_subject_key:null}),cache:"no-store",signal:AbortSignal.timeout(4500)});if(!response.ok)throw new Error();const rows=await response.json() as unknown[];return NextResponse.json({ok:true,signal:rows[0]??null},{headers:{"cache-control":"public, s-maxage=900"}})}catch{return NextResponse.json({ok:true,signal:null})}}
