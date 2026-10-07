import type { Metadata } from "next";
import { V61TravelOSPreview } from "@/components/v61-travel-os-preview";

export const metadata: Metadata = {
  title: "TravelAI V61 Preview | Agentic Travel OS",
  description: "Preview of the TravelAI Greece agentic decision engine, living map and calendar-aware travel intelligence."
};

export default function V61PreviewPage() {
  return <V61TravelOSPreview />;
}