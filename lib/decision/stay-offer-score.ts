import type { StayConstraintSpec,V23FuzzyIntentContract,V8StayOffer } from "@/lib/decision/v8-types";
import { evaluateStayOfferV16 } from "@/lib/decision/stay-constraints-v16";
import { fuzzyVectorFitV23 } from "@/lib/decision/fuzzy-semantic-v23";
import type { TripRequest } from "@/lib/validation/trip";

export function stayOfferCriterionDeltaV22(offer:V8StayOffer,spec:StayConstraintSpec|undefined){
 if(!spec)return 0;const evaluation=evaluateStayOfferV16(offer,spec);if(evaluation.hardFailures.length)return-1000;if(!spec.soft.length)return 0;
 const ratio=evaluation.softMatches.length/spec.soft.length;return Math.round(ratio*30-(1-ratio)*6);
}
export function stayOfferCriterionDeltaV23(offer:V8StayOffer,spec:StayConstraintSpec|undefined,contract:V23FuzzyIntentContract|undefined){
 const explicit=stayOfferCriterionDeltaV22(offer,spec);if(explicit<=-1000)return explicit;if(!contract||offer.semanticVector?.length!==24)return explicit;
 const fuzzy=fuzzyVectorFitV23(offer.semanticVector,contract),confidence=Math.max(0,Math.min(1,offer.semanticConfidence??.55)),semantic=(fuzzy.fit-.5)*52*(.45+.55*confidence)-fuzzy.negativeConflict*12;
 return Math.round(explicit+semantic);
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
