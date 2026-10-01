import {NextResponse} from "next/server";
import {curateStaysV70} from "@/lib/ai/travel-stay-v70";
import {loadOwnedSessionV70} from "@/lib/ai/v70-auth";

export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
export async function POST(request:Request){
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null,sessionId=typeof body?.sessionId==="string"?body.sessionId:"",destinationKey=typeof body?.destinationKey==="string"?body.destinationKey.trim():"";
 if(!sessionId||!destinationKey)return NextResponse.json({version:70,error:"sessionId and destinationKey are required"},{status:400});
 const session=await loadOwnedSessionV70(request,sessionId).catch(()=>null);if(!session)return NextResponse.json({version:70,error:"Session not found"},{status:404});
 try{return NextResponse.json(await curateStaysV70({session,destinationKey}),{headers:{"cache-control":"no-store","x-travel-engine":"v70-stay-curator"}})}catch(error){console.error("V70 stay curation failed",error);return NextResponse.json({version:70,error:error instanceof Error?error.message:"Stay curation failed"},{status:409,headers:{"cache-control":"no-store"}})}
}
