import type { Metadata } from "next";
import { MapIntelligenceLab } from "@/components/map-intelligence-lab";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TravelAI Map Intelligence Lab",
  description: "Experimental TravelAI 360° spatial decision interface."
};

export default function MapLabPage() {
  return <MapIntelligenceLab />;
}
