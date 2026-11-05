import {NextResponse} from "next/server";
import {runProgressiveFunnelV70} from "@/lib/ai/travel-orchestrator-v70";
import {createFunnelSessionV70,loadFunnelSessionV70,type V70Locale} from "@/lib/ai/travel-intelligence-v70";
import {TRAVEL_PROFILE_COOKIE,travelerProfileKeyFromRequest} from "@/lib/ai/travel-intelligence-v45";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const SESSION_COOKIE="travel_v70_session";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function sessionFromCookie(request:Request){const raw=request.headers.get("cookie")??"";const found=raw.match(/(?:^|;\s*)travel_v70_session=([0-9a-f-]{36})(?:;|$)/i)?.[1]??null;return found&&uuid.test(found)?found:null}

export async function POST(request:Request){
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
 const message=typeof body?.message==="string"?body.message.trim():"";
 const locale:V70Locale=body?.locale==="en"?"en":"el";
 if(!message||message.length>3000)return NextResponse.json({version:70,message:locale==="en"?"Tell me what kind of trip you need.":"Πες μου τι ταξίδι χρειάζεσαι."},{status:400});
 const requested=typeof body?.sessionId==="string"&&uuid.test(body.sessionId)?body.sessionId:sessionFromCookie(request);
 const profileKey=travelerProfileKeyFromRequest(request)??crypto.randomUUID();
 try{
  let session=requested?await loadFunnelSessionV70(requested):null;
  if(session&&session.profile_key&&session.profile_key!==profileKey)return NextResponse.json({version:70,message:"Session not found."},{status:404});
  if(!session)session=await createFunnelSessionV70({profileKey,locale});
  const result=await runProgressiveFunnelV70({session,message});
  const response=NextResponse.json(result,{headers:{"cache-control":"no-store","x-travel-engine":"v70-full-agentic","x-travel-profile-key":profileKey}});
  response.cookies.set(TRAVEL_PROFILE_COOKIE,profileKey,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:15552000});
  response.cookies.set(SESSION_COOKIE,session.id,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:7776000});
  return response;
 }catch(error){
  console.error("V70 funnel failed",error);
  return NextResponse.json({version:70,message:locale==="en"?"I kept the conversation, but the travel reasoning could not finish safely. Try that answer once more.":"Κράτησα το context, αλλά το travel reasoning δεν ολοκληρώθηκε με ασφάλεια. Δώσε ξανά αυτή την απάντηση."},{status:503,headers:{"cache-control":"no-store","x-travel-engine":"v70-full-agentic"}});
 }
}
