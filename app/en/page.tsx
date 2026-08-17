import type { Metadata } from "next";
import { V31NativeHome } from "@/components/v31-native-home";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:{absolute:"Greece Travel Planner & Vacation Ideas | AI Greece Travel"},description:"Plan a Greece trip with an AI travel advisor that locks geography first and compares season, budget, access, pace and verified travel evidence.",alternates:{canonical:"/en",languages:{"el-GR":"/","en-GB":"/en"}}};
export default function EnglishHomePage(){return <V31NativeHome lang="en"/>}
