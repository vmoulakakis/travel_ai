import type { WeatherEvidence, AffiliateOffer, Confidence } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";
import type { SmartDateWindow } from "@/lib/decision/date-windows-v9";
import type { TravelCouncilDecision } from "@/lib/ai/travel-council-v9";
import type { ContinuityEnvelope } from "@/lib/continuity";

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

export type V8ExplorationRole =
  | "BEST_FIT"
  | "EASIEST"
  | "QUIETER"
  | "SMART_VALUE"
  | "GEOGRAPHY_CONTRAST"
  | "BEST_SEASON"
  | "NATURE_AND_SEA"
  | "CITY_AND_SEA"
  | "HIDDEN_GEM"
  | "DIFFERENT_RHYTHM"
  | "WILDCARD"
  | "ALTERNATIVE";

export interface V8Recommendation {
  slug:string;
  destination:string;
  destinationEn:string;
  country:string;
  countryCode:string;
  regionGroup:string;
  role:string;
  explorationRole:V8ExplorationRole;
  explorationReason:string;
  score:number;
  fitStatus:"strong"|"good"|"compromise";
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
  dateWindows?:SmartDateWindow[];
}

export interface V8RecommendationResponse {
  version:8|9;
  experienceVersion?:9;
  request:TripRequest;
  generatedAt:string;
  source:"verified-travel-knowledge";
  intent:V8IntentProfile;
  catalogSize:number;
  eligibleCount?:number;
  explorationCount?:number;
  mode:"guided";
  resultCount:number;
  profileSummary:string;
  feasibility:"STRONG"|"MIXED"|"COMPROMISE";
  council?:TravelCouncilDecision;
  continuity?:ContinuityEnvelope;
  recommendations:V8Recommendation[];
}

export interface V8StayOffer extends AffiliateOffer {
  city?:string|null;
  address?:string|null;
  distanceKm?:number|null;
  latitude?:number|null;
  longitude?:number|null;
}

export interface V8StayResponse {
  version:8|9;
  slug:string;
  startDate:string;
  endDate:string;
  offers:V8StayOffer[];
  availabilityMeaning:"full-trip-validity-confirm-before-booking";
}
