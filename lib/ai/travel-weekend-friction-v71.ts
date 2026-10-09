import type { TripRequest } from "@/lib/validation/trip";
import type { V8Recommendation } from "@/lib/decision/v8-types";

/**
 * V71 user-facing friction checklist, deliberately separate from destination fit.
 * This NEVER confirms availability, operating hours, fares, weather or transit.
 * It does not change recommendation order, eligibility, affiliate payouts or prices.
 */
export type FrictionKey =
  | "return-transport" | "last-mile" | "weekend-hours" | "seasonal-opening"
  | "whole-trip-budget" | "rain-plan" | "family-access" | "ev-charging"
  | "ferry-check" | "airport-transfer";

export type WeekendFrictionCheck = {
  key: FrictionKey;
  priority: "high" | "medium";
  status: "not-verified";
  messageEl: string;
  messageEn: string;
  nextStepEl: string;
  nextStepEn: string;
  verificationSource: "operator" | "official-attraction" | "quoted-costs" | "weather" | "property";
};

export type WeekendFrictionSummary = {
  version: "V71";
  evidenceStatus: "pre-booking-checks-not-live-verification";
  checks: WeekendFrictionCheck[];
};

type Request = Pick<TripRequest, "origin" | "startDate" | "endDate" | "nights" | "budget"
  | "moods" | "transportMode" | "travelerType">;
type Place = Pick<V8Recommendation, "slug" | "regionGroup" | "routeConfidence"> & {
  effortAthens?: string;
  effortThessaloniki?: string;
};

function effortForOrigin(trip: Request, place: Place): string | null {
  const origin = trip.origin.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/athens|athina|αθην/.test(origin)) return place.effortAthens ?? null;
  if (/thessaloniki|salonika|θεσσαλονικ|σαλον/.test(origin)) return place.effortThessaloniki ?? null;
  return null; // Never borrow route assumptions from a different origin.
}

function entry(key:FrictionKey, priority:"high"|"medium", messageEl:string,messageEn:string,
  nextStepEl:string,nextStepEn:string,verificationSource:WeekendFrictionCheck["verificationSource"]):WeekendFrictionCheck {
  return {key,priority,status:"not-verified",messageEl,messageEn,nextStepEl,nextStepEn,verificationSource};
}

export function weekendFrictionChecksV71(trip:Request, place:Place, limit=3):WeekendFrictionSummary {
  const checks:WeekendFrictionCheck[]=[];
  const add=(check:WeekendFrictionCheck)=>{if(!checks.some(c=>c.key===check.key))checks.push(check)};
  const effort=effortForOrigin(trip,place);
  const noCar=trip.transportMode==="no-car";
  const months=[Number(trip.startDate.slice(5,7)),Number(trip.endDate.slice(5,7))];
  const shoulderOrWinter=months.some(m=>m<=4||m>=10);
  const shortTrip=trip.nights<=2;

  if(effort?.startsWith("ferry"))add(entry("ferry-check","high",
    "Η ακτοπλοϊκή σύνδεση χρειάζεται επιβεβαίωση για το συγκεκριμένο ΣΚ.",
    "Confirm ferry service for these exact weekend dates.",
    "Έλεγξε μετάβαση, επιστροφή και εναλλακτικό δρομολόγιο στον μεταφορέα.",
    "Check outbound, return and fallback sailings with the operator.","operator"));

  if(noCar)add(entry("return-transport","high",
    "Η επιστροφή χωρίς αυτοκίνητο είναι βασικός περιορισμός του διημέρου.",
    "The no-car return journey is a critical weekend constraint.",
    "Επιβεβαίωσε την τελευταία σύνδεση και την επιστροφή της Κυριακής.",
    "Verify the last connection and Sunday return service.","operator"));

  if(noCar)add(entry("last-mile","high",
    "Η πρόσβαση από τον σταθμό ή το λιμάνι στο κατάλυμα δεν έχει ελεγχθεί.",
    "The transfer from station or port to the stay is not verified.",
    "Βρες αξιόπιστη μεταφορά ως το κατάλυμα και τα βασικά αξιοθέατα.",
    "Confirm onward transport to the stay and key sights.","operator"));

  if(effort?.includes("flight"))add(entry("airport-transfer","medium",
    "Χρειάζεται έλεγχος συνδέσεων από και προς το αεροδρόμιο.",
    "Airport transfers and connections still need checking.",
    "Επιβεβαίωσε ώρες πτήσεων και τελευταία μεταφορά, όχι μόνο το εισιτήριο.",
    "Check flight times and last transfer, not only airfare.","operator"));

  if(shortTrip&&(effort==="road-long"||effort==="ferry-long"||effort==="domestic-flight-plus-road"||Number(place.routeConfidence)<.8))
    add(entry("weekend-hours","high",
      "Σε 1–2 διανυκτερεύσεις η μετάβαση μπορεί να μειώσει σημαντικά τον διαθέσιμο χρόνο.",
      "On a 1–2-night trip, transfers can consume much of the usable holiday time.",
      "Υπολόγισε ώρες πόρτα-πόρτα και τι πραγματικά προλαβαίνεις.",
      "Calculate door-to-door hours before deciding.","operator"));

  if(shoulderOrWinter)add(entry("seasonal-opening","medium",
    "Ορισμένα αξιοθέατα ή υπηρεσίες έχουν εποχικά ωράρια που δεν έχουν επαληθευτεί.",
    "Some attractions or services may have seasonal hours that remain unverified.",
    "Έλεγξε τις επιλεγμένες ημέρες σε επίσημες πηγές.",
    "Confirm exact opening days using official sources.","official-attraction"));

  if(trip.moods.some(m=>m==="nature"||m==="adventure"))
    add(entry("rain-plan","medium",
      "Μία υπαίθρια εμπειρία χρειάζεται εναλλακτικό σχέδιο σε περίπτωση κακοκαιρίας.",
      "Outdoor plans need a weather-safe alternative.",
      "Έλεγξε πρόγνωση κοντά στην αναχώρηση και κράτα μία εσωτερική δραστηριότητα.",
      "Recheck the forecast close to departure and keep an indoor plan.","weather"));

  if(trip.travelerType==="family")add(entry("family-access","medium",
    "Σκαλιά, αποστάσεις και ώρες λειτουργίας μπορεί να αλλάξουν το οικογενειακό πρόγραμμα.",
    "Steps, walking distances and opening hours can change a family itinerary.",
    "Έλεγξε πρόσβαση, ηλικιακή καταλληλότητα και ρυθμό μετακινήσεων.",
    "Verify access, age suitability and realistic pacing.","official-attraction"));

  if(trip.transportMode==="electric-car")add(entry("ev-charging","high",
    "Η διαθεσιμότητα φόρτισης EV δεν είναι επιβεβαιωμένη.",
    "EV charging availability is not confirmed.",
    "Έλεγξε φορτιστές, παρόχους και εφεδρική στάση στη διαδρομή.",
    "Confirm charger operation, operators and a backup stop.","operator"));

  if(Number.isFinite(trip.budget)&&trip.budget>0)add(entry("whole-trip-budget","medium",
    "Η τιμή διαμονής δεν ισοδυναμεί με το συνολικό κόστος του ταξιδιού.",
    "A stay price is not the total trip cost.",
    "Συνυπολόγισε μεταφορά, διόδια/καύσιμα, πάρκινγκ, φαγητό και εισιτήρια.",
    "Include transport, tolls/fuel, parking, meals and entry fees.","quoted-costs"));

  // Risk precedence is deterministic; these are questions, not verified negatives.
  checks.sort((a,b)=>(a.priority==="high"?0:1)-(b.priority==="high"?0:1));
  return {version:"V71",evidenceStatus:"pre-booking-checks-not-live-verification",
    checks:checks.slice(0,Math.min(4,Math.max(1,Math.trunc(limit)||3)))};
}
