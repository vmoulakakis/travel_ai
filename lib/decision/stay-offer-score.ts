import type { V8StayOffer } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

export function scoreStayOffer(offer:V8StayOffer,style:TripRequest["hotelStyle"],location:TripRequest["stayLocationPreference"]="balanced"){
 let score=100-(offer.distanceKm??20);
 const distance=offer.distanceKm??20;
 if(location==="central")score+=Math.max(0,18-distance*3);
 if(location==="outside")score+=Math.min(18,distance*2);
 if(style==="luxury")score+=(offer.starLevel??0)*12;
 if(style==="value"&&offer.price!=null)score+=Math.max(0,80-offer.price)/3;
 if(style==="boutique"&&/boutique|design/i.test(`${offer.propertyName} ${offer.description??""}`))score+=25;
 if(style==="resort"&&/resort|spa|all inclusive/i.test(`${offer.propertyName} ${offer.description??""}`))score+=25;
 return score;
}
