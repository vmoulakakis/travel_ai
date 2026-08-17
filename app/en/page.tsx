import type { Metadata } from "next";
import { AiGreeceHomeV28 } from "@/components/ai-greece-home-v28";
import { V28AiConciergeBridge } from "@/components/v28-ai-concierge-bridge";
import { V28DecisionFunnelClient } from "@/components/v28-decision-funnel-client";
import { V28LanguageBootstrap } from "@/components/v28-language-bootstrap";
import { V28TravelIntelligence } from "@/components/v28-travel-intelligence";
import { PostStayTripBuilderV25 } from "@/components/post-stay-trip-builder-v25";
import { getWeeklyPick } from "@/lib/decision/weekly-pick";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Greece Travel Planner & Vacation Ideas | AI Greece Travel" },
  description: "Plan a Greece vacation with an AI travel advisor that compares Greek islands and mainland destinations by season, budget, travel effort and traveller fit before showing stays.",
  alternates: { canonical: "/en", languages: { "el-GR": "/", "en-GB": "/en" } },
  openGraph: {
    title: "Greece Travel Planner & Vacation Ideas",
    description: "Find the Greek destination that fits your dates, budget, pace and travel style before choosing a hotel.",
    type: "website",
    locale: "en_GB",
    alternateLocale: ["el_GR"],
    siteName: "AI Greece Travel",
    images: [{ url: "/api/og?name=Greece%20Travel%20Planner", width: 1200, height: 630, alt: "Greece travel planner" }],
  },
  twitter: { card: "summary_large_image", title: "Greece Travel Planner | AI Greece Travel", description: "AI destination matching for Greek islands and mainland Greece.", images: ["/api/og?name=Greece%20Travel%20Planner"] },
};

export default async function EnglishHomePage() {
  const weeklyPick = await getWeeklyPick();
  return <div lang="en">
    <AiGreeceHomeV28 weeklyPick={weeklyPick} initialLang="en" />
    <V28TravelIntelligence lang="en" />
    <V28AiConciergeBridge initialLang="en" />
    <V28LanguageBootstrap lang="en" />
    <V28DecisionFunnelClient weeklyPick={weeklyPick} />
    <PostStayTripBuilderV25 />
  </div>;
}
