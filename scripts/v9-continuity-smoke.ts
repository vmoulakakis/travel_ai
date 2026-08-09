import { strict as assert } from "node:assert";
import { containsForbiddenTechnicalText, partialContinuity, safePublicMessage } from "../lib/continuity";
import { buildSmartDateWindows } from "../lib/decision/date-windows-v9";
import type { V8Recommendation } from "../lib/decision/v8-types";
import type { TripRequest } from "../lib/validation/trip";

const request: TripRequest = {
  origin: "Athens", startDate: "2026-10-16", endDate: "2026-10-19", month: "october", nights: 3,
  budget: 500, moods: ["romantic", "food"], travelerType: "couple", language: "el",
  distancePreference: "easy-hop", pace: "balanced", hotelStyle: "boutique", avoid: "long-travel",
};

const recommendation = {
  slug: "nafplio", destination: "Ναύπλιο", destinationEn: "Nafplio", country: "Ελλάδα", countryCode: "GR",
  regionGroup: "peloponnese", role: "BEST FIT", score: 88, fitStatus: "strong", confidence: "HIGH", why: "Ταιριάζει στον ρυθμό σου.",
  seasonNote: "Κατάλληλη περίοδος.", effortLabel: "κοντινή οδική απόδραση", budgetLabel: "καλή αξία",
  tags: ["romantic", "food"], latitude: 37.57, longitude: 22.8, directFromAthens: true, routeConfidence: 0.92,
  breakdown: { intent: 90, season: 88, effort: 95, duration: 100, budget: 91, weather: 80, traveler: 98, crowdFit: 80, routeConfidence: 92 },
} satisfies V8Recommendation;

const windows = buildSmartDateWindows(request, recommendation);
assert.equal(windows.length, 3);
assert.deepEqual(windows.map(window => window.id), ["original", "quieter", "weekend"]);
assert.equal(windows[0].startDate, request.startDate);
assert.equal(windows[0].endDate, request.endDate);
for (const window of windows) assert.equal((Date.parse(window.endDate) - Date.parse(window.startDate)) / 86_400_000, request.nights);

for (const leaked of ["quota exceeded", "OpenAI 429", "Supabase timeout", "provider model error"]) {
  const safe = safePublicMessage(leaked, "el");
  assert.equal(containsForbiddenTechnicalText(safe), false);
}
assert.equal(partialContinuity().canResume, true);

console.log("V9_CONTINUITY_SMOKE_OK", JSON.stringify({ windows: windows.map(window => window.startDate), continuity: partialContinuity().state }));
