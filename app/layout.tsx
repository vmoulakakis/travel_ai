import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./v5.css";
import "./research.css";
import "./weather.css";
import "./v8.css";

const resolvedSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? "https://travel-ai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: { default: "Travel Guru — AI destination matching", template: "%s · Travel Guru" },
  description: "Travel Guru matches your intent, dates, season, travel effort, budget band and weather against an independent destination knowledge graph. Hotel offers appear only after you choose a destination.",
  alternates: { canonical: "/", languages: { "el-GR": "/", "en-GB": "/" } },
  robots: { index: true, follow: true },
  openGraph: { title: "Travel Guru — πού αξίζει πραγματικά να πας", description: "Intent → destination knowledge → season → effort → weather → five distinct trip matches.", type: "website", locale: "el_GR", siteName: "Travel Guru" },
  twitter: { card: "summary_large_image", title: "Travel Guru — destination-first travel AI", description: "Five destination matches chosen before hotel inventory enters the decision." }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="el"><body>{children}</body></html>; }
