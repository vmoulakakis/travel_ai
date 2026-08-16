import type { StayConstraintSpec } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

export function mergeStructuredStayRequirementsV26(request:TripRequest,spec:StayConstraintSpec):StayConstraintSpec{
 // Criterion ownership: electric-car is NOT converted into a feed-text hard constraint here.
 // The live Linkwise inventory currently has no explicit EV-charging text claims, while the stay
 // card already verifies either an at-property claim OR an OSM-mapped charger within 5 km before
 // an EV traveller can select the stay. Turning EV_CHARGING into a global feed hard filter would
 // therefore create systematic false no-results.
 void request;
 return spec;
}

export function requiresVerifiedEvChargingV26(request:TripRequest){return request.transportMode==="electric-car";}
