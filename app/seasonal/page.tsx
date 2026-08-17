import type { Metadata } from "next";
import { V31EditorialPage } from "@/components/v31-editorial-page";
export const metadata:Metadata={title:"Διακοπές στην Ελλάδα ανά Εποχή | AI Greece Travel",description:"Εποχική επιλογή ελληνικών προορισμών με βάση μήνα, crowds, πρόσβαση, και πραγματικό travel fit.",alternates:{canonical:"/seasonal",languages:{"el-GR":"/seasonal","en-GB":"/en/seasonal"}}};
export default function SeasonalPage(){return <V31EditorialPage kind="seasonal" lang="el"/>}
