import type { V8StayOffer } from "@/lib/decision/v8-types";

export type StayAvailabilityTruthV20 =
  | "CONFIRMED_ACTIVE"
  | "VALID_WINDOW_STOCK_UNKNOWN"
  | "EXPLICITLY_UNAVAILABLE"
  | "OUTSIDE_VALIDITY_WINDOW"
  | "INVALID_FEED_EVIDENCE";

export interface StayAvailabilityAssessmentV20 {
  truth: StayAvailabilityTruthV20;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  fullTripWindowCovered: boolean;
  stockState: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  providerConfirmationRequired: true;
  reason: string;
}

const linkwiseTracking = (url: string) =>
  url.startsWith("https://go.linkwi.se/") && url.includes("/CD104/");

export function assessStayAvailabilityV20(
  offer: V8StayOffer,
  startDate: string,
  endDate: string,
): StayAvailabilityAssessmentV20 {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const validFrom = offer.validFrom ? Date.parse(offer.validFrom) : Number.NaN;
  const validTo = offer.validTo ? Date.parse(offer.validTo) : Number.NaN;
  const validDates = Number.isFinite(start) && Number.isFinite(end) && end > start;
  const feedDates = Number.isFinite(validFrom) && Number.isFinite(validTo);
  const fullTripWindowCovered = validDates && feedDates && validFrom <= start && validTo >= end;

  if (!linkwiseTracking(offer.trackingUrl) || !feedDates) {
    return {
      truth: "INVALID_FEED_EVIDENCE",
      confidence: "LOW",
      fullTripWindowCovered: false,
      stockState: offer.inStock === true ? "AVAILABLE" : offer.inStock === false ? "UNAVAILABLE" : "UNKNOWN",
      providerConfirmationRequired: true,
      reason: "Tracking or dated feed evidence is incomplete.",
    };
  }

  if (!fullTripWindowCovered) {
    return {
      truth: "OUTSIDE_VALIDITY_WINDOW",
      confidence: "HIGH",
      fullTripWindowCovered: false,
      stockState: offer.inStock === true ? "AVAILABLE" : offer.inStock === false ? "UNAVAILABLE" : "UNKNOWN",
      providerConfirmationRequired: true,
      reason: "The feed validity window does not cover the full requested trip.",
    };
  }

  if (offer.inStock === false) {
    return {
      truth: "EXPLICITLY_UNAVAILABLE",
      confidence: "HIGH",
      fullTripWindowCovered: true,
      stockState: "UNAVAILABLE",
      providerConfirmationRequired: true,
      reason: "The feed explicitly marks the offer unavailable.",
    };
  }

  if (offer.inStock === true) {
    return {
      truth: "CONFIRMED_ACTIVE",
      confidence: "HIGH",
      fullTripWindowCovered: true,
      stockState: "AVAILABLE",
      providerConfirmationRequired: true,
      reason: "The feed explicitly marks the offer active and its validity covers the full trip.",
    };
  }

  return {
    truth: "VALID_WINDOW_STOCK_UNKNOWN",
    confidence: "MEDIUM",
    fullTripWindowCovered: true,
    stockState: "UNKNOWN",
    providerConfirmationRequired: true,
    reason: "The feed validity covers the trip, but stock state is not explicitly supplied.",
  };
}
