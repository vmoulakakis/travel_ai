import assert from "node:assert/strict";
import { equivalentDateCandidates,tripCalendarKind } from "../lib/decision/trip-calendar";
assert.equal(tripCalendarKind("2026-10-23","2026-10-25").kind,"weekend");
assert(equivalentDateCandidates("2026-10-23","2026-10-25").every(x=>new Date(`${x.startDate}T00:00:00Z`).getUTCDay()===5));
const holiday=tripCalendarKind("2026-10-27","2026-10-29");assert.equal(holiday.kind,"holiday");assert.equal(holiday.holiday,"oxi-day");
assert(equivalentDateCandidates("2026-10-27","2026-10-29").every(x=>tripCalendarKind(x.startDate,x.endDate).holiday==="oxi-day"));
console.log("STAY_AVAILABILITY_CALENDAR_OK");
