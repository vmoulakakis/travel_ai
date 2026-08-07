import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const resolvedSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? "https://travel-ai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: { default: "Travel AI — 3 trips chosen for you", template: "%s · Travel AI" },
  description: "Travel decision intelligence for short escapes: dates, budget, season and intent become exactly three realistic trip options.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Travel AI — 3 trips chosen for you",
    description: "Decide where you can realistically go, then make the trip happen.",
    type: "website",
    locale: "en_GB",
    siteName: "Travel AI"
  },
  twitter: { card: "summary_large_image", title: "Travel AI — 3 trips chosen for you", description: "Decision before booking." }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
