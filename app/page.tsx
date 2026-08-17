import { AiGreeceHomeV28 } from "@/components/ai-greece-home-v28";
import { V28AiConciergeBridge } from "@/components/v28-ai-concierge-bridge";
import { TravelDecisionExperience } from "@/components/travel-decision-experience";
import { PostStayTripBuilderV25 } from "@/components/post-stay-trip-builder-v25";
import { getWeeklyPick } from "@/lib/decision/weekly-pick";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const weeklyPick = await getWeeklyPick();
  return <>
    <AiGreeceHomeV28 weeklyPick={weeklyPick} initialLang="el" />
    <V28AiConciergeBridge initialLang="el" />
    <TravelDecisionExperience weeklyPick={weeklyPick} />
    <PostStayTripBuilderV25 />
  </>;
}
