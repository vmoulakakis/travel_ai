import type { Metadata } from "next";
import { AiDestinationMapV30 } from "@/components/ai-destination-map-v30";
import "../../ai-map/ai-map-v30.css";

export const metadata:Metadata={title:"AI Greece Destination Map | Daily Travel Ranking",description:"A daily AI map of Greece destinations using season fit, verified stay inventory and trusted Tripadvisor and Booking.com evidence when available.",alternates:{canonical:"/en/ai-map",languages:{"el-GR":"/ai-map","en-GB":"/en/ai-map"}}};

export default function EnglishAiMapPage(){return <AiDestinationMapV30 lang="en"/>}
