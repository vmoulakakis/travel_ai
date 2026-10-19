/**
 * Hidden Greece discovery and affiliate trust boundary.
 * Deliberately deterministic until validated semantic embeddings, routes and
 * licensed source data support learned ranking.
 */
export type HiddenPlaceRow = {
  id: string;
  name_el: string;
  region_el: string | null;
  latitude: number | null;
  longitude: number | null;
  kind: string | null;
  seasons: string[] | null;
  moods: string[] | null;
  activities: string[] | null;
  hook_el: string | null;
  access_el: string | null;
  source_url: string | null;
  source_label: string | null;
  verification_status: string | null;
  last_verified_at: string | null;
};
export type StayPlaceRow = {
  id: string;
  property_name: string | null;
  address: string | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  hero_image_url: string | null;
};
export type StayOfferRow = {
  source_product_id: string;
  place_id: string;
  property_name: string | null;
  program_id: string | null;
  tracking_url: string | null;
  image_url: string | null;
  thumb_url: string | null;
  in_stock: boolean | null;
  availability: string | null;
  valid_from: string | null;
  valid_to: string | null;
  observed_at: string | null;
  price: number | null;
  currency: string | null;
  stay_places: StayPlaceRow | null;
};
export type HiddenSearch = {
  season?: string;
  mood?: string;
  nights?: number;
  placeId?: string;
  publishedOnly?: boolean;
};
export type ApprovedCommerce = {
  enabled: boolean;
  approvedPrograms: ReadonlySet<string>;
  approvedSite: boolean;
};
export type HiddenStay = {
  stayId: string;
  propertyName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceKmStraightLine: number;
  proximityLabel: "nearby-by-air" | "regional-base-by-air";
  qualityStatus: "not-independently-verified";
  observedOfferPrice: number | null;
  currency: string | null;
  priceSemantics: "feed-observed-unknown-unit";
  sourceProductId: string;
  imageUrl: string | null;
  bookingStatus: "availability-not-confirmed";
  affiliateUrl: string;
  offerObservedAt: string | null;
  offerValidTo: string | null;
  score: number;
};
export type RankedHiddenPlace = HiddenPlaceRow & {
  discoveryFitScore: number;
  verifiedSource: boolean;
  scoreExplanation: string[];
};

const clamp = (n:number, low:number, high:number) => Math.max(low, Math.min(high, n));
const finite = (n:unknown): n is number => typeof n === "number" && Number.isFinite(n);
const coords = (lat:unknown, lon:unknown): lat is number =>
  finite(lat) && finite(lon) && lat >= 34 && lat <= 42.5 &&
  lon >= 19 && lon <= 30;
const rad = (d:number) => d*Math.PI/180;

export function kmStraightLine(aLat:number,aLon:number,bLat:number,bLon:number):number {
  const h = Math.sin(rad(bLat-aLat)/2)**2 +
    Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(rad(bLon-aLon)/2)**2;
  return 6371*2*Math.asin(Math.sqrt(clamp(h,0,1)));
}

export function validateOwnerAffiliate(urlValue:string|null, programId:string|null, governance:ApprovedCommerce):boolean {
  if(!governance.enabled || !governance.approvedSite || !programId ||
    !governance.approvedPrograms.has(programId) || !urlValue) return false;
  try {
    const u=new URL(urlValue);
    return u.protocol==="https:" && u.hostname==="go.linkwi.se" &&
      /^\/z\/[0-9]+-[0-9]+\/CD104\/$/.test(u.pathname) &&
      u.pathname.startsWith(`/z/${programId}-`) &&
      u.searchParams.has("lnkurl");
  } catch { return false; }
}

export function rankHiddenPlaces(places:readonly HiddenPlaceRow[], search:HiddenSearch):RankedHiddenPlace[] {
  return places.filter(p=>
    coords(p.latitude,p.longitude) &&
    (search.publishedOnly === false || p.verification_status==="verified") &&
    (!search.placeId || p.id===search.placeId)
  ).map(p=>{
    const hasSource = p.verification_status === "verified" && Boolean(p.source_url?.startsWith("https://"));
    const seasonMatch = Boolean(search.season && (p.seasons ?? []).includes(search.season));
    const moodMatch = Boolean(search.mood && (p.moods ?? []).includes(search.mood));
    const actMatch = Boolean(search.mood && (p.activities ?? []).includes(search.mood));
    const score =
      (hasSource ? 35 : 5) +
      (search.season ? (seasonMatch ? 25 : 0) : 12) +
      (search.mood ? (moodMatch || actMatch ? 25 : 0) : 12) +
      (p.access_el ? 8 : 0) + (p.hook_el ? 7 : 0) +
      (p.last_verified_at ? 5 : 0) + (p.kind ? 3 : 0);
    const reasons=[
      hasSource ? "Έχει καταγεγραμμένη πηγή και verified status στη βάση" : "Χρειάζεται ανεξάρτητη επιβεβαίωση πηγής",
      seasonMatch ? "Η εποχή ταιριάζει στο υπάρχον προφίλ" : "Ελέγχουμε την καταλληλότητα εποχής",
      moodMatch || actMatch ? "Ταιριάζει στο ζητούμενο ταξιδιωτικό ύφος" : "Δεν έχει τεκμηριωθεί ειδική αντιστοίχιση ύφους",
    ];
    return {...p,discoveryFitScore:clamp(score,0,100),verifiedSource:hasSource,scoreExplanation:reasons};
  }).sort((a,b)=>b.discoveryFitScore-a.discoveryFitScore || a.id.localeCompare(b.id));
}

/** Source feed prices have no guaranteed unit; they are NOT per-night rates. */
function validObservedOffer(offer:StayOfferRow, now:Date):boolean {
  if(offer.in_stock===false || !offer.source_product_id || !offer.stay_places) return false;
  const nowMillis=now.getTime();
  if(offer.valid_from && new Date(offer.valid_from).getTime()>nowMillis)return false;
  if(offer.valid_to && new Date(offer.valid_to).getTime()<nowMillis)return false;
  if(offer.observed_at && nowMillis-new Date(offer.observed_at).getTime()>21*86400000)return false;
  return true;
}
function offerNights(name:string):number|null {
  const match=name.match(/\(\s*(\d+)\s*Διανυκτερεύσ(?:εις|η)\s*\)/iu);
  return match ? Number(match[1]) : null;
}
function shortPropertyName(name:string) {
  // Remove deal copy & HTML markup from scraped product name, not the property identity.
  return name.split(" ✦ ")[0].replace(/<[^>]*>/g,"").slice(0,140).trim();
}
function similarityDedupeKey(name:string,lat:number,lon:number) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9α-ω]+/g," ").trim()+"|"+
    lat.toFixed(2)+"|"+lon.toFixed(2);
}
export function rankAffiliateStays(
  place: Pick<HiddenPlaceRow,"latitude"|"longitude">,
  offers:readonly StayOfferRow[],
  governance:ApprovedCommerce,
  opts:{nights?:number;maxKm?:number;now?:Date;limit?:number}={}
):HiddenStay[] {
  if(!coords(place.latitude,place.longitude))return [];
  const now=opts.now ?? new Date();
  const maxKm=clamp(opts.maxKm??60,5,90);
  const maxResults=clamp(opts.limit??3,1,6);
  const candidates:HiddenStay[]=[];
  for(const o of offers) {
    const s=o.stay_places;
    if(!s || !coords(s.latitude,s.longitude))continue;
    if(!validateOwnerAffiliate(o.tracking_url,o.program_id,governance) ||
      !validObservedOffer(o,now))continue;
    const name=shortPropertyName(s.property_name || o.property_name || "");
    if(!name)continue;
    // A deal explicitly advertised as N nights must not be relabelled for M nights.
    const packageNights=offerNights(o.property_name||"");
    if(opts.nights && packageNights!==null && opts.nights!==packageNights)continue;
    const distance=kmStraightLine(place.latitude!,place.longitude!,s.latitude,s.longitude);
    if(distance>maxKm)continue;
    // We have no independent guest rating or reliable road route.
    // Honest ranking rewards proximity and product metadata completeness only.
    const score=clamp(Math.round(90-1.1*distance+(s.address?7:0)+(o.image_url||o.thumb_url?3:0)),0,100);
    candidates.push({
      stayId:s.id,propertyName:name,address:s.address,latitude:s.latitude,
      longitude:s.longitude,distanceKmStraightLine:Math.round(distance*10)/10,
      proximityLabel:distance<=25?"nearby-by-air":"regional-base-by-air",
      qualityStatus:"not-independently-verified",
      observedOfferPrice:finite(o.price)&&o.price>0?o.price:null,
      currency:o.currency,
      priceSemantics:"feed-observed-unknown-unit",
      sourceProductId:o.source_product_id,
      imageUrl:o.image_url || o.thumb_url || s.hero_image_url,
      bookingStatus:"availability-not-confirmed",
      affiliateUrl:o.tracking_url!,
      offerObservedAt:o.observed_at,offerValidTo:o.valid_to,score
    });
  }
  candidates.sort((a,b)=>b.score-a.score || a.distanceKmStraightLine-b.distanceKmStraightLine);
  const seen=new Set<string>();
  return candidates.filter(s=>{
    const k=similarityDedupeKey(s.propertyName,s.latitude,s.longitude);
    if(seen.has(k))return false;
    seen.add(k);return true;
  }).slice(0,maxResults);
}
