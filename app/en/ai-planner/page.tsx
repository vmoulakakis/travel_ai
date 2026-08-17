import type { Metadata } from "next";
import { V31AiPlannerClient } from "@/components/v31-ai-planner-client";
import { V31PageFrame } from "@/components/v31-site-shell";

export const metadata:Metadata={title:"AI Greece Travel Planner | AI Greece Travel",description:"Give the AI your city, season, budget, travellers and preferences. The engine locks geography first, then compares Greek destinations using evidence-first ranking.",alternates:{canonical:"/en/ai-planner",languages:{"el-GR":"/ai-planner","en-GB":"/en/ai-planner"}}};

export default function EnglishAiPlannerPage(){return <V31PageFrame lang="en"><section className="wf-section wf-section--tight wf-planner-hero"><div className="wf-shell"><span className="wf-kicker">AI DECISION PLANNER</span><h1 className="wf-h2">No more generic suggestions. Describe the real trip.</h1><p className="wf-lead">The planner locks the correct geography first, then compares season, access, budget, stay evidence and what you actually asked for.</p></div></section><V31AiPlannerClient lang="en"/></V31PageFrame>}
