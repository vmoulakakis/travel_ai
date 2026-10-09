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
  | "ferry-check" | "airport-transfer" | "local-access";

export type WeekendFrictionCheck = {
  key: FrictionKey;
  priority: "high" | "medium";
  status: "not-verified";
  messageEl: string;
  messageEn: string;
  nextStepEl: string;
  nextStepEn: string;
  verificationSource: "operator" | "official-attraction" | "quoted-costs" | "weather" | "property";
  contextSourceUrl?: string; // Links are contextual references, not confirmation of current availability.
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
  nextStepEl:string,nextStepEn:string,verificationSource:WeekendFrictionCheck["verificationSource"],contextSourceUrl?:string):WeekendFrictionCheck {
  return {key,priority,status:"not-verified",messageEl,messageEn,nextStepEl,nextStepEn,verificationSource,
    ...(contextSourceUrl?{contextSourceUrl}:{})};
}

/**
 * Manually researched destination pain briefs. These sources establish geography
 * or general site context only, NEVER live transport, hours or entry availability.
 * Each line below is original editorial guidance, not scraped review content.
 */
const PILOT_RESEARCH:Record<string,{el:string;en:string;actionEl:string;actionEn:string;url:string}>={
  "zagori":{
    el:"Τα χωριά και τα γεφύρια απλώνονται σε διαφορετικές ορεινές διαδρομές.",
    en:"Villages and stone bridges are spread across different mountain routes.",
    actionEl:"Διάλεξε μία βάση και έλεγξε πραγματικές διαδρομές ανάμεσα στα σημεία.",
    actionEn:"Choose a base village and verify real connections between stops.",
    url:"https://whc.unesco.org/en/list/1695/"
  },
  "meteora":{
    el:"Τα μοναστήρια δεν έχουν ένα κοινό ωράριο επίσκεψης.",
    en:"The monasteries do not share one universal visiting schedule.",
    actionEl:"Επιβεβαίωσε ξεχωριστά ώρες, κλειστές ημέρες και σκαλιά του μοναστηριού.",
    actionEn:"Verify each monastery's visiting days, times and steps.",
    url:"https://meteora.com/meteora-monasteries-opening-hours/"
  },
  "pelion":{
    el:"Το Πήλιο συνδυάζει πολλά χωριά και εμπειρίες που απαιτούν επιλογή διαδρομής.",
    en:"Pelion covers villages and experiences that require a realistic route choice.",
    actionEl:"Επίλεξε 1–2 κοντινά χωριά την ημέρα αντί να προσπαθήσεις όλο το Πήλιο.",
    actionEn:"Choose one or two nearby villages per day rather than the entire peninsula.",
    url:"https://www.discovergreece.com/travel-ideas/article/autumn-holidays-greece"
  },
  "nafplio":{
    el:"Το Παλαμήδι έχει επίπονη ανάβαση από τα σκαλιά, αλλά και οδική πρόσβαση.",
    en:"Palamidi involves a steep staircase approach, while road access also exists.",
    actionEl:"Επίλεξε τη σωστή πρόσβαση για την παρέα σου και έλεγξε το ωράριο.",
    actionEn:"Choose the right access for your group and verify opening hours.",
    url:"https://www.visitgreece.gr/en/experiences/culture/fortifications/palamidi"
  },
  "monemvasia":{
    el:"Η Καστροπολιτεία έχει πύλη εισόδου και στενά πλακόστρωτα σοκάκια.",
    en:"Monemvasia's castle town has a main gate and narrow cobbled lanes.",
    actionEl:"Πριν κλείσεις, έλεγξε μεταφορά αποσκευών και προσβασιμότητα καταλύματος.",
    actionEn:"Check luggage access and accommodation accessibility before booking.",
    url:"https://www.visitgreece.gr/en/experiences/culture/archaeological-sites-monuments/the-castle-town-of-monemvasia"
  },
  "nafpaktos":{
    el:"Το κάστρο βρίσκεται πάνω από το λιμάνι, άρα η ανάβαση επηρεάζει τον ρυθμό.",
    en:"The castle rises above the port, so the uphill visit affects pacing.",
    actionEl:"Σύγκρινε την πεζή ανάβαση με την πρόσβαση από τον δρόμο.",
    actionEn:"Compare the uphill walk with road access.",
    url:"https://www.visitgreece.gr/en/experiences/culture/archaeological-sites-monuments/the-venetian-port-and-castle-of-nafpaktos"
  },
  "syros":{
    el:"Η Άνω Σύρος έχει ανηφορικά σοκάκια και σκαλοπάτια.",
    en:"Ano Syros has uphill lanes and stairways.",
    actionEl:"Υπολόγισε αν προτιμάς βάση Ερμούπολη και ποια σημεία είναι εύκολα με τα πόδια.",
    actionEn:"Consider an Ermoupoli base and check walking effort for key sights.",
    url:"https://www.visitgreece.gr/en/islands/aegean/syros"
  },
  "samothrace":{
    el:"Η πρόσβαση στη Σαμοθράκη απαιτεί συνδυασμό μεταφορών μέσω Αλεξανδρούπολης.",
    en:"Reaching Samothrace involves connecting transport via Alexandroupolis.",
    actionEl:"Επιβεβαίωσε αεροπορική/οδική πρόσβαση, πλοίο και επιστροφή ως ενιαίο ταξίδι.",
    actionEn:"Verify flight or road access, sailing and return as one trip.",
    url:"https://www.visitgreece.gr/en/mainland/islands/samothrace"
  },
  "paxos":{
    el:"Οι παραλίες και οι οικισμοί των Παξών χρειάζονται επιλογή τοπικής μετακίνησης.",
    en:"Paxos beaches and villages need a thought-through local transport plan.",
    actionEl:"Έλεγξε πρόσβαση σε διαμονή και σημεία ενδιαφέροντος χωρίς ακριβό ταξί.",
    actionEn:"Check local access to stays and sights without relying on expensive taxis.",
    url:"https://www.visitgreece.gr/en/experiences/culture/local-traditions/beaches-of-paxi"
  }
};

export function weekendFrictionChecksV71(trip:Request, place:Place, limit=3):WeekendFrictionSummary {
  const checks:WeekendFrictionCheck[]=[];
  const add=(check:WeekendFrictionCheck)=>{if(!checks.some(c=>c.key===check.key))checks.push(check)};
  const effort=effortForOrigin(trip,place);
  const noCar=trip.transportMode==="no-car";
  const months=[Number(trip.startDate.slice(5,7)),Number(trip.endDate.slice(5,7))];
  const shoulderOrWinter=months.some(m=>m<=4||m>=10);
  const shortTrip=trip.nights<=2;

  const pilot=PILOT_RESEARCH[place.slug];
  if(pilot)add(entry("local-access","high",pilot.el,pilot.en,pilot.actionEl,pilot.actionEn,
    "official-attraction",pilot.url));

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
