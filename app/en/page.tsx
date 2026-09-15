import type { Metadata } from "next";
import { V36EscapeFunnel } from "@/components/v36-escape-funnel";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:{absolute:"AI Travel Escape | Real Trips Backed by Real Stays"},description:"Start with how you need to feel. The AI reasons forward from your travel need and backward from real stay inventory, then explains up to 10 stay-backed solutions.",alternates:{canonical:"/en",languages:{"el-GR":"/","en-GB":"/en"}}};

export default function EnglishHomePage(){
 return <V36EscapeFunnel lang="en"/>;
}
