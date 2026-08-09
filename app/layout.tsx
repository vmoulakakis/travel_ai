import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./v5.css";
import "./research.css";
import "./weather.css";
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
  openGraph: { title: "Ελληνικός AI Travel Guru — πού αξίζει πραγματικά να πας", description: "Πες πώς θέλεις να νιώσεις και ο Guru θα υπερασπιστεί τρεις ελληνικούς προορισμούς που ταιριάζουν πραγματικά.", type: "website", locale: "el_GR", siteName: "Ελληνικός AI Travel Guru" },
  twitter: { card: "summary_large_image", title: "Ελληνικός AI Travel Guru", description: "Τρεις προσωπικές επιλογές σε όλη την Ελλάδα, πριν εμφανιστεί οποιοδήποτε κατάλυμα." }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="el"><body>{children}</body></html>; }
