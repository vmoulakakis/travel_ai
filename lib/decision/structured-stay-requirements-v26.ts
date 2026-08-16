import type { StayConstraintSpec } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

export function mergeStructuredStayRequirementsV26(request:TripRequest,spec:StayConstraintSpec):StayConstraintSpec{
 const hard=[...spec.hard];
 // The UI promises an EV-charging verification when the traveller selects an electric car.
 // Until nearby-charger evidence is wired into the global stay scan, require an evidence-backed
 // EV charging claim at an eligible stay. This is deliberately precision-first rather than guessing.
 if(request.transportMode==="electric-car"&&!hard.includes("EV_CHARGING"))hard.push("EV_CHARGING");
 return{...spec,hard,soft:spec.soft.filter(kind=>!hard.includes(kind)),confidence:"HIGH",needsSemanticAssist:false};
}
