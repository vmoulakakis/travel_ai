import type { WeatherEvidence, AffiliateOffer, Confidence } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

export const V8_DIMENSIONS=["romantic","relax","food","culture","city","nature","beach","adventure","nightlife","family","luxury","value","warmth","wellness","short_break","shoulder_season"] as const;
export type V8Dimension=typeof V8_DIMENSIONS[number];

export interface V8Destination {
  slug:string;
  nameEl:string;
  nameEn:string;
  countryCode:string;
  countryEl:string;
  countryEn:string;
  latitude:number;
  longitude:number;
  regionGroup:string;
  aliases:string[];
  tags:V8Dimension[];
  vector:number[];
  monthFit:number[];
  idealNightsMin:number;
  idealNightsMax:number;
  costTier:1|2|3|4|5;
  effortAthens:string;
  effortThessaloniki:string;
  directFromAthens:boolean;
  routeConfidence:number;
  travelerFit:Record<string,number>;
  crowdLevel:1|2|3|4|5;
  hotelRadiusKm:number;
  knowledgeSource:string;
  seasonProfile:string;
}

export interface V8IntentProfile {
  weights:Record<V8Dimension,number>;
  source:"structured"|"structured+deepseek";
  summary:string;
  interpretedText?:string|null;
}

export interface V8ScoreBreakdown {
  intent:number;
  season:number;
  effort:number;
  duration:number;
  budget:number;
  weather:number;
  traveler:number;
  crowdFit:number;
  routeConfidence:number;
}

export interface V8Recommendation {
  slug:string;
  destination:string;
  destinationEn:string;
  country:string;
  countryCode:string;
  regionGroup:string;
  role:string;
  score:number;
  confidence:Confidence;
  why:string;
  seasonNote:string;
  effortLabel:string;
  budgetLabel:string;
  tags:string[];
  latitude:number;
  longitude:number;
  directFromAthens:boolean;
  routeConfidence:number;
  breakdown:V8ScoreBreakdown;
  weather?:WeatherEvidence|null;
  verifier?:{checked:boolean;passed:boolean;reason?:string|null;model?:string|null};
}

export interface V8RecommendationResponse {
  version:8;
  request:TripRequest;
  generatedAt:string;
  source:"destination-knowledge-v8";
  intent:V8IntentProfile;
  catalogSize:number;
  mode:"deterministic"|"deepseek-intent";
  verifierUsed:boolean;
  recommendations:V8Recommendation[];
}

export interface V8StayOffer extends AffiliateOffer {
  city?:string|null;
  address?:string|null;
  distanceKm?:number|null;
}

export interface V8StayResponse {
  version:8;
  slug:string;
  startDate:string;
  endDate:string;
  offers:V8StayOffer[];
  availabilityMeaning:"feed-validity-overlap-not-live-room-inventory";
}
