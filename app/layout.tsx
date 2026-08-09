import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./v8.css";

const resolvedSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? "https://travel-ai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(resolvedSiteUrl),
  title: { default: "Ελληνικός AI Travel Guru — βρες πού αξίζει να πας", template: "%s · Ελληνικός AI Travel Guru" },
  description: "Ο προσωπικός σου AI ταξιδιωτικός σύμβουλος συγκρίνει ελληνικούς προορισμούς με τη διάθεση, τις ημερομηνίες, το budget και τον ρυθμό σου — πριν προτείνει διαμονή.",
  alternates: { canonical: "/", languages: { "el-GR": "/", "en-GB": "/" } },
  robots: { index: true, follow: true },
  openGraph: { title: "Ελληνικός AI Travel Guru — πού αξίζει πραγματικά να πας", description: "Πες πώς θέλεις να νιώσεις και ο Guru θα συγκρίνει έξι διαφορετικές ελληνικές επιλογές πριν σε οδηγήσει στην τελική απόφαση.", type: "website", locale: "el_GR", siteName: "Ελληνικός AI Travel Guru" },
  twitter: { card: "summary_large_image", title: "Ελληνικός AI Travel Guru", description: "Έξι προσωπικές επιλογές σε όλη την Ελλάδα, πριν εμφανιστεί οποιοδήποτε κατάλυμα." }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="el"><body>{children}</body></html>; }
