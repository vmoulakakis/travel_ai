import { NextResponse } from "next/server";
import {
  rankAffiliateStays,rankHiddenPlaces,
  type HiddenPlaceRow,type StayOfferRow,type ApprovedCommerce
} from "@/lib/hidden-greece/discovery";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const BASE=()=>process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL??"";
const KEY=()=>process.env.SUPABASE_SERVICE_ROLE_KEY??"";
const emptyHeaders={"cache-control":"private, no-store","x-content-type-options":"nosniff"};

function governance():ApprovedCommerce {
  // Partner/site/tracking approval is distinct from a valid tracking URL.
  // Explicit opt-in only; in an unconfigured deployment no affiliate links leak.
  const approvedPrograms=(process.env.HIDDEN_GREECE_AFFILIATE_APPROVED_PROGRAMS??"")
    .split(",").map(x=>x.trim()).filter(x=>/^\d+$/.test(x));
  return {
    enabled:process.env.HIDDEN_GREECE_AFFILIATE_OUTBOUND_ENABLED==="true",
    approvedSite:process.env.HIDDEN_GREECE_AFFILIATE_SITE_APPROVED==="true",
    approvedPrograms:new Set(approvedPrograms)
  };
}
async function rest<T>(path:string,params:Record<string,string|string[]>):Promise<T> {
  const base=BASE(),key=KEY();
  if(!base||!key)throw new Error("missing_database_configuration");
  const url=new URL(`/rest/v1/${path}`,base);
  for(const [k,v] of Object.entries(params)) { for(const value of Array.isArray(v)?v:[v])url.searchParams.append(k,value); }
  const res=await fetch(url,{cache:"no-store",headers:{
    apikey:key,Authorization:`Bearer ${key}`,Accept:"application/json"
  },signal:AbortSignal.timeout(9000)});
  if(!res.ok)throw new Error(`database_query_failed_${res.status}`);
  return await res.json() as T;
}
const iso=(v:string|null)=>Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(new Date(v+"T00:00:00Z").getTime()));
export async function GET(request:Request) {
  try {
    const input=new URL(request.url).searchParams;
    const placeId=input.get("id");
    if(placeId&&!/^[a-z0-9-]{2,90}$/.test(placeId))
      return NextResponse.json({ok:false,error:"invalid_place_id"},{status:400,headers:emptyHeaders});
    const season=input.get("season")??"";
    if(season&&!["winter","spring","summer","autumn","christmas","new-year","easter"].includes(season))
      return NextResponse.json({ok:false,error:"invalid_season"},{status:400,headers:emptyHeaders});
    const mood=input.get("mood")?.slice(0,35)??"";
    const start=input.get("start"),end=input.get("end");
    if((start||end)&&(!iso(start)||!iso(end)))
      return NextResponse.json({ok:false,error:"invalid_dates"},{status:400,headers:emptyHeaders});
    const requestedNights=input.has("nights")?Number(input.get("nights")):null;
    if(requestedNights!==null&&(!Number.isInteger(requestedNights)||requestedNights<1||requestedNights>7))
      return NextResponse.json({ok:false,error:"nights_must_be_1_to_7"},{status:400,headers:emptyHeaders});
    const actualNights=start&&end?
      Math.round((new Date(end+"T00:00:00Z").getTime()-new Date(start+"T00:00:00Z").getTime())/86400000):null;
    if(actualNights!==null&&(actualNights<1||actualNights>7||requestedNights!==null&&requestedNights!==actualNights))
      return NextResponse.json({ok:false,error:"date_nights_mismatch"},{status:400,headers:emptyHeaders});
    const nights=actualNights??requestedNights??2;
    const requestedLimit=Number(input.get("limit")??"5");
    const limit=Number.isFinite(requestedLimit)?Math.max(1,Math.min(placeId?1:8,Math.round(requestedLimit))):5;
    const rows=await rest<HiddenPlaceRow[]>("greece_unseen_places_v1",{
      select:"id,name_el,region_el,latitude,longitude,kind,seasons,moods,activities,hook_el,access_el,source_url,source_label,verification_status,last_verified_at",
      ...(placeId?{id:`eq.${placeId}`}:{}),
      verification_status:"eq.verified",
      limit:"100"
    });
    const cases=rankHiddenPlaces(rows,{season,mood,nights,placeId:placeId??undefined,publishedOnly:true}).slice(0,limit);
    const gate=governance();
    const enriched=await Promise.all(cases.map(async place=>{
      // Stays are retrieved only *after* place ranking, preserving independence
      // from affiliate supply, price, feed popularity or merchant commissions.
      if(!gate.enabled||!gate.approvedSite||!gate.approvedPrograms.size)
        return {place,stays:[],reason:"affiliate_approval_required"};
      const lat=place.latitude!,lon=place.longitude!;
      const box=.85; // broad 90 km bbox; fine precision filtering uses haversine below
      const offers=await rest<StayOfferRow[]>("stay_offers",{
        select:"source_product_id,place_id,property_name,program_id,tracking_url,image_url,thumb_url,in_stock,availability,valid_from,valid_to,observed_at,price,currency,stay_places!inner(id,property_name,address,location_label,latitude,longitude,hero_image_url)",
        "stay_places.latitude":[`gte.${(lat-box).toFixed(5)}`,`lte.${(lat+box).toFixed(5)}`],
        "stay_places.longitude":[`gte.${(lon-box).toFixed(5)}`,`lte.${(lon+box).toFixed(5)}`],
        tracking_url:"not.is.null",
        limit:"700"
      });
      const stays=rankAffiliateStays(place,offers,gate,{nights,maxKm:60,limit:3});
      return {place,stays,reason:stays.length?"affiliate_candidates_not_live_availability":"no_approved_nearby_stays"};
    }));
    return NextResponse.json({
      ok:true,version:1,product:"hidden-greece",generatedAt:new Date().toISOString(),
      query:{season:season||null,mood:mood||null,nights,start,end},
      count:enriched.length,cases:enriched,
      methodology:{
        placeRank:"source-and-trip-fit-not-demand",
        novelty:"not-yet-measured",
        neuralReranking:"not-yet-enabled",
        stayRank:"geo-distance-plus-feed-metadata-not-review-rating",
        stayDistance:"straight-line-km-not-road-distance",
        accommodationAvailability:"not-confirmed",
        observedFeedPrice:"not-a-verified-nightly-or-dated-price",
        affiliateOutbound:gate.enabled&&gate.approvedSite&&gate.approvedPrograms.size>0?"approved-site-and-programs-only":"disabled-until-approval"
      }
    },{headers:emptyHeaders});
  } catch(e) {
    return NextResponse.json({ok:false,error:"hidden_greece_temporarily_unavailable",
      detail:process.env.NODE_ENV==="development"&&e instanceof Error?e.message:undefined
    },{status:503,headers:emptyHeaders});
  }
}
