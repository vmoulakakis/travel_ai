import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteUrl, SITE_NAME } from "@/lib/site";
import "./globals.css";
import "./v8.css";
import "./final.css";
import "./v28.css";
import "./v28-concierge.css";
import "./v28-production.css";
import "leaflet/dist/leaflet.css";

const resolvedSiteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: { default: "AI Greece Travel — βρες το ελληνικό ταξίδι που σου ταιριάζει", template: "%s · AI Greece Travel" },
  description: "AI travel advisor για την Ελλάδα: σύγκριση προορισμών με βάση διάθεση, ημερομηνίες, budget, μετακίνηση και evidence πριν εμφανιστούν καταλύματα.",
  applicationName: "AI Greece Travel",
  authors: [{ name: SITE_NAME, url: resolvedSiteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "travel",
  alternates: { canonical: "/", languages: { "el-GR": "/", "en-GB": "/en" } },
  robots: { index: true, follow: true },
  openGraph: {
    title: "AI Greece Travel — βρες πού ταιριάζεις στην Ελλάδα",
    description: "Πες τι ταξίδι χρειάζεσαι. Ο AI advisor συγκρίνει διαφορετικούς ελληνικούς προορισμούς και εξηγεί το γιατί πριν προτείνει διαμονή.",
    type: "website",
    locale: "el_GR",
    alternateLocale: ["en_GB"],
    siteName: "AI Greece Travel",
    images: [{ url: "/api/og?name=AI%20Greece%20Travel", width: 1200, height: 630, alt: "AI Greece Travel" }],
  },
  twitter: { card: "summary_large_image", title: "AI Greece Travel", description: "AI destination matching for Greece, before accommodation search.", images: ["/api/og?name=AI%20Greece%20Travel"] },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${resolvedSiteUrl}/#organization`, name: SITE_NAME, url: resolvedSiteUrl },
      { "@type": "WebSite", "@id": `${resolvedSiteUrl}/#website`, name: "AI Greece Travel", url: resolvedSiteUrl, inLanguage: ["el-GR", "en-GB"], publisher: { "@id": `${resolvedSiteUrl}/#organization` } },
    ],
  };
  return <html lang="el"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} /></body></html>;
}
