import type { Metadata } from "next";
import { V33EscapeFunnel } from "@/components/v33-escape-funnel";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:{absolute:"AI Holiday Solver | Travel Escape Planner"},description:"Choose when you can travel and what you need from the break. AI narrows the world to three destination matches, then builds a verified 360° escape.",alternates:{canonical:"/en",languages:{"el-GR":"/","en-GB":"/en"}}};

export default function EnglishHomePage(){
 return <V33EscapeFunnel lang="en"/>;
}
