import { NextResponse } from "next/server";
import { loadV8StayOffers } from "@/lib/data/destination-v8";
import { loadV8SessionConstraintsV22,recordV8DestinationSelection } from "@/lib/data/match-learning-v8";
import { STAY_CONSTRAINT_KINDS_V16 } from "@/lib/decision/stay-constraints-v16";
import { stayOfferCriterionDeltaV22 } from "@/lib/decision/stay-offer-score";
import type { StayConstraintKind,StayConstraintSpec,V8StayResponse } from "@/lib/decision/v8-types";

export const runtime="nodejs";export const dynamic="force-dynamic";
const iso=/^\d{4}-\d{2}-\d{2}$/;const cookie=/(?:^|;\s*)travel_match_session=([0-9a-f-]{36})(?:;|$)/i;
function readStayRequirements(value:unknown):StayConstraintSpec|undefined{if(!value||typeof value!=="object"||Array.isArray(value))return undefined;const row=value as Record<string,unknown>,read=(key:string)=>Array.isArray(row[key])?row[key].filter((item):item is StayConstraintKind=>typeof item==="string"&&STAY_CONSTRAINT_KINDS_V16.includes(item as StayConstraintKind)):[];const hard=[...new Set(read("hard"))],soft=[...new Set(read("soft").filter(kind=>!hard.includes(kind)))];return{hard,soft,confidence:"HIGH",source:"deterministic",needsSemanticAssist:false}}
export async function GET(request:Request){
 const u=new URL(request.url),slug=(u.searchParams.get("slug")??u.searchParams.get("destination_id")??"").trim(),start=(u.searchParams.get("start_date")??"").trim(),end=(u.searchParams.get("end_date")??"").trim();if(!slug)return NextResponse.json({message:"Χρειάζομαι προορισμό για να συνεχίσω."},{status:400});if(!iso.test(start)||!iso.test(end)||Date.parse(end)<=Date.parse(start))return NextResponse.json({message:"Χρειάζομαι έγκυρες ημερομηνίες για να ελέγξω τη διαμονή."},{status:400});
 const session=request.headers.get("cookie")?.match(cookie)?.[1]??null;
 try{const[offers,constraints]=await Promise.all([loadV8StayOffers(slug,start,end,30),session?loadV8SessionConstraintsV22(session):Promise.resolve(null),session?recordV8DestinationSelection(session,slug):Promise.resolve(false)]),stayRequirements=readStayRequirements(constraints?.stayRequirements),scored=offers.map(offer=>({...offer,semanticScore:stayOfferCriterionDeltaV22(offer,stayRequirements)}));const result:V8StayResponse={version:9,slug,startDate:start,endDate:end,offers:scored,availabilityMeaning:"full-trip-validity-confirm-before-booking"};return NextResponse.json(result,{headers:{"cache-control":"no-store"}})}catch{return NextResponse.json({message:"Δεν υπάρχει αυτή τη στιγμή επιλογή διαμονής που να μπορώ να επιβεβαιώσω για ολόκληρο το ταξίδι σου. Ο προορισμός σου έχει κρατηθεί."},{status:503})}
}
