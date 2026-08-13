import type { V8Destination } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();
const westernSlugs=new Set(["corfu","paxos","lefkada","kefalonia","zakynthos","ioannina","zagori","parga","nafpaktos","patras","olympia"]);

export type GeographyConstraint={id:"western-greece";labelEl:string;labelEn:string};

export function geographyConstraint(request:TripRequest):GeographyConstraint|null{
 const text=norm(request.tripText??"");
 const western=text.includes("δυτικη ελλαδα")||text.includes("δυτικα της ελλαδας")||/west(?:ern)? greece/.test(text),strict=["μονο","αποκλειστικα","θελω","only","exclusively"].some(marker=>text.split(" ").includes(marker));
 if(western&&strict)return{id:"western-greece",labelEl:"μόνο Δυτική Ελλάδα",labelEn:"Western Greece only"};
 return null;
}

export function matchesGeographyConstraint(destination:V8Destination,constraint:GeographyConstraint|null){
 if(!constraint)return true;
 if(constraint.id==="western-greece")return destination.countryCode==="GR"&&(destination.regionGroup==="ionian"||destination.regionGroup==="epirus"||westernSlugs.has(destination.slug));
 return true;
}
