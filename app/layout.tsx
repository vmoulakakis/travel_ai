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
  title: { default: "Travel Guru — η σωστή ταξιδιωτική απόφαση", template: "%s · Travel Guru" },
  description: "Το προσωπικό σου ταξιδιωτικό συμβούλιο συνδυάζει σκοπό, ημερομηνίες, εποχή, μετακίνηση και budget για να καταλήξει σε επιλογές που αξίζουν πραγματικά.",
  alternates: { canonical: "/", languages: { "el-GR": "/", "en-GB": "/" } },
  robots: { index: true, follow: true },
  openGraph: { title: "Travel Guru — πού αξίζει πραγματικά να πας", description: "Πέντε διαφορετικοί τρόποι να πετύχει το ταξίδι σου, με ξεκάθαρη κύρια επιλογή.", type: "website", locale: "el_GR", siteName: "Travel Guru" },
  twitter: { card: "summary_large_image", title: "Travel Guru — η σωστή ταξιδιωτική απόφαση", description: "Το προσωπικό σου ταξιδιωτικό συμβούλιο καταλήγει στις επιλογές που αξίζουν." }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="el"><body>{children}</body></html>; }
