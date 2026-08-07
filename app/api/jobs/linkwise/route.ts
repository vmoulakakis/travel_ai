import { NextResponse } from "next/server";
import { normalizeLinkwiseProduct } from "@/lib/commerce/linkwise";
import { getSupabaseAdmin } from "@/lib/data/supabase-admin";

export const runtime="nodejs";
export const maxDuration=60;
function authorized(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret)&&request.headers.get("authorization")===`Bearer ${secret}`}
export async function GET(request:Request){
 if(!authorized(request))return NextResponse.json({error:"Unauthorized"},{status:401}); const feedUrl=process.env.LINKWISE_TRAVEL_FEED_URL; const supabase=getSupabaseAdmin(); if(!feedUrl||!supabase)return NextResponse.json({error:"Feed URL or Supabase is not configured"},{status:503});
 const response=await fetch(feedUrl,{cache:"no-store",signal:AbortSignal.timeout(45000)}); if(!response.ok)return NextResponse.json({error:`Feed fetch failed: ${response.status}`},{status:502}); const payload=await response.json() as unknown; const rawItems=Array.isArray(payload)?payload:[]; const normalized=rawItems.map(normalizeLinkwiseProduct).filter((x):x is NonNullable<typeof x>=>Boolean(x)); const relevant=normalized.filter(x=>x.travelRelevant);
 const rows=relevant.slice(0,5000).map(x=>({source_product_id:x.sourceProductId,model_name:x.modelName,name:x.name,description:x.description,source_category:x.sourceCategory,brand:x.brand,tracking_url:x.trackingUrl,image_url:x.imageUrl,in_stock:x.inStock,availability:x.availability,valid_from:x.validFrom,valid_to:x.validTo,on_sale:x.onSale,currency:x.currency,price:x.price,full_price:x.fullPrice,discount:x.discount,demand_proxy:x.demandProxy,size:x.size,colour:x.colour,variations:x.variations,observed_at:x.observedAt}));
 if(rows.length){const result=await supabase.upsert("product_feed_items",rows,"source_product_id");if(!result.ok)return NextResponse.json({error:result.error||"Supabase upsert failed"},{status:500})}
 return NextResponse.json({fetched:rawItems.length,normalized:normalized.length,travelRelevant:relevant.length,stored:rows.length});
}
