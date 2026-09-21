import type { Metadata } from "next";
import { V66MobileAgent } from "@/components/v66-mobile-agent";

export const dynamic="force-dynamic";
export const metadata:Metadata={
  title:{absolute:"TravelAI | Ο AI travel agent που βρίσκει τι αξίζει τώρα"},
  description:"Mobile-first AI travel agent με εποχικότητα, spatial awareness, demand intelligence και live stays. Λιγότερο ψάξιμο, τρεις ουσιαστικές επιλογές.",
  alternates:{canonical:"/",languages:{"el-GR":"/","en-GB":"/en"}},
  openGraph:{
    title:"TravelAI | AI narrows the noise",
    description:"Season-aware, spatial-aware, demand-aware travel intelligence in a simple mobile-first experience.",
    type:"website"
  }
};

export default function HomePage(){
 return <V66MobileAgent/>;
}
