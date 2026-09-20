import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TravelAI — AI Travel Agent",
    short_name: "TravelAI",
    description: "Season-aware, spatial-aware and demand-aware AI travel agent with live stays.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7f5",
    theme_color: "#173f33",
    orientation: "portrait",
    categories: ["travel","lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ],
    shortcuts: [
      { name: "Ask TravelAI", short_name: "Ask", url: "/?mode=agent", icons: [{src:"/icon.svg",sizes:"any",type:"image/svg+xml"}] },
      { name: "Explore", short_name: "Explore", url: "/#results", icons: [{src:"/icon.svg",sizes:"any",type:"image/svg+xml"}] }
    ]
  };
}
