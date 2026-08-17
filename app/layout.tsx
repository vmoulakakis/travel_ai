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
import "leaflet/dist/leaflet.css";

const resolvedSiteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: { default: "Διακοπές στην Ελλάδα με AI | AI Greece Travel", template: "%s · AI Greece Travel" },
  description: "Σχεδίασε διακοπές στην Ελλάδα με AI: σύγκρινε ελληνικά νησιά και ηπειρωτικούς προορισμούς με βάση εποχή, budget, παρέα, μετακίνηση και πραγματικό travel fit.",
  applicationName: "AI Greece Travel",
  authors: [{ name: SITE_NAME, url: resolvedSiteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "travel",
  alternates: { canonical: "/", languages: { "el-GR": "/", "en-GB": "/en" } },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Διακοπές στην Ελλάδα — βρες τον προορισμό που σου ταιριάζει",
    description: "AI travel advisor για ελληνικά νησιά και ηπειρωτική Ελλάδα. Σύγκρινε προορισμούς πριν επιλέξεις διαμονή.",
    type: "website",
    locale: "el_GR",
    alternateLocale: ["en_GB"],
    siteName: "AI Greece Travel",
    images: [{ url: "/api/og?name=AI%20Greece%20Travel", width: 1200, height: 630, alt: "AI Greece Travel - διακοπές στην Ελλάδα" }],
  },
  twitter: { card: "summary_large_image", title: "AI Greece Travel", description: "AI travel planning for Greece, Greek islands and mainland destinations.", images: ["/api/og?name=AI%20Greece%20Travel"] },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${resolvedSiteUrl}/#organization`, name: SITE_NAME, url: resolvedSiteUrl, logo: `${resolvedSiteUrl}/icon.svg` },
      { "@type": "WebSite", "@id": `${resolvedSiteUrl}/#website`, name: "AI Greece Travel", url: resolvedSiteUrl, inLanguage: ["el-GR", "en-GB"], publisher: { "@id": `${resolvedSiteUrl}/#organization` } },
    ],
  };
  return <html lang="el"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} /></body></html>;
}
