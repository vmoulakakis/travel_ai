import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#173f33",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: {
    default: "TravelAI | AI Travel Planner για Ελλάδα",
    template: "%s · TravelAI",
  },
  description:
    "AI travel planner για την Ελλάδα με dates, weather, seasonality, demand, πραγματικές διαμονές, local life και προσωπικό 360° itinerary.",
  applicationName: "TravelAI",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TravelAI" },
  authors: [{ name: SITE_NAME, url: resolvedSiteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "travel",
  alternates: {
    canonical: "/",
    languages: { "el-GR": "/", "en-GB": "/en", "x-default": "/" },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "TravelAI | AI Travel Planner για Ελλάδα",
    description:
      "Dates + weather + seasonality + demand + stays + local life → μία πιο καθαρή ταξιδιωτική απόφαση.",
    type: "website",
    locale: "el_GR",
    alternateLocale: ["en_GB"],
    siteName: "TravelAI",
    url: "/",
    images: [
      {
        url: "/api/og?name=TravelAI",
        width: 1200,
        height: 630,
        alt: "TravelAI — AI travel planner για διακοπές στην Ελλάδα",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TravelAI | AI Travel Planner για Ελλάδα",
    description:
      "AI travel planning με dates, weather, seasonality, demand, stays και local life.",
    images: ["/api/og?name=TravelAI"],
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${resolvedSiteUrl}/#organization`,
        name: "TravelAI",
        alternateName: "TravelAI Greece",
        url: resolvedSiteUrl,
        logo: `${resolvedSiteUrl}/icon.svg`,
      },
      {
        "@type": "WebSite",
        "@id": `${resolvedSiteUrl}/#website`,
        name: "TravelAI",
        alternateName: "TravelAI Greece",
        url: resolvedSiteUrl,
        inLanguage: ["el-GR", "en-GB"],
        publisher: { "@id": `${resolvedSiteUrl}/#organization` },
      },
    ],
  };

  return (
    <html lang="el">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
        />
      </body>
    </html>
  );
}
