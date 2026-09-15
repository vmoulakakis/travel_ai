import type { Metadata } from "next";
import { V38EscapeFunnel } from "@/components/v38-escape-funnel";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:{absolute:"AI Travel Escape | Decide Less. Experience More."},description:"Tell the AI what you need to feel, choose a useful travel window and budget, then get real stay-backed escapes and a sourced 360° destination experience.",alternates:{canonical:"/en",languages:{"el-GR":"/","en-GB":"/en"}}};

export default function EnglishHomePage(){
 return <V38EscapeFunnel lang="en"/>;
}
