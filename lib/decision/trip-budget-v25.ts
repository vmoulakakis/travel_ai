import type { ExtraBudgetV25 } from "@/lib/trip-builder/types-v25";
import type { TripRequest } from "@/lib/validation/trip";

const round5=(value:number)=>Math.round(value/5)*5;
const range=(low:number,high:number,people:number,days:number)=>({low:round5(low*people*days),high:round5(high*people*days)});

export function estimateBeyondHotelBudgetV25(trip:TripRequest,costTier:1|2|3|4|5):ExtraBudgetV25{
 const groupSize=Math.max(1,trip.groupSize??1),nights=Math.max(1,trip.nights),tripDays=nights+1;
 const foodDaily:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[24,42],[30,52],[38,65],[50,85],[65,115]];
 const drinkDaily:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[6,18],[8,22],[10,30],[14,40],[18,55]];
 const attractionDaily:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[3,10],[4,12],[5,15],[7,20],[9,28]];
 const transportDaily:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[3,10],[4,12],[5,15],[7,18],[9,24]];
 const idx=Math.max(0,Math.min(4,costTier-1)),food=range(...foodDaily[idx],groupSize,tripDays),socialDays=trip.socialPreference==="lively"?Math.max(1,nights):trip.socialPreference==="quiet"?Math.max(1,Math.ceil(nights*.35)):Math.max(1,Math.ceil(nights*.6)),drinks=range(drinkDaily[idx][0],drinkDaily[idx][1],groupSize,socialDays),attractions=range(...attractionDaily[idx],groupSize,tripDays),transport=range(...transportDaily[idx],groupSize,tripDays),totalLow=food.low+drinks.low+attractions.low+transport.low,totalHigh=food.high+drinks.high+attractions.high+transport.high;
 return{currency:"EUR",groupSize,nights,tripDays,foodLow:food.low,foodHigh:food.high,drinksNightlifeLow:drinks.low,drinksNightlifeHigh:drinks.high,attractionsLow:attractions.low,attractionsHigh:attractions.high,localTransportLow:transport.low,localTransportHigh:transport.high,totalLow,totalHigh,note:"Planning estimate excluding accommodation and intercity transport. It uses transparent destination cost-tier bands, group size, trip length and social rhythm; it is not a live menu-price quote."};
}
