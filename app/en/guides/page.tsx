import type { Metadata } from "next";
import { V31EditorialPage } from "@/components/v31-editorial-page";
export const metadata:Metadata={title:"Greece Travel Decision Guides | AI Greece Travel",description:"Decision-first guides for Greek islands and mainland destinations: duration, access, budget, crowds and travel fit.",alternates:{canonical:"/en/guides",languages:{"el-GR":"/guides","en-GB":"/en/guides"}}};
export default function GuidesPage(){return <V31EditorialPage kind="guides" lang="en"/>}
