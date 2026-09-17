import type { Metadata } from "next";
import { V45HolidayFinder } from "@/components/v45-holiday-finder";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:{absolute:"AI Holiday Finder | Real offer-backed trips"},description:"Tell the AI Holiday Finder what kind of break you need. It checks real offer products, dates and traveler fit, then returns three explainable matches.",alternates:{canonical:"/en",languages:{"el-GR":"/","en-GB":"/en"}}};

export default function EnglishHomePage(){
 return <V45HolidayFinder lang="en"/>;
}
