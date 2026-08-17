import type { TripRequest } from "@/lib/validation/trip";
import type { V8Destination } from "@/lib/decision/v8-types";
import { matchesLocationScopeV30,resolveLocationScopeV30 } from "@/lib/decision/location-scope-v30";

export function canonicalRankingInputsV19(trip:TripRequest,catalog:V8Destination[]){
  const hardConstraint=resolveLocationScopeV30(trip,catalog);
  const constrainedCatalog=catalog.filter(destination=>matchesLocationScopeV30(destination,hardConstraint));
  const explicitDestinationScope=Boolean(hardConstraint?.selectedSlugs?.size);
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
