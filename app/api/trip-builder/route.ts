import { NextResponse } from "next/server";
import { buildTripBuilderV25 } from "@/lib/trip-builder/build-v25";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const slugPattern=/^[a-z0-9-]{2,80}$/i,idPattern=/^[a-zA-Z0-9:_-]{1,180}$/;

export async function POST(request:Request){
 try{const body=await request.json() as Record<string,unknown>,parsed=parseTripRequest(body.trip),slug=String(body.slug??"").trim().toLowerCase(),offerId=String(body.offerId??"").trim();if(!parsed.success||!slugPattern.test(slug)||!idPattern.test(offerId))return NextResponse.json({message:"Invalid Trip Builder request",errors:parsed.success?[]:parsed.errors},{status:400});const plan=await buildTripBuilderV25({trip:parsed.data,slug,offerId});return NextResponse.json(plan,{headers:{"cache-control":"no-store, max-age=0","x-travel-engine":"v25-post-stay-trip-builder"}})}catch(error){return NextResponse.json({message:"The post-stay travel plan could not be verified safely.",detail:process.env.NODE_ENV==="development"&&error instanceof Error?error.message:undefined},{status:503,headers:{"cache-control":"no-store"}})}
}
