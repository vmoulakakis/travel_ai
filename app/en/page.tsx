import type { Metadata } from "next";
import { V40DiscoveryExperience } from "@/components/v40-discovery-experience";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:{absolute:"AI Travel Escape | Decide Less. Experience More."},description:"Talk to a travel agent that learns what you need, then compare real destination and stay options before building a sourced 360° itinerary.",alternates:{canonical:"/en",languages:{"el-GR":"/","en-GB":"/en"}}};

export default function EnglishHomePage(){
 return <V40DiscoveryExperience lang="en"/>;
}
