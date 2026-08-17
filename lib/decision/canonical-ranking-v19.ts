import type { TripRequest } from "@/lib/validation/trip";
import type { V8Destination } from "@/lib/decision/v8-types";
import { matchesLocationScopeV30,resolveLocationScopeV30 } from "@/lib/decision/location-scope-v30";

export function canonicalRankingInputsV19(trip:TripRequest,catalog:V8Destination[]){
  const hardConstraint=resolveLocationScopeV30(trip,catalog);
  const constrainedCatalog=catalog.filter(destination=>matchesLocationScopeV30(destination,hardConstraint));
  // Location truth has already constrained the candidate universe. Clear location-bearing soft
  // fields before the legacy scorer runs so it cannot reinterpret an explicit city as a mere bonus.
  const rankingTrip:TripRequest={
    ...trip,
    tripText:"",
    consideredDestination:undefined,
    distancePreference:trip.distancePreference==="island"?"any":trip.distancePreference,
  };
  return{hardConstraint,constrainedCatalog,rankingTrip};
}
