import type { TripRequest } from "@/lib/validation/trip";
import type { V8Destination } from "@/lib/decision/v8-types";
import { detectUnsupportedDestinationCountry,geographyConstraint } from "@/lib/decision/geography-constraint";
import { matchesLocationScopeV30,resolveLocationScopeV30,type LocationScopeV30 } from "@/lib/decision/location-scope-v30";

export function canonicalRankingInputsV19(trip:TripRequest,catalog:V8Destination[]){
  const selectedOrNaturalScope=resolveLocationScopeV30(trip,catalog);
  const textOnlyTrip:TripRequest={...trip,consideredDestination:undefined};
  const textConstraint=geographyConstraint(textOnlyTrip,catalog);
  const outsideCountry=detectUnsupportedDestinationCountry(trip.tripText);
  const textScope:LocationScopeV30|null=textConstraint?{id:`text-${textConstraint.id}`,labelEl:textConstraint.labelEl,labelEn:textConstraint.labelEn,source:"geography",base:textConstraint}:null;
  const constrainedCatalog=outsideCountry?[]:catalog.filter(destination=>matchesLocationScopeV30(destination,selectedOrNaturalScope)&&matchesLocationScopeV30(destination,textScope));
  const hardConstraint=outsideCountry
    ?{id:`outside-greece-${outsideCountry.toLowerCase().replace(/\s+/g,"-")}`,labelEl:`εκτός Ελλάδας: ${outsideCountry}`,labelEn:`outside Greece: ${outsideCountry}`,source:"foreign-out-of-scope" as const,selectedSlugs:new Set<string>(),outsideCountry}
    :selectedOrNaturalScope??textScope;
  const explicitDestinationScope=Boolean(selectedOrNaturalScope?.selectedSlugs?.size);
  // Location truth has already constrained the candidate universe. Clear location-bearing soft
  // fields before the legacy scorer runs so it cannot reinterpret an explicit city as a mere bonus.
  // Explicit destination intent also overrides the legacy "do not recommend the origin" guard;
  // this matters when the quick UI has a default origin (Athens) but the user explicitly asks for Athens.
  const rankingTrip:TripRequest={
    ...trip,
    origin:explicitDestinationScope?"Unspecified origin":trip.origin,
    tripText:"",
    consideredDestination:undefined,
    distancePreference:trip.distancePreference==="island"?"any":trip.distancePreference,
  };
  return{hardConstraint,constrainedCatalog,rankingTrip};
}
