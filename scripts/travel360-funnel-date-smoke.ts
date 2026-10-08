import assert from "node:assert/strict";
import {offerAlternativeDates} from "../lib/decision/travel-date-choice-v360";
const primary={start:"2026-10-23",end:"2026-10-26",flexible:false,source:"user" as const};
const alternative={start:"2026-10-28",end:"2026-10-31",flexible:true,source:"suggested" as const};
assert.equal(offerAlternativeDates(primary,alternative,true).alternative,null,"fixed holidays cannot be shifted");
assert.equal(offerAlternativeDates({...primary,flexible:true},alternative,false).alternative,null,"cannot invent weather-driven change");
assert.equal(offerAlternativeDates({...primary,flexible:true},alternative,true).alternative?.start,"2026-10-28");
console.log("TRAVEL360_DATE_CONSENT_SMOKE_OK");
