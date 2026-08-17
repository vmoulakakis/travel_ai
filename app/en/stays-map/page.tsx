import type { Metadata } from "next";
import { StayProductMapV32 } from "@/components/stay-product-map-v32";
import { V31PageFrame } from "@/components/v31-site-shell";

export const metadata:Metadata={title:"Greece Stay Map | Live Travel Offers | AI Greece Travel",description:"Interactive map of real Greece accommodation products and travel offers with price markers, filters and partner booking links.",alternates:{canonical:"/en/stays-map",languages:{"el-GR":"/stays-map","en-GB":"/en/stays-map"}}};
export default function EnglishStaysMapPage(){return <V31PageFrame lang="en"><StayProductMapV32 lang="en"/></V31PageFrame>}
