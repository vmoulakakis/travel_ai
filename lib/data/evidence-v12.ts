import type { Confidence, DestinationEvidenceBundle, DestinationEvidenceItem, DestinationEvidenceKind } from "@/lib/decision/types";

type Row = Record<string, unknown>;
const validKinds = new Set<DestinationEvidenceKind>([
  "tripadvisor_destination_rank", "tripadvisor_place_rank", "tripadvisor_rating",
  "booking_property_presence", "booking_property_rating", "official_event",
  "official_place", "seasonal_note", "demand_signal",
]);
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;
const confidence = (value: unknown): Confidence => Number(value) >= .85 ? "HIGH" : Number(value) >= .65 ? "MEDIUM" : "LOW";

function mapRow(row: Row): DestinationEvidenceItem | null {
  const id = text(row.id), kind = text(row.evidence_kind) as DestinationEvidenceKind | null;
  const subjectName = text(row.subject_name), provider = text(row.source_provider), headline = text(row.headline);
  const observedAt = text(row.observed_at), expiresAt = text(row.expires_at);
  if (!id || !kind || !validKinds.has(kind) || !subjectName || !provider || !headline || !observedAt || !expiresAt) return null;
  return {
    id, kind, subjectName, provider, headline, summary: text(row.summary), rank: number(row.rank_value),
    rating: number(row.rating_value), ratingScale: number(row.rating_scale), reviewCount: number(row.review_count),
    sourceProductId: text(row.source_product_id), startsAt: text(row.starts_at), endsAt: text(row.ends_at),
    sourceMonth: text(row.source_month), observedAt, expiresAt, confidence: confidence(row.confidence),
  };
}

function overlaps(item: DestinationEvidenceItem, startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return true;
  const start = Date.parse(`${startDate}T00:00:00Z`), end = Date.parse(`${endDate}T23:59:59Z`);
  const itemStart = item.startsAt ? Date.parse(item.startsAt) : Number.NEGATIVE_INFINITY;
  const itemEnd = item.endsAt ? Date.parse(item.endsAt) : itemStart;
  return itemStart <= end && itemEnd >= start;
}

export async function loadDestinationEvidence(destinationId: string, startDate?: string, endDate?: string): Promise<DestinationEvidenceBundle> {
  const empty = (): DestinationEvidenceBundle => ({ destinationId, checkedAt: new Date().toISOString(), tripadvisor: [], booking: [], events: [], places: [], seasonal: [], hasCurrentRanking: false, hasDateMatchedEvents: false });
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    const direct = Boolean(base && serviceRole);
    const endpoint = direct
      ? new URL("/rest/v1/destination_evidence_v12", base)
      : new URL(process.env.SUPABASE_DESTINATION_EVIDENCE_V12_URL ?? "https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/destination-evidence-v12");
    if (direct) {
      endpoint.searchParams.set("select", "id,evidence_kind,subject_name,source_provider,headline,summary,rank_value,rating_value,rating_scale,review_count,source_product_id,starts_at,ends_at,source_month,observed_at,expires_at,confidence");
      endpoint.searchParams.set("destination_id", `eq.${destinationId}`);
      endpoint.searchParams.set("status", "eq.verified");
      endpoint.searchParams.set("order", "confidence.desc,observed_at.desc");
    } else endpoint.searchParams.set("slug", destinationId);
    const response = await fetch(endpoint, { headers: direct ? { apikey: serviceRole as string, Authorization: `Bearer ${serviceRole}` } : { "user-agent": "travel-guru/1.0" }, cache: "no-store", signal: AbortSignal.timeout(4500) });
    if (!response.ok) return empty();
    const now = Date.now();
    const payload = await response.json() as Row[] | { evidence?: Row[] };
    const rows = Array.isArray(payload) ? payload : payload.evidence ?? [];
    const items = rows.map(mapRow).filter((item): item is DestinationEvidenceItem => item !== null).filter(item => Date.parse(item.expiresAt) > now);
    const tripadvisor = items.filter(item => item.kind.startsWith("tripadvisor_"));
    const booking = items.filter(item => item.kind.startsWith("booking_"));
    const events = items.filter(item => item.kind === "official_event" && overlaps(item, startDate, endDate));
    const places = items.filter(item => item.kind === "official_place");
    const seasonal = items.filter(item => item.kind === "seasonal_note" || item.kind === "demand_signal");
    return { destinationId, checkedAt: new Date().toISOString(), tripadvisor, booking, events, places, seasonal, hasCurrentRanking: tripadvisor.some(item => item.rank != null || item.rating != null), hasDateMatchedEvents: events.length > 0 };
  } catch { return empty(); }
}
