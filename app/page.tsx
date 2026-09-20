import type { Metadata } from "next";
import { V67FourStepFunnel } from "@/components/v67-four-step-funnel";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:{absolute:"TravelAI | 4-step AI travel funnel"},
 description:"AI επιλογή από όλο το live inventory με ημερομηνίες, seasonality, weather, demand, spatial intelligence και ένα 360° itinerary.",
 alternates:{canonical:"/",languages:{"el-GR":"/","en-GB":"/en"}},
 openGraph:{title:"TravelAI | One intelligent choice",description:"Map + filters → weather → local life → 360° Escape Book.",type:"website"}
};
export default function HomePage(){return <V67FourStepFunnel/>}
