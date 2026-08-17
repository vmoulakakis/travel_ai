import type { Metadata } from "next";
import { StayProductMapV32 } from "@/components/stay-product-map-v32";
import { V31PageFrame } from "@/components/v31-site-shell";

export const metadata:Metadata={title:"Χάρτης Διαμονών Ελλάδας | Live Offers | AI Greece Travel",description:"Διαδραστικός χάρτης πραγματικών καταλυμάτων και travel offers στην Ελλάδα, με markers τιμής, φίλτρα και ασφαλή μετάβαση στον συνεργάτη.",alternates:{canonical:"/stays-map",languages:{"el-GR":"/stays-map","en-GB":"/en/stays-map"}}};
export default function StaysMapPage(){return <V31PageFrame lang="el"><StayProductMapV32 lang="el"/></V31PageFrame>}
