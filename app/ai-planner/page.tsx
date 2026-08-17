import type { Metadata } from "next";
import { V31AiPlannerClient } from "@/components/v31-ai-planner-client";
import { V31PageFrame } from "@/components/v31-site-shell";

export const metadata:Metadata={title:"AI Σύμβουλος Διακοπών Ελλάδας | AI Greece Travel",description:"Δώσε πόλη, εποχή, budget, παρέα και προτιμήσεις. Ο AI travel engine περιορίζει σωστά τη γεωγραφία και συγκρίνει ελληνικούς προορισμούς με evidence-first ranking.",alternates:{canonical:"/ai-planner",languages:{"el-GR":"/ai-planner","en-GB":"/en/ai-planner"}}};

export default function AiPlannerPage(){return <V31PageFrame lang="el"><section className="wf-section wf-section--tight wf-planner-hero"><div className="wf-shell"><span className="wf-kicker">AI DECISION PLANNER</span><h1 className="wf-h2">Όχι άλλες γενικές προτάσεις. Πες μου το πραγματικό ταξίδι.</h1><p className="wf-lead">Ο σύμβουλος περιορίζει πρώτα τη σωστή γεωγραφία και μετά συγκρίνει εποχή, πρόσβαση, budget, stay evidence και το τι πραγματικά ζητάς.</p></div></section><V31AiPlannerClient lang="el"/></V31PageFrame>}
