import type { Metadata } from "next";
import { V34EscapeFunnel } from "@/components/v34-escape-funnel";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:{absolute:"AI Travel Escape | Discover the Trip You Actually Need"},description:"Start with how you want the trip to feel. AI builds your Escape DNA, suggests dates, semantically matches destinations and only then builds the full trip.",alternates:{canonical:"/en",languages:{"el-GR":"/","en-GB":"/en"}}};

export default function EnglishHomePage(){
 return <V34EscapeFunnel lang="en"/>;
}
