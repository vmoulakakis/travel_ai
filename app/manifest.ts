import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TravelAI — AI Escape Intelligence",
    short_name: "TravelAI",
    description: "AI travel planner with live stays, interactive map and unified booking funnel.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f5",
    theme_color: "#173f33",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}
