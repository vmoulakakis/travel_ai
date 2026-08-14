import type { StayConstraintSpec,V8StayOffer } from "@/lib/decision/v8-types";
import { evaluateStayOfferV16 } from "@/lib/decision/stay-constraints-v16";
import type { TripRequest } from "@/lib/validation/trip";

export function stayOfferCriterionDeltaV22(offer:V8StayOffer,spec:StayConstraintSpec|undefined){
 if(!spec)return 0;const evaluation=evaluateStayOfferV16(offer,spec);if(evaluation.hardFailures.length)return-1000;if(!spec.soft.length)return 0;
 const ratio=evaluation.softMatches.length/spec.soft.length;
 // A soft accommodation request must be visible in ordering, without being silently promoted to a hard constraint.
 return Math.round(ratio*30-(1-ratio)*6);
}

export function scoreStayOffer(offer:V8StayOffer,style:TripRequest["hotelStyle"],location:TripRequest["stayLocationPreference"]="balanced"){
 let score=100-(offer.distanceKm??20)+(offer.semanticScore??0);
 const distance=offer.distanceKm??20;
 if(location==="central")score+=Math.max(0,18-distance*3);
 if(location==="outside")score+=Math.min(18,distance*2);
 if(style==="luxury")score+=(offer.starLevel??0)*12;
 if(style==="value"&&offer.price!=null)score+=Math.max(0,80-offer.price)/3;
 if(style==="boutique"&&/boutique|design/i.test(`${offer.propertyName} ${offer.description??""}`))score+=25;
 if(style==="resort"&&/resort|spa|all inclusive/i.test(`${offer.propertyName} ${offer.description??""}`))score+=25;
 return score;
}
