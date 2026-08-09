import { TravelDecisionExperience } from "@/components/travel-decision-experience";
import { getWeeklyPick } from "@/lib/decision/weekly-pick";

export const dynamic="force-dynamic";

export default async function HomePage() {
  const weeklyPick=await getWeeklyPick();
  return <TravelDecisionExperience weeklyPick={weeklyPick} />;
}
