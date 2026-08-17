import { NextResponse } from "next/server";
import { loadStayProductMapV32 } from "@/lib/data/stay-product-map-v32";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request){
 try{
  const url=new URL(request.url),raw=Number(url.searchParams.get("limit")||220),limit=Number.isFinite(raw)?Math.max(20,Math.min(300,Math.round(raw))):220,payload=await loadStayProductMapV32(limit);
  return NextResponse.json(payload,{headers:{"cache-control":"public, max-age=120, s-maxage=600, stale-while-revalidate=1800","x-content-type-options":"nosniff","x-travel-product-map":"v32-real-stay-products"}});
 }catch(error){return NextResponse.json({version:32,error:"Stay product map is temporarily unavailable",detail:process.env.NODE_ENV==="development"&&error instanceof Error?error.message:undefined},{status:503,headers:{"cache-control":"no-store"}})}
}
