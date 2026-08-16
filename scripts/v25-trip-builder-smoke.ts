import assert from "node:assert/strict";
import { estimateBeyondHotelBudgetV25 } from "../lib/decision/trip-budget-v25";
import { sameWeekdayFlexibleWindowsV25 } from "../lib/trip-builder/build-v25";
import { parseTripRequest,type TripRequest } from "../lib/validation/trip";

const oneNight={origin:"Athens",startDate:"2026-09-18",endDate:"2026-09-19",month:"september",nights:1,budget:500,moods:["food"],travelerType:"couple",language:"el",distancePreference:"easy-hop",pace:"balanced",hotelStyle:"boutique",avoid:"none",entryMode:"unknown",groupSize:2,desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",dateFlexibility:"fixed",transportMode:"any",stayLocationPreference:"balanced"} satisfies TripRequest;
const parsed=parseTripRequest(oneNight);assert.equal(parsed.success,true,"one-night trips must be accepted");if(parsed.success)assert.equal(parsed.data.nights,1);
const windows=sameWeekdayFlexibleWindowsV25("2026-09-18","2026-09-22");assert.ok(windows.length>=3);const startDay=new Date("2026-09-18T00:00:00Z").getUTCDay(),endDay=new Date("2026-09-22T00:00:00Z").getUTCDay();for(const window of windows){assert.equal(new Date(`${window.startDate}T00:00:00Z`).getUTCDay(),startDay,"check-in weekday must never change");assert.equal(new Date(`${window.endDate}T00:00:00Z`).getUTCDay(),endDay,"check-out weekday must never change");assert.equal(window.shiftDays%7,0,"flexibility must move only in whole weeks")}
const budget=estimateBeyondHotelBudgetV25({...oneNight,nights:1},2);assert.ok(budget.totalLow===budget.foodLow+budget.drinksNightlifeLow+budget.attractionsLow+budget.localTransportLow);assert.ok(budget.totalHigh===budget.foodHigh+budget.drinksNightlifeHigh+budget.attractionsHigh+budget.localTransportHigh);assert.ok(budget.totalHigh>budget.totalLow);
console.log("V25 post-stay Trip Builder: PASS");
