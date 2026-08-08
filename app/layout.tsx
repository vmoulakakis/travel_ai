import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./v5.css";
import "./research.css";
import "./weather.css";

const resolvedSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? "https://travel-ai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: { default: "Travel Guru — weather-first AI travel decisions", template: "%s · Travel Guru" },
  description: "Choose exact travel dates. Travel Guru screens live affiliate destinations by date overlap, weather, seasonality, effort and intent before DeepSeek selects five distinct choices.",
  alternates: { canonical: "/", languages: { "el-GR": "/", "en-GB": "/" } },
  robots: { index: true, follow: true },
  openGraph: { title: "Travel Guru — σωστός προορισμός για τις σωστές ημερομηνίες", description: "Exact dates → weather → seasonality → affiliate availability → five AI-ranked choices.", type: "website", locale: "el_GR", siteName: "Travel Guru" },
  twitter: { card: "summary_large_image", title: "Travel Guru — weather-first travel AI", description: "Five feed-backed destinations selected for your exact dates." }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="el"><body>{children}</body></html>; }
