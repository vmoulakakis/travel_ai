import type { Metadata } from "next";
import { AiDestinationMapV30 } from "@/components/ai-destination-map-v30";
import "./ai-map-v30.css";

export const metadata:Metadata={title:"AI Χάρτης Προορισμών Ελλάδας | AI Greece Travel",description:"Ημερήσιος AI χάρτης προορισμών Ελλάδας με εποχικότητα, verified stay inventory και trusted review evidence από Tripadvisor και Booking.com όταν είναι διαθέσιμο.",alternates:{canonical:"/ai-map",languages:{"el-GR":"/ai-map","en-GB":"/en/ai-map"}}};

export default function AiMapPage(){return <AiDestinationMapV30 lang="el"/>}
