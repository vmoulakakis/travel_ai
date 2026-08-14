import type { TripRequest } from "@/lib/validation/trip";
import type { V8Destination } from "@/lib/decision/v8-types";
import { geographyConstraint,matchesGeographyConstraint } from "@/lib/decision/geography-constraint";

export function canonicalRankingInputsV19(trip:TripRequest,catalog:V8Destination[]){
  const hardConstraint=geographyConstraint(trip,catalog);
  const constrainedCatalog=hardConstraint?catalog.filter(destination=>matchesGeographyConstraint(destination,hardConstraint)):catalog;
  const rankingTrip:TripRequest={...trip,tripText:""};
  return{hardConstraint,constrainedCatalog,rankingTrip};
}
