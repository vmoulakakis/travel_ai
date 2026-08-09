import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return { rules: [{ userAgent: "*", allow: ["/", "/api/og", "/api/destination-photo"], disallow: ["/admin", "/api/"] }], sitemap: `${base}/sitemap.xml`, host: base };
}
