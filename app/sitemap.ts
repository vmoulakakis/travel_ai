import type { MetadataRoute } from "next";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const catalog = await loadV8DestinationCatalog().catch(() => []);
  const greek = catalog.filter(item => item.countryCode === "GR");
  const languagePair = (el: string, en: string) => ({ languages: { "el-GR": el, "en-GB": en } });
  const pair=(elPath:string,enPath:string,frequency:"daily"|"weekly"|"monthly",priority:number)=>{
    const el=`${base}${elPath}`,en=`${base}${enPath}`,alternates=languagePair(el,en);
    return [{url:el,lastModified:new Date(),changeFrequency:frequency,priority,alternates},{url:en,lastModified:new Date(),changeFrequency:frequency,priority,alternates}];
  };
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1, alternates: languagePair(base, `${base}/en`) },
    { url: `${base}/en`, lastModified: new Date(), changeFrequency: "weekly", priority: 1, alternates: languagePair(base, `${base}/en`) },
    ...pair("/ai-planner","/en/ai-planner","weekly",.98),
    ...pair("/stays-map","/en/stays-map","daily",.97),
    ...pair("/ai-map","/en/ai-map","daily",.96),
    ...pair("/proorismoi","/en/destinations","weekly",.95),
    ...pair("/seasonal","/en/seasonal","weekly",.88),
    ...pair("/guides","/en/guides","weekly",.86),
    ...pair("/how-ai-works","/en/how-ai-works","monthly",.8),
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
