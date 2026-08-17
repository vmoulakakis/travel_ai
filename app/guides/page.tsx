import type { Metadata } from "next";
import { V31EditorialPage } from "@/components/v31-editorial-page";
export const metadata:Metadata={title:"Οδηγοί Διακοπών Ελλάδας | AI Greece Travel",description:"Decision-first οδηγοί για ελληνικά νησιά και ηπειρωτικούς προορισμούς: διάρκεια, πρόσβαση, budget, crowds και travel fit.",alternates:{canonical:"/guides",languages:{"el-GR":"/guides","en-GB":"/en/guides"}}};
export default function GuidesPage(){return <V31EditorialPage kind="guides" lang="el"/>}
