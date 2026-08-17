"use client";

import dynamic from "next/dynamic";
import type { WeeklyPick } from "@/lib/decision/weekly-pick";

const TravelDecisionExperience = dynamic<{ weeklyPick: WeeklyPick | null }>(
  () => import("@/components/travel-decision-experience").then(module => module.TravelDecisionExperience),
  { ssr: false, loading: () => null },
);

export function V28DecisionFunnelClient({ weeklyPick }: { weeklyPick: WeeklyPick | null }) {
  return <TravelDecisionExperience weeklyPick={weeklyPick} />;
}
