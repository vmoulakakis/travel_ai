import { TravelDecisionExperience } from "@/components/travel-decision-experience";
import { PostStayTripBuilderV25 } from "@/components/post-stay-trip-builder-v25";
import { getWeeklyPick } from "@/lib/decision/weekly-pick";

export const dynamic="force-dynamic";

export default async function HomePage() {
  const weeklyPick=await getWeeklyPick();
  return <><TravelDecisionExperience weeklyPick={weeklyPick}/><PostStayTripBuilderV25/></>;
}
