import type { TripRequest } from "@/lib/validation/trip";
import type { V8Recommendation } from "@/lib/decision/v8-types";

export interface SmartDateWindow {
  id: "original" | "quieter" | "weekend";
  startDate: string;
  endDate: string;
  titleEl: string;
  titleEn: string;
  tradeoffEl: string;
  tradeoffEn: string;
  confidence: "HIGH" | "MEDIUM";
}

const day = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const add = (date: string, amount: number) => iso(new Date(Date.parse(`${date}T00:00:00Z`) + amount * day));

function nextWeekday(date: string, weekday: number) {
  const current = new Date(`${date}T00:00:00Z`).getUTCDay();
  const delta = (weekday - current + 7) % 7 || 7;
  return add(date, delta);
}

export function buildSmartDateWindows(request: TripRequest, recommendation: V8Recommendation): SmartDateWindow[] {
  const friday = nextWeekday(request.startDate, 5);
  const sunday = nextWeekday(request.startDate, 0);
  const weather = recommendation.weather?.source !== "unavailable";
  return [
    {
      id: "original",
      startDate: request.startDate,
      endDate: request.endDate,
      titleEl: "Οι ημερομηνίες σου",
      titleEn: "Your dates",
      tradeoffEl: weather ? "Η πιο ασφαλής επιλογή: έχει ήδη περάσει τον έλεγχο εποχής και καιρού." : "Η αρχική σου επιλογή, με επιβεβαιωμένη εποχική καταλληλότητα.",
      tradeoffEn: weather ? "The safest choice: already checked for season and weather." : "Your original choice, with verified seasonal fit.",
      confidence: weather ? "HIGH" : "MEDIUM",
    },
    {
      id: "quieter",
      startDate: sunday,
      endDate: add(sunday, request.nights),
      titleEl: "Πιο ήσυχος ρυθμός",
      titleEn: "A quieter rhythm",
      tradeoffEl: "Κυριακή έως μέσα εβδομάδας: συνήθως λιγότερη πίεση και πιο ήρεμη εμπειρία· οι τιμές επανελέγχονται πριν την επιλογή.",
      tradeoffEn: "Sunday into midweek: usually less pressure and a calmer stay; prices are rechecked before selection.",
      confidence: "MEDIUM",
    },
    {
      id: "weekend",
      startDate: friday,
      endDate: add(friday, request.nights),
      titleEl: "Το εύκολο weekend",
      titleEn: "The easy weekend",
      tradeoffEl: "Παρασκευή αναχώρηση για λιγότερες ημέρες άδειας· μπορεί να έχει περισσότερο κόσμο.",
      tradeoffEn: "Friday departure uses fewer leave days; it may be busier.",
      confidence: "MEDIUM",
    },
  ];
}
