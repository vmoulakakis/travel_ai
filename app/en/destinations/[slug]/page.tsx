import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { destinationSeoEn } from "@/lib/seo/greece-seo-v29";
import { getSiteUrl } from "@/lib/site";
import "../../../proorismoi/seo-pages.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const findDestination = cache(async (slug: string) => {
  const catalog = await loadV8DestinationCatalog().catch(() => []);
  const greek = catalog.filter(item => item.countryCode === "GR");
  return { destination: greek.find(item => item.slug === slug), catalog: greek };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { destination } = await findDestination(slug);
  if (!destination) return { title: "Greece destination" };
  const seo = destinationSeoEn(destination);
  const image = `/api/og?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(destination.nameEn)}`;
  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: [seo.primaryKeyword, ...seo.supportingKeywords],
    alternates: {
      canonical: `/en/destinations/${slug}`,
      languages: { "en-GB": `/en/destinations/${slug}`, "el-GR": `/proorismoi/${slug}` },
    },
    openGraph: { title: seo.title, description: seo.description, type: "article", locale: "en_GB", images: [{ url: image, width: 1200, height: 630, alt: `${destination.nameEn}, Greece travel guide` }] },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: [image] },
  };
}

export default async function EnglishDestinationPage({ params }: Props) {
  const { slug } = await params;
  const { destination, catalog } = await findDestination(slug);
  if (!destination) notFound();
  const seo = destinationSeoEn(destination);
  const related = catalog
    .filter(item => item.slug !== slug)
    .sort((a, b) => b.tags.filter(tag => destination.tags.includes(tag)).length - a.tags.filter(tag => destination.tags.includes(tag)).length)
    .slice(0, 6);
  const site = getSiteUrl();
  const crowdLabel = destination.crowdLevel >= 4 ? "Popular" : destination.crowdLevel <= 2 ? "Quieter" : "Balanced";
  const accessLabel = destination.directFromAthens ? "Direct option from Athens" : "Connection or extra travel leg likely";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristDestination",
        name: destination.nameEn,
        alternateName: destination.nameEl,
        description: seo.description,
        url: `${site}/en/destinations/${slug}`,
        inLanguage: "en-GB",
        geo: { "@type": "GeoCoordinates", latitude: destination.latitude, longitude: destination.longitude },
        touristType: seo.labels,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "AI Greece Travel", item: `${site}/en` },
          { "@type": "ListItem", position: 2, name: "Greece destinations", item: `${site}/en/destinations` },
          { "@type": "ListItem", position: 3, name: destination.nameEn, item: `${site}/en/destinations/${slug}` },
        ],
      },
    ],
  };

  return <div className="seo-shell">
    <nav className="seo-nav">
      <Link className="seo-brand" href="/en"><span>AI GREECE</span> TRAVEL</Link>
      <Link className="seo-cta" href={`/en?mode=idea&destination=${encodeURIComponent(destination.nameEn)}#v28-inspire`}>Check my fit</Link>
    </nav>
    <main>
      <section className="seo-hero">
        <div>
          <span className="seo-kicker">GREECE DESTINATION GUIDE · DECISION FIRST</span>
          <h1>{destination.nameEn}, Greece</h1>
          <p>{seo.intro} This guide focuses on the decision that comes before accommodation: when the destination works, who it fits and what trade-offs deserve attention.</p>
          <div className="seo-tags">{seo.labels.map(label => <span key={label}>{label}</span>)}</div>
        </div>
        <div className="seo-photo" style={{ backgroundImage: `url('/api/destination-photo?slug=${slug}')` }}><span>{destination.nameEn} travel inspiration</span></div>
      </section>

      <section className="seo-content">
        <div className="seo-facts">
          <div className="seo-fact"><small>Ideal trip length</small><strong>{seo.idealNights}</strong></div>
          <div className="seo-fact"><small>Strongest months</small><strong>{seo.bestMonths.map(month => months[month - 1]).join(" · ")}</strong></div>
          <div className="seo-fact"><small>Budget level</small><strong>{destination.costTier}/5</strong></div>
          <div className="seo-fact"><small>Crowd profile</small><strong>{crowdLabel}</strong></div>
        </div>

        <div className="seo-section">
          <h2>Is {destination.nameEn} right for your Greece vacation?</h2>
          <div className="seo-section-copy">
            <article className="seo-answer"><h3>Why it can be a strong match</h3><p>{seo.intro}</p></article>
            <article className="seo-answer"><h3>What may disappoint you</h3><p>{seo.crowd}</p></article>
            <article className="seo-answer"><h3>What to watch in the budget</h3><p>{seo.cost}</p></article>
          </div>
        </div>

        <div className="seo-section">
          <h2>When to visit {destination.nameEn}</h2>
          <div className="seo-section-copy">
            <article className="seo-answer"><h3>Best seasonal fit</h3><p>The first-party destination model currently gives the strongest fit to {seo.bestMonths.map(month => months[month - 1]).join(", ")}. That does not mean other months are impossible; it means weather, local rhythm and the intended trip style need more careful checking.</p></article>
            <article className="seo-answer"><h3>How long to stay</h3><p>A practical starting range is {seo.idealNights}. Shorter stays can work when access is simple, while longer trips make more sense when the destination rewards villages, beaches, day trips or a slower pace.</p></article>
            <article className="seo-answer"><h3>Travel effort</h3><p>{accessLabel}. Transport friction matters because a destination that looks perfect on paper can become a weak choice when too much of a short vacation is lost to transfers.</p></article>
          </div>
        </div>

        <div className="seo-section">
          <h2>How this guide makes the decision</h2>
          <div className="seo-section-copy">
            <article className="seo-answer"><h3>Season before popularity</h3><p>The system compares month fit and crowd profile rather than assuming the most famous Greek destinations are always the best answer.</p></article>
            <article className="seo-answer"><h3>Trip fit before accommodation</h3><p>Beaches, family needs, food, culture, nature, nightlife, value and pace are treated as destination-level criteria before hotels enter the funnel.</p></article>
            <article className="seo-answer"><h3>Trade-offs stay visible</h3><p>Cost, crowd pressure and access are part of the recommendation. The goal is not to sell every place; it is to help you avoid choosing the wrong place for this specific trip.</p></article>
          </div>
        </div>

        <div className="seo-section">
          <h2>Similar Greece destinations to compare</h2>
          <div className="seo-related">{related.map(item => <Link href={`/en/destinations/${item.slug}`} key={item.slug}>{item.nameEn}</Link>)}</div>
        </div>

        <div className="seo-start">
          <div><h2>Do not decide from the photo alone.</h2><p>Compare {destination.nameEn} with meaningfully different Greek destinations using your dates, budget, pace and non-negotiables.</p></div>
          <Link href={`/en?mode=idea&destination=${encodeURIComponent(destination.nameEn)}#v28-inspire`}>Ask the AI travel advisor</Link>
        </div>
      </section>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <footer className="seo-footer"><Link href="/en/destinations">All Greece destinations</Link> · <Link href={`/proorismoi/${slug}`}>Ελληνικά</Link></footer>
  </div>;
}
