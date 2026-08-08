import { NextResponse } from "next/server";
import { loadFeaturedAffiliateDestinations } from "@/lib/data/affiliate-universe";
import { findWikimediaDestinationPhoto } from "@/lib/data/wikimedia-media";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    const base=await loadFeaturedAffiliateDestinations(5);
    const enriched=await Promise.all(base.map(async d=>{
      const photo=await findWikimediaDestinationPhoto(d.locationLabel,"el");
      return{...d,imageUrl:photo?.url??d.imageUrl,imageSource:photo?"wikimedia":"linkwise",imageAttribution:photo?.attribution??"Linkwise merchant feed"};
    }));
    return NextResponse.json({source:"supabase+wikimedia",destinations:enriched},{headers:{"cache-control":"public, s-maxage=21600, stale-while-revalidate=604800"}});
  }catch{return NextResponse.json({source:"linkwise-json-only",destinations:[]},{status:200,headers:{"cache-control":"public, s-maxage=120"}})}
}
