import type { Metadata } from "next";
import { AiGreeceHomeV28 } from "@/components/ai-greece-home-v28";
import { V28AiConciergeBridge } from "@/components/v28-ai-concierge-bridge";
import { V28DecisionFunnelClient } from "@/components/v28-decision-funnel-client";
import { V28LanguageBootstrap } from "@/components/v28-language-bootstrap";
import { PostStayTripBuilderV25 } from "@/components/post-stay-trip-builder-v25";
import { getWeeklyPick } from "@/lib/decision/weekly-pick";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "AI Greece Travel — Greece AI Trip Planner" },
  description: "An AI travel advisor for Greece that compares destinations by mood, dates, budget, travel effort and evidence before showing stays.",
  alternates: { canonical: "/en", languages: { "el-GR": "/", "en-GB": "/en" } },
};

export default async function EnglishHomePage() {
  const weeklyPick = await getWeeklyPick();
  return <>
    <AiGreeceHomeV28 weeklyPick={weeklyPick} initialLang="en" />
    <V28AiConciergeBridge initialLang="en" />
    <V28LanguageBootstrap lang="en" />
    <V28DecisionFunnelClient weeklyPick={weeklyPick} />
    <PostStayTripBuilderV25 />
  </>;
}
