export type Month = "september" | "october" | "november" | "flexible";
export type Mood = "relax" | "romantic" | "food" | "warmth" | "city" | "nature" | "adventure" | "culture";
export type TravelerType = "solo" | "couple" | "family" | "friends";
export type Refinement = "cheaper" | "warmer" | "closer" | "shorter" | "romantic" | "adventurous";
export type Language = "el" | "en";
export type DistancePreference = "nearby" | "easy-hop" | "island" | "any";
export type PacePreference = "slow" | "balanced" | "full";
export type HotelStyle = "luxury" | "boutique" | "resort" | "value" | "any";
export type Avoidance = "long-travel" | "high-cost" | "crowds" | "none";

export interface TripRequest {
  origin: string;
  month: Month;
  nights: number;
  budget: number;
  moods: Mood[];
  travelerType: TravelerType;
  language?: Language;
  distancePreference?: DistancePreference;
  pace?: PacePreference;
  hotelStyle?: HotelStyle;
  avoid?: Avoidance;
  refinement?: Refinement;
}

const months = new Set<Month>(["september", "october", "november", "flexible"]);
const moods = new Set<Mood>(["relax", "romantic", "food", "warmth", "city", "nature", "adventure", "culture"]);
const travelers = new Set<TravelerType>(["solo", "couple", "family", "friends"]);
const refinements = new Set<Refinement>(["cheaper", "warmer", "closer", "shorter", "romantic", "adventurous"]);
const languages = new Set<Language>(["el", "en"]);
const distances = new Set<DistancePreference>(["nearby", "easy-hop", "island", "any"]);
const paces = new Set<PacePreference>(["slow", "balanced", "full"]);
const hotelStyles = new Set<HotelStyle>(["luxury", "boutique", "resort", "value", "any"]);
const avoidances = new Set<Avoidance>(["long-travel", "high-cost", "crowds", "none"]);

export function parseTripRequest(input: unknown): { success: true; data: TripRequest } | { success: false; errors: string[] } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { success: false, errors: ["Request must be an object"] };
  const value = input as Record<string, unknown>;
  const errors: string[] = [];
  const origin = typeof value.origin === "string" ? value.origin.trim() : "";
  const month = value.month as Month;
  const nights = Number(value.nights);
  const budget = Number(value.budget);
  const rawMoods = Array.isArray(value.moods) ? value.moods : [];
  const travelerType = value.travelerType as TravelerType;
  const language = (value.language ?? "el") as Language;
  const distancePreference = (value.distancePreference ?? "any") as DistancePreference;
  const pace = (value.pace ?? "balanced") as PacePreference;
  const hotelStyle = (value.hotelStyle ?? "any") as HotelStyle;
  const avoid = (value.avoid ?? "none") as Avoidance;
  const refinement = value.refinement as Refinement | undefined;

  if (origin.length < 2 || origin.length > 80) errors.push("origin must be 2-80 characters");
  if (!months.has(month)) errors.push("invalid month");
  if (!Number.isInteger(nights) || nights < 2 || nights > 14) errors.push("nights must be an integer between 2 and 14");
  if (!Number.isFinite(budget) || budget < 150 || budget > 5000) errors.push("budget must be between 150 and 5000");
  const parsedMoods = rawMoods.filter((m): m is Mood => typeof m === "string" && moods.has(m as Mood));
  if (parsedMoods.length < 1 || parsedMoods.length > 3 || parsedMoods.length !== rawMoods.length) errors.push("moods must contain 1-3 valid values");
  if (!travelers.has(travelerType)) errors.push("invalid travelerType");
  if (!languages.has(language)) errors.push("invalid language");
  if (!distances.has(distancePreference)) errors.push("invalid distancePreference");
  if (!paces.has(pace)) errors.push("invalid pace");
  if (!hotelStyles.has(hotelStyle)) errors.push("invalid hotelStyle");
  if (!avoidances.has(avoid)) errors.push("invalid avoid");
  if (refinement !== undefined && !refinements.has(refinement)) errors.push("invalid refinement");

  if (errors.length) return { success: false, errors };
  return {
    success: true,
    data: {
      origin, month, nights, budget, moods: parsedMoods, travelerType,
      language, distancePreference, pace, hotelStyle, avoid,
      ...(refinement ? { refinement } : {})
    }
  };
}
