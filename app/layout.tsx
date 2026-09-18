import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteUrl, SITE_NAME } from "@/lib/site";
import "./globals.css";
import "./v8.css";
import "./final.css";
import "./v28.css";
import "./v28-concierge.css";
import "./v28-production.css";
import "./v29-seo.css";
import "./v31-native.css";
import "./v32-product-map.css";
import "./v33-escape.css";
import "./v33-builder.css";
import "leaflet/dist/leaflet.css";

const resolvedSiteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: { default: "TravelAI | Ο AI agent που καταλαβαίνει την απόδραση που χρειάζεσαι", template: "%s · TravelAI" },
  description: "Μίλα φυσικά με έναν persistent AI travel agent που καταλαβαίνει την ανάγκη σου, ρωτά ό,τι λείπει και αποκαλύπτει έως 10 πραγματικές stay-backed λύσεις πάνω σε διαδραστικό χάρτη.",
  applicationName: "AI Travel Escape",
  authors: [{ name: SITE_NAME, url: resolvedSiteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "travel",
  alternates: { canonical: "/", languages: { "el-GR": "/", "en-GB": "/en" } },
  robots: { index: true, follow: true },
  openGraph: {
    title: "TravelAI — από το travel need σε 10 πραγματικές stay-backed λύσεις",
    description: "Persistent agentic travel intelligence: φυσική συνομιλία, πραγματικό inventory, Top‑10 λύσεις, interactive map και πλήρες trip build.",
    type: "website",
    locale: "el_GR",
    alternateLocale: ["en_GB"],
    siteName: "AI Travel Escape",
    images: [{ url: "/api/og?name=AI%20Travel%20Escape", width: 1200, height: 630, alt: "AI Travel Escape" }],
  },
  twitter: { card: "summary_large_image", title: "TravelAI", description: "AI travel agent που καταλαβαίνει τι χρειάζεσαι και βρίσκει έως 10 πραγματικές stay-backed λύσεις πάνω σε interactive map.", images: ["/api/og?name=TravelAI"] },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${resolvedSiteUrl}/#organization`, name: SITE_NAME, url: resolvedSiteUrl, logo: `${resolvedSiteUrl}/icon.svg` },
      { "@type": "WebSite", "@id": `${resolvedSiteUrl}/#website`, name: "AI Travel Escape", url: resolvedSiteUrl, inLanguage: ["el-GR", "en-GB"], publisher: { "@id": `${resolvedSiteUrl}/#organization` } },
    ],
  };
  return <html lang="el"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} /></body></html>;
}
