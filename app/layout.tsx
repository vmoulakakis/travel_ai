import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./v5.css";

const resolvedSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? "https://travel-ai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: { default: "Travel Guru — AI επιλογές ταξιδιού από live affiliate inventory", template: "%s · Travel Guru" },
  description: "Bilingual AI travel decision experience. Guided preferences become five distinct feed-backed destination choices, then ten hotel offers before the final tracked affiliate link.",
  alternates: { canonical: "/", languages: { "el-GR": "/", "en-GB": "/" } },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Travel Guru — λιγότερο ψάξιμο, καλύτερο ταξίδι",
    description: "Live affiliate facts → intelligent ranking → five distinct choices → ten stays → final tracked link.",
    type: "website",
    locale: "el_GR",
    siteName: "Travel Guru"
  },
  twitter: { card: "summary_large_image", title: "Travel Guru — AI travel guide", description: "Five distinct feed-backed travel choices with a guided bilingual AI experience." }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="el"><body>{children}</body></html>;
}
