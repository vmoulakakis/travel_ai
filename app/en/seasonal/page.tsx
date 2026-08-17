import type { Metadata } from "next";
import { V31EditorialPage } from "@/components/v31-editorial-page";
export const metadata:Metadata={title:"Greece by Season | AI Greece Travel",description:"Seasonal Greece destination guidance based on month, crowds, access and real travel fit.",alternates:{canonical:"/en/seasonal",languages:{"el-GR":"/seasonal","en-GB":"/en/seasonal"}}};
export default function SeasonalPage(){return <V31EditorialPage kind="seasonal" lang="en"/>}
