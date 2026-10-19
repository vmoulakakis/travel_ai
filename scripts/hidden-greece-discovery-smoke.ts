import assert from "node:assert/strict";
import {
  kmStraightLine,rankHiddenPlaces,rankAffiliateStays,validateOwnerAffiliate,
  type HiddenPlaceRow,type StayOfferRow,type ApprovedCommerce
} from "../lib/hidden-greece/discovery";

const NOW=new Date("2026-10-19T12:00:00Z");
const GOV:ApprovedCommerce={
  enabled:true,approvedSite:true,approvedPrograms:new Set(["177","205"])
};
const url="https://go.linkwi.se/z/177-0/CD104/?lnkurl=https%3A%2F%2Fexample.com%2Foffer";
assert(validateOwnerAffiliate(url,"177",GOV));
assert(!validateOwnerAffiliate(url,"999",GOV),"wrong program may not pass");
assert(!validateOwnerAffiliate(url.replace("/CD104/","/OTHER/"),"177",GOV),"never send non-owner link");
assert(!validateOwnerAffiliate(url.replace("https://go.linkwi.se","http://go.linkwi.se"),"177",GOV),"https only");
assert(!validateOwnerAffiliate(url.replace("go.linkwi.se","evil-linkwi.example"),"177",GOV),"strict host");
assert(!validateOwnerAffiliate(url,"177",{...GOV,approvedSite:false}),"site approval must be explicit");
assert(!validateOwnerAffiliate(url,"177",{...GOV,enabled:false}),"default cannot leak affiliate link");

const place:HiddenPlaceRow={
  id:"example-waterfall",name_el:"Δοκιμαστικός καταρράκτης",region_el:"Ήπειρος",
  latitude:39.5,longitude:21.2,kind:"waterfall",seasons:["autumn","spring"],
  moods:["nature","quiet"],activities:["hiking"],hook_el:"Ορεινή φύση",
  access_el:"Ελέγξτε τις τοπικές συνθήκες πριν τη διαδρομή",
  source_url:"https://www.visitgreece.gr/example",source_label:"Visit Greece",
  verification_status:"verified",last_verified_at:"2026-10-01T12:00:00Z"
};
const seeded:HiddenPlaceRow={...place,id:"seed",verification_status:"seeded",source_url:null};
const scores=rankHiddenPlaces([seeded,place],{season:"autumn",mood:"nature",publishedOnly:true});
assert.equal(scores.length,1,"not-reviewed seeds must not be published");
assert.equal(scores[0].id,place.id);
assert(scores[0].discoveryFitScore>75);
assert.equal(rankHiddenPlaces([place],{placeId:"other"}).length,0);
assert.equal(rankHiddenPlaces([{...place,latitude:88}],{}).length,0);

const hotel={id:"property-1",property_name:"Ξενώνας των Βουνών",
  address:"Ενδεικτικός δρόμος, Ήπειρος",location_label:"Ήπειρος",
  latitude:39.51,longitude:21.21,hero_image_url:null};
const offer:StayOfferRow={
  source_product_id:"test-1",place_id:"property-1",
  property_name:"Ξενώνας των Βουνών ✦ 3 Ημέρες (2 Διανυκτερεύσεις) ✦ 2 άτομα",
  program_id:"177",tracking_url:url,
  image_url:"https://example.org/hotel.jpg",thumb_url:null,
  in_stock:null,availability:null,
  valid_from:"2026-10-01T00:00:00Z",valid_to:"2026-11-10T00:00:00Z",
  observed_at:"2026-10-19T01:00:00Z",price:188,currency:"EUR",stay_places:hotel
};
const good=rankAffiliateStays(place,[offer],GOV,{now:NOW,nights:2,maxKm:60});
assert.equal(good.length,1);
assert.equal(good[0].bookingStatus,"availability-not-confirmed");
assert.equal(good[0].priceSemantics,"feed-observed-unknown-unit");
assert(good[0].distanceKmStraightLine<3);
assert.equal(good[0].affiliateUrl,url);
assert.equal(rankAffiliateStays(place,[offer],GOV,{now:NOW,nights:1}).length,0,"mismatched fixed-night deal");
const singleOffer={...offer,property_name:"Ξενώνας Βουνού ✦ 2 Ημέρες (1 Διανυκτέρευση) ✦ έως 31/12/2027"};
assert.equal(rankAffiliateStays(place,[singleOffer],GOV,{now:NOW,nights:1}).length,1,"singular 1 night recognized");
assert.equal(rankAffiliateStays(place,[singleOffer],GOV,{now:NOW,nights:2}).length,0,"singular 1 night must not appear as 2 nights");
const nextYearDeal={...singleOffer,property_name:"Ξενώνας Βουνού ✦ 2 Ημέρες (1 Διανυκτέρευση) ✦ 15/04/2027 έως 16/10/2027"};
assert.equal(rankAffiliateStays(place,[nextYearDeal],GOV,{now:NOW,nights:1,travelStartDate:"2026-10-26",travelEndDate:"2026-10-27"}).length,0,"future summer 2027 deal does not match 2026 trip");
assert.equal(rankAffiliateStays(place,[nextYearDeal],GOV,{now:NOW,nights:1,travelStartDate:"2027-05-07",travelEndDate:"2027-05-08"}).length,1,"deal within explicit travel window may be listed with unconfirmed vacancy");
assert.equal(rankAffiliateStays(place,[singleOffer],GOV,{now:NOW,nights:1,travelStartDate:"2028-01-05",travelEndDate:"2028-01-06"}).length,0,"single supplier latest travel boundary");

assert.equal(rankAffiliateStays(place,[offer],{...GOV,enabled:false},{now:NOW}).length,0,"no unapproved link");
assert.equal(rankAffiliateStays(place,[{...offer,valid_to:"2026-10-18T00:00:00Z"}],GOV,{now:NOW}).length,0,"expired");
assert.equal(rankAffiliateStays(place,[{...offer,observed_at:"2026-09-01T00:00:00Z"}],GOV,{now:NOW}).length,0,"stale feed");
assert.equal(rankAffiliateStays(place,[{...offer,in_stock:false}],GOV,{now:NOW}).length,0,"out of stock");
assert.equal(rankAffiliateStays(place,[offer,{...offer,source_product_id:"test-2"}],GOV,{now:NOW}).length,1,"dedupe variant");
assert.equal(rankAffiliateStays(place,[{...offer,stay_places:{...hotel,latitude:42,longitude:24}}],GOV,{now:NOW}).length,0,"distance bounds");
assert(kmStraightLine(39.5,21.2,39.5,21.2)<.001);
console.log("HIDDEN_GREECE_DISCOVERY_SMOKE_OK affiliate=go.linkwi.se/CD104 source=verified geo=haversine availability=unconfirmed");
