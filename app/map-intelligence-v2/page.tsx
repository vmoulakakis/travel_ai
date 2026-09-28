import type {Metadata} from "next";
import {MapIntelligenceV2} from "@/components/map-intelligence-v2";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:{absolute:"TravelAI | Map Intelligence v2 Preview"},
 description:"Experimental TravelAI map-first decision intelligence with personal match, seasonality, reputation and spatial awareness.",
 robots:{index:false,follow:false}
};

export default function MapIntelligenceV2Page(){
 return <MapIntelligenceV2/>;
}
