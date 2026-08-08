import type { GuruScoreBreakdown } from "@/lib/decision/types";

const unit=(value:number|undefined,fallback=.5)=>Math.max(0,Math.min(1,Number.isFinite(value)?(value as number)/100:fallback));

export function pairFeaturesFromBreakdown(breakdown:Partial<GuruScoreBreakdown>, learning=.5, profileConfidence=.6):number[]{
  return [
    unit(breakdown.semantic),
    unit(breakdown.weather),
    unit(breakdown.seasonality),
    unit(breakdown.value),
    unit(breakdown.demand),
    unit(breakdown.effort),
    unit(breakdown.supply),
    unit(breakdown.luxury),
    unit(breakdown.stayFit),
    Math.max(0,Math.min(1,learning)),
    Math.max(0,Math.min(1,profileConfidence)),
    unit(breakdown.intent)
  ].map(x=>Number(x.toFixed(5)));
}
