import type { MetadataRoute } from "next";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const catalog = await loadV8DestinationCatalog().catch(() => []);
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/proorismoi`, lastModified: new Date(), changeFrequency: "weekly", priority: .9 },
    ...catalog.map(item => ({ url: `${base}/proorismoi/${item.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: .8 })),
  ];
}
