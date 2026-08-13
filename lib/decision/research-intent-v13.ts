import { loadDestinationEvidence } from "@/lib/data/evidence-v12";
import type { DestinationEvidenceBundle } from "@/lib/decision/types";
import type { V8Ranked } from "@/lib/decision/v8-matcher";
import type { TripRequest } from "@/lib/validation/trip";

export type ResearchNeed = "ancient_history" | "dated_events";
export type ResearchIntent = { needs: Set<ResearchNeed>; explicit: boolean };

const norm = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function researchIntent(request: TripRequest): ResearchIntent {
  const text = norm(request.tripText ?? "");
  const needs = new Set<ResearchNeed>();
  if (/αρχαι|αρχαιολογ|μνημει|ιστορικ.{0,12}(χωρ|τοπ)|ancient|archaeolog|historic site/.test(text)) needs.add("ancient_history");
  if (/εκδηλω|φεστιβαλ|συναυλι|παραστασ|event|festival|concert/.test(text)) needs.add("dated_events");
  return { needs, explicit: needs.size > 0 };
}

function textOf(bundle: DestinationEvidenceBundle) {
  return bundle.places.map(item => `${item.subjectName} ${item.headline} ${item.summary ?? ""}`).join(" ");
}

export function satisfiesResearchNeed(bundle: DestinationEvidenceBundle, need: ResearchNeed) {
  if (need === "dated_events") return bundle.hasDateMatchedEvents;
  return /αρχαι|αρχαιολογ|μνημει|ancient|archaeolog|monument|heritage/i.test(norm(textOf(bundle)));
}

export type ResearchScreen = {
  intent: ResearchIntent;
  evidence: Map<string, DestinationEvidenceBundle>;
  verifiedCoverage: Record<ResearchNeed, number>;
  ranked: V8Ranked[];
};

export async function screenResearchEvidence(request: TripRequest, ranked: V8Ranked[], limit = 18): Promise<ResearchScreen> {
  const intent = researchIntent(request);
  const evidence = new Map<string, DestinationEvidenceBundle>();
  const coverage: Record<ResearchNeed, number> = { ancient_history: 0, dated_events: 0 };
  if (!intent.explicit) return { intent, evidence, verifiedCoverage: coverage, ranked };
  const candidates = ranked.slice(0, limit);
  const bundles = await Promise.all(candidates.map(item => loadDestinationEvidence(item.destination.slug, request.startDate, request.endDate)));
  candidates.forEach((item, index) => evidence.set(item.destination.slug, bundles[index]));
  for (const need of intent.needs) coverage[need] = bundles.filter(bundle => satisfiesResearchNeed(bundle, need)).length;
  const rescored = ranked.map(item => {
    const bundle = evidence.get(item.destination.slug);
    if (!bundle) return item;
    let delta = 0;
    for (const need of intent.needs) delta += satisfiesResearchNeed(bundle, need) ? 14 : -10;
    return { ...item, score: Math.max(0, Math.min(100, item.score + delta)) };
  });
  return { intent, evidence, verifiedCoverage: coverage, ranked: rescored.sort((a, b) => b.score - a.score) };
}
