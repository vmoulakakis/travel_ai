import { NextResponse } from "next/server";
import { findWikimediaDestinationPhoto } from "@/lib/data/wikimedia-media";

export const runtime="nodejs";
export async function GET(request:Request){const u=new URL(request.url),name=(u.searchParams.get("name")??"").trim(),lang=u.searchParams.get("lang")==="en"?"en":"el";if(name.length<2||name.length>120)return new NextResponse(null,{status:404});const photo=await findWikimediaDestinationPhoto(name,lang).catch(()=>null);if(!photo)return new NextResponse(null,{status:404});const response=NextResponse.redirect(photo.url,307);response.headers.set("cache-control","public, s-maxage=604800, stale-while-revalidate=2592000");return response}
