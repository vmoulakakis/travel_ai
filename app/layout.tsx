import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const resolvedSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? "https://travel-ai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: { default: "Travel Guru — 3 affiliate-backed escapes chosen for you", template: "%s · Travel Guru" },
  description: "An AI travel decision agent that reads the live affiliate inventory, filters it to your dates, budget and intent, and returns exactly three feed-backed places with tracked stay offers.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Travel Guru — Tell me the escape. I’ll find the three.",
    description: "Exactly three travel recommendations, chosen from the current Linkwise feed only.",
    type: "website",
    locale: "en_GB",
    siteName: "Travel Guru"
  },
  twitter: { card: "summary_large_image", title: "Travel Guru — 3 feed-backed picks", description: "JSON facts → deterministic shortlist → AI judgement → exact tracked links." }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
