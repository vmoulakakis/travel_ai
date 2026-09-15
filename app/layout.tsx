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
  title: { default: "AI Holiday Solver | Βρες την απόδραση που πραγματικά χρειάζεσαι", template: "%s · AI Travel Escape" },
  description: "AI travel expert για weekend breaks και διακοπές: ξεκινά από το πώς θέλεις να νιώσεις, δημιουργεί το Escape DNA σου, προτείνει ημερομηνίες όταν χρειάζεται και βρίσκει 3 διαφορετικές αποδράσεις πριν χτίσει το 360° ταξίδι.",
  applicationName: "AI Travel Escape",
  authors: [{ name: SITE_NAME, url: resolvedSiteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "travel",
  alternates: { canonical: "/", languages: { "el-GR": "/", "en-GB": "/en" } },
  robots: { index: true, follow: true },
  openGraph: {
    title: "AI Travel Escape — πρώτα καταλαβαίνει εσένα, μετά βρίσκει πού να πας",
    description: "Από πραγματική ανάγκη και Escape DNA σε έξυπνα date windows, 3 semantic-matched escapes και 360° verified trip plan.",
    type: "website",
    locale: "el_GR",
    alternateLocale: ["en_GB"],
    siteName: "AI Travel Escape",
    images: [{ url: "/api/og?name=AI%20Travel%20Escape", width: 1200, height: 630, alt: "AI Travel Escape" }],
  },
  twitter: { card: "summary_large_image", title: "AI Travel Escape", description: "Start with how you want the trip to feel. AI understands your Escape DNA, finds when and where it makes sense, then builds the trip.", images: ["/api/og?name=AI%20Travel%20Escape"] },
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
