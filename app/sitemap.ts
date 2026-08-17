import type { MetadataRoute } from "next";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const catalog = await loadV8DestinationCatalog().catch(() => []);
  const greek = catalog.filter(item => item.countryCode === "GR");
  const languagePair = (el: string, en: string) => ({ languages: { "el-GR": el, "en-GB": en } });
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1, alternates: languagePair(base, `${base}/en`) },
    { url: `${base}/en`, lastModified: new Date(), changeFrequency: "weekly", priority: 1, alternates: languagePair(base, `${base}/en`) },
    { url: `${base}/ai-map`, lastModified: new Date(), changeFrequency: "daily", priority: .96, alternates: languagePair(`${base}/ai-map`, `${base}/en/ai-map`) },
    { url: `${base}/en/ai-map`, lastModified: new Date(), changeFrequency: "daily", priority: .96, alternates: languagePair(`${base}/ai-map`, `${base}/en/ai-map`) },
    { url: `${base}/proorismoi`, lastModified: new Date(), changeFrequency: "weekly", priority: .95, alternates: languagePair(`${base}/proorismoi`, `${base}/en/destinations`) },
    { url: `${base}/en/destinations`, lastModified: new Date(), changeFrequency: "weekly", priority: .95, alternates: languagePair(`${base}/proorismoi`, `${base}/en/destinations`) },
    ...greek.flatMap(item => {
      const el = `${base}/proorismoi/${item.slug}`;
      const en = `${base}/en/destinations/${item.slug}`;
      const alternates = languagePair(el, en);
      return [
        { url: el, lastModified: new Date(), changeFrequency: "monthly" as const, priority: .85, alternates },
        { url: en, lastModified: new Date(), changeFrequency: "monthly" as const, priority: .85, alternates },
      ];
    }),
  ];
}
