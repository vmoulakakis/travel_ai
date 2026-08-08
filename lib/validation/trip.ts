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
  origin:string;
  startDate:string;
  endDate:string;
  /** Legacy derived field retained while older APIs migrate from month to exact range. */
  month:Month;
  nights:number;
  budget:number;
  moods:Mood[];
  travelerType:TravelerType;
  language?:Language;
  distancePreference?:DistancePreference;
  pace?:PacePreference;
  hotelStyle?:HotelStyle;
  avoid?:Avoidance;
  refinement?:Refinement;
  /** Optional natural-language intent. V8 interprets it semantically; it is never used as destination evidence. */
  tripText?:string;
}

const months=new Set<Month>(["september","october","november","flexible"]);
const moods=new Set<Mood>(["relax","romantic","food","warmth","city","nature","adventure","culture"]);
const travelers=new Set<TravelerType>(["solo","couple","family","friends"]);
const refinements=new Set<Refinement>(["cheaper","warmer","closer","shorter","romantic","adventurous"]);
const languages=new Set<Language>(["el","en"]),distances=new Set<DistancePreference>(["nearby","easy-hop","island","any"]),paces=new Set<PacePreference>(["slow","balanced","full"]),hotelStyles=new Set<HotelStyle>(["luxury","boutique","resort","value","any"]),avoidances=new Set<Avoidance>(["long-travel","high-cost","crowds","none"]);
const isoDate=/^\d{4}-\d{2}-\d{2}$/;
function validDate(value:unknown):value is string{if(typeof value!=="string"||!isoDate.test(value))return false;return Number.isFinite(Date.parse(`${value}T00:00:00Z`))}
function derivedMonth(startDate:string):Month{const month=Number(startDate.slice(5,7));return month===9?"september":month===10?"october":month===11?"november":"flexible"}
function legacyDateRange(month:Month,nights:number){const year=2026,m=month==="september"?9:month==="november"?11:10,start=new Date(Date.UTC(year,m-1,16)),end=new Date(start.getTime()+Math.max(2,nights)*86400000),iso=(d:Date)=>d.toISOString().slice(0,10);return{startDate:iso(start),endDate:iso(end)}}

export function parseTripRequest(input:unknown):{success:true;data:TripRequest}|{success:false;errors:string[]}{
  if(!input||typeof input!=="object"||Array.isArray(input))return{success:false,errors:["Request must be an object"]};
  const value=input as Record<string,unknown>,errors:string[]=[];
  const origin=typeof value.origin==="string"?value.origin.trim():"",rawMonth=value.month as Month,legacyMonth=months.has(rawMonth)?rawMonth:"october",requestedNights=Number(value.nights),legacy=legacyDateRange(legacyMonth,Number.isFinite(requestedNights)?requestedNights:3),startDate=validDate(value.startDate)?value.startDate:legacy.startDate,endDate=validDate(value.endDate)?value.endDate:legacy.endDate,startMs=Date.parse(`${startDate}T00:00:00Z`),endMs=Date.parse(`${endDate}T00:00:00Z`),nights=Math.round((endMs-startMs)/86400000),month=derivedMonth(startDate),budget=Number(value.budget),rawMoods=Array.isArray(value.moods)?value.moods:[],travelerType=value.travelerType as TravelerType,language=(value.language??"el") as Language,distancePreference=(value.distancePreference??"any") as DistancePreference,pace=(value.pace??"balanced") as PacePreference,hotelStyle=(value.hotelStyle??"any") as HotelStyle,avoid=(value.avoid??"none") as Avoidance,refinement=value.refinement as Refinement|undefined,tripText=typeof value.tripText==="string"?value.tripText.trim().replace(/\s+/g," "):"";
  if(origin.length<2||origin.length>80)errors.push("origin must be 2-80 characters");
  if(!validDate(startDate)||!validDate(endDate))errors.push("startDate and endDate must be ISO dates");
  if(!(endMs>startMs))errors.push("endDate must be after startDate");
  if(!Number.isInteger(nights)||nights<2||nights>14)errors.push("date range must be between 2 and 14 nights");
  if(!Number.isFinite(budget)||budget<150||budget>5000)errors.push("budget must be between 150 and 5000");
  const parsedMoods=rawMoods.filter((m):m is Mood=>typeof m==="string"&&moods.has(m as Mood));
  if(parsedMoods.length<1||parsedMoods.length>3||parsedMoods.length!==rawMoods.length)errors.push("moods must contain 1-3 valid values");
  if(!travelers.has(travelerType))errors.push("invalid travelerType");if(!languages.has(language))errors.push("invalid language");if(!distances.has(distancePreference))errors.push("invalid distancePreference");if(!paces.has(pace))errors.push("invalid pace");if(!hotelStyles.has(hotelStyle))errors.push("invalid hotelStyle");if(!avoidances.has(avoid))errors.push("invalid avoid");if(refinement!==undefined&&!refinements.has(refinement))errors.push("invalid refinement");if(tripText.length>320)errors.push("tripText must be <= 320 characters");
  if(errors.length)return{success:false,errors};
  return{success:true,data:{origin,startDate,endDate,month,nights,budget,moods:parsedMoods,travelerType,language,distancePreference,pace,hotelStyle,avoid,...(refinement?{refinement}:{}),...(tripText?{tripText}:{})}};
}
