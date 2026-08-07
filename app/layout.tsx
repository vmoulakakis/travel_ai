import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel AI — 3 trips chosen for you",
  description:
    "A seasonal AI travel decision engine that turns dates, budget and intent into three realistic escapes and a practical trip basket.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),
  openGraph: {
    title: "Travel AI — 3 trips chosen for you",
    description: "Decide where you can realistically go, then make the trip happen.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
