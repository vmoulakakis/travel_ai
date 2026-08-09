import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteUrl, SITE_NAME } from "@/lib/site";
import "./globals.css";
import "./v8.css";
import "leaflet/dist/leaflet.css";

const resolvedSiteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: { default: "Ελληνικός AI Travel Guru — βρες πού αξίζει να πας", template: "%s · Ελληνικός AI Travel Guru" },
  description: "Ο ελληνόφωνος AI ταξιδιωτικός σύμβουλος συγκρίνει προορισμούς στην Ελλάδα και το εξωτερικό με τη διάθεση, τις ημερομηνίες, το budget και τον ρυθμό σου — πριν προτείνει διαμονή.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: resolvedSiteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "travel",
  alternates: { canonical: "/", languages: { "el-GR": "/" } },
  robots: { index: true, follow: true },
  openGraph: { title: "Ελληνικός AI Travel Guru — πού αξίζει πραγματικά να πας", description: "Πες πώς θέλεις να νιώσεις και ο Guru θα συγκρίνει έξι διαφορετικές επιλογές σε Ελλάδα και εξωτερικό πριν σε οδηγήσει στην τελική απόφαση.", type: "website", locale: "el_GR", siteName: SITE_NAME, images: [{ url: "/api/og?name=%CE%A4%CE%BF%20%CF%84%CE%B1%CE%BE%CE%AF%CE%B4%CE%B9%20%CF%80%CE%BF%CF%85%20%CF%83%CE%BF%CF%85%20%CF%84%CE%B1%CE%B9%CF%81%CE%B9%CE%AC%CE%B6%CE%B5%CE%B9", width: 1200, height: 630, alt: "Ελληνικός AI Travel Guru" }] },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: "Έξι προσωπικές επιλογές σε Ελλάδα και εξωτερικό, πριν εμφανιστεί οποιοδήποτε κατάλυμα.", images: ["/api/og?name=%CE%A4%CE%BF%20%CF%84%CE%B1%CE%BE%CE%AF%CE%B4%CE%B9%20%CF%80%CE%BF%CF%85%20%CF%83%CE%BF%CF%85%20%CF%84%CE%B1%CE%B9%CF%81%CE%B9%CE%AC%CE%B6%CE%B5%CE%B9"] },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const structured = { "@context": "https://schema.org", "@graph": [{ "@type": "Organization", "@id": `${resolvedSiteUrl}/#organization`, name: SITE_NAME, url: resolvedSiteUrl }, { "@type": "WebSite", "@id": `${resolvedSiteUrl}/#website`, name: SITE_NAME, url: resolvedSiteUrl, inLanguage: "el-GR", publisher: { "@id": `${resolvedSiteUrl}/#organization` } }] };
  return <html lang="el"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} /></body></html>;
}
