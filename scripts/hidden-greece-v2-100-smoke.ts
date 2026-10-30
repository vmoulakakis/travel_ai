import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {rankHiddenPlaces,rankAffiliateStays,type HiddenPlaceRow,type StayOfferRow,type ApprovedCommerce} from "../lib/hidden-greece/discovery";
import {orthodoxEaster,upcomingGreekBreaks} from "../lib/hidden-greece/holidays";

const canonical=(p:string)=>readFileSync(p,"utf8");
const p=canonical("app/guides/hidden-greece/hidden-greece-explorer.tsx");
const css=canonical("app/guides/hidden-greece/hidden-greece.module.css");
const detail=canonical("app/guides/hidden-greece/[id]/page.tsx");
const api=canonical("app/api/hidden-greece/discover/route.ts");
const mapSitemap=canonical("app/sitemap.ts");
assert(p.includes("aria-pressed")&&p.includes("aria-label"),"interactive discover controls have accessible names");
assert(p.includes('import("leaflet")')&&p.includes("openstreetmap.org"),"real Leaflet tile map present");
assert(p.includes("Η διαθεσιμότητα")||p.includes("Διαθεσιμότητα άγνωστη"),"unknown vacancy plainly disclosed");
assert(!p.includes("images.unsplash.com")&&!p.includes("pexels.com"),"no fictional destination photography");
assert(p.includes('rel="sponsored noopener noreferrer"'),"affiliate paid outbound labeled sponsored");
assert(css.includes("prefers-reduced-motion")&&css.includes(":focus-visible"),"reduced motion and keyboard focus styles");
assert(detail.includes("generateMetadata")&&detail.includes('notFound()')&&detail.includes("JSON.stringify(schema)"),"seo page respects published source");
assert(mapSitemap.includes("getPublishedMicroplaceSlugs"),"dynamic sitemap includes published microplaces");
assert(api.includes("affiliate_approval_required")&&api.includes("candidateGate"),"candidates are independently discoverable but affiliate handoff gated");

assert.equal(orthodoxEaster(2026).toISOString().slice(0,10),"2026-04-12");
assert.equal(orthodoxEaster(2027).toISOString().slice(0,10),"2027-05-02");
assert.equal(orthodoxEaster(2028).toISOString().slice(0,10),"2028-04-16");
assert.throws(()=>orthodoxEaster(2100),RangeError);
const breaks=upcomingGreekBreaks(new Date(2026,9,30),4);
assert(breaks.length===4&&breaks.every(x=>x.start>="2026-10-30"&&x.nights>=1&&x.nights<=3));
assert(new Set(breaks.map(x=>x.start)).size===breaks.length,"duplicate start date not rendered");
const place:HiddenPlaceRow={
  id:"quality-hidden-falls",name_el:"Δοκιμή",region_el:"Ήπειρος",latitude:39.5,longitude:21.2,
  kind:"waterfall",seasons:["autumn","spring"],moods:["quiet","nature"],
  activities:["hiking"],hook_el:"Νερά και δάσος",access_el:"Απαιτείται έλεγχος",source_url:"https://visitgreece.gr/test",
  source_label:"Επίσημη πηγή",verification_status:"verified",last_verified_at:"2026-10-30T09:00:00Z"
};
const url="https://go.linkwi.se/z/177-0/CD104/?lnkurl=https%3A%2F%2Fexample.org%2Fproperty";
const offer:StayOfferRow={
 source_product_id:"testoffer",place_id:"p1",property_name:"Ξενώνας Φύσης ✦ 2 Ημέρες (1 Διανυκτέρευση)",
 program_id:"177",tracking_url:url,image_url:null,thumb_url:null,in_stock:null,availability:null,
 valid_from:"2026-10-01T00:00:00Z",valid_to:"2026-12-31T23:59:00Z",observed_at:"2026-10-30T01:00:00Z",price:99,currency:"EUR",
 stay_places:{id:"p1",property_name:"Ξενώνας Φύσης",address:"Ενδεικτικό",location_label:"Ήπειρος",latitude:39.52,longitude:21.21,hero_image_url:null}
};
const gate:ApprovedCommerce={enabled:true,approvedSite:true,approvedPrograms:new Set(["177"])};
const closed:ApprovedCommerce={enabled:false,approvedSite:false,approvedPrograms:new Set()};
let scenarios=0;
for(const season of ["autumn","spring","summer","winter"]){
 for(const mood of ["quiet","nature","adventure","family","romantic"]){
  for(const nights of [1,2,3,4,7]){
   const ranked=rankHiddenPlaces([place,{...place,id:"unreviewed",verification_status:"seeded",source_url:null}],{season,mood,nights,publishedOnly:true});
   assert.equal(ranked.length,1,"non-verified place never enters public results");
   assert(ranked[0].discoveryFitScore>=0&&ranked[0].discoveryFitScore<=100);
   const valid=rankAffiliateStays(place,[offer],gate,{now:new Date("2026-10-30T09:00:00Z"),nights,limit:3});
   assert.equal(valid.length,nights===1?1:0,"advertised night count is hard constraint");
   assert.equal(rankAffiliateStays(place,[offer],closed,{now:new Date("2026-10-30T09:00:00Z"),nights}).length,0,"no unapproved outbound can be released");
   if(valid.length)assert.equal(valid[0]?.bookingStatus,"availability-not-confirmed");
   scenarios++;
  }
 }
}
assert.equal(scenarios,100);
console.log("HIDDEN_GREECE_V2_100_SCENARIOS_PASS 100-profiles / holiday-calendar / map+SEO contracts / affiliate+availability truth");
