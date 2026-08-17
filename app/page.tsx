import { AiGreeceHomeV28 } from "@/components/ai-greece-home-v28";
import { V28AiConciergeBridge } from "@/components/v28-ai-concierge-bridge";
import { V28DecisionFunnelClient } from "@/components/v28-decision-funnel-client";
import { PostStayTripBuilderV25 } from "@/components/post-stay-trip-builder-v25";
import { getWeeklyPick } from "@/lib/decision/weekly-pick";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const weeklyPick = await getWeeklyPick();
  return <>
    <AiGreeceHomeV28 weeklyPick={weeklyPick} initialLang="el" />
    <V28AiConciergeBridge initialLang="el" />
    <V28DecisionFunnelClient weeklyPick={weeklyPick} />
    <PostStayTripBuilderV25 />
  </>;
}
