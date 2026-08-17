import type { Metadata } from "next";
import Link from "next/link";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { destinationSeoEn } from "@/lib/seo/greece-seo-v29";
import { getSiteUrl } from "@/lib/site";
import "../../proorismoi/seo-pages.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Best Places to Visit in Greece | AI Greece Travel" },
  description: "Compare Greece destinations, Greek islands and mainland escapes by season, budget, crowd level, trip length and traveller fit before choosing where to stay.",
  alternates: { canonical: "/en/destinations", languages: { "en-GB": "/en/destinations", "el-GR": "/proorismoi" } },
  openGraph: {
    title: "Best Places to Visit in Greece — destination fit, not generic top 10s",
    description: "Explore Greek islands and mainland destinations with season, budget, crowd and traveller-fit guidance.",
    type: "website",
    locale: "en_GB",
    images: [{ url: "/api/og?name=Greece%20Destinations", width: 1200, height: 630, alt: "Greece destinations" }],
  },
};

export default async function EnglishDestinationsPage() {
  const catalog = await loadV8DestinationCatalog();
  const destinations = catalog.filter(item => item.countryCode === "GR");
  const site = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Greece destinations and vacation ideas",
    description: "Decision-first travel guidance for Greek islands and mainland Greece.",
    url: `${site}/en/destinations`,
    inLanguage: "en-GB",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: destinations.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.nameEn,
        url: `${site}/en/destinations/${item.slug}`,
      })),
    },
  };

  return <div className="seo-shell">
    <nav className="seo-nav">
      <Link className="seo-brand" href="/en"><span>AI GREECE</span> TRAVEL</Link>
      <Link className="seo-cta" href="/en#v28-inspire">Plan my Greece trip</Link>
    </nav>
    <main>
      <section className="seo-index-hero">
        <span className="seo-kicker">GREEK ISLANDS · MAINLAND GREECE · AI DESTINATION FIT</span>
        <h1>Best places to visit in Greece — for your kind of vacation.</h1>
        <p>Greece travel is not one itinerary and the best destination is not the same for every traveller. Compare islands and mainland choices by season, travel effort, budget, crowd level, ideal trip length and the kind of experience you actually want.</p>
      </section>

      <section className="seo-index-content">
        <div className="seo-section">
          <h2>How to choose a Greece destination</h2>
          <div className="seo-section-copy">
            <article className="seo-answer"><h3>Start with the trip, not the hotel</h3><p>A beautiful property cannot fix the wrong destination. Decide first whether your priority is beaches, food, culture, family ease, nightlife, nature, romance or a slower rhythm, then compare the places that genuinely support that trip.</p></article>
            <article className="seo-answer"><h3>Greek islands or mainland Greece?</h3><p>Islands can deliver a strong sense of escape, but ferry schedules, wind, transfers and peak-season demand matter. Mainland Greece can offer easier road trips, mountains, historic towns, long coastlines and better flexibility for multi-stop itineraries.</p></article>
            <article className="seo-answer"><h3>When should you travel?</h3><p>July and August are not automatically the best months for every Greek destination. Spring and autumn can improve value, walking conditions and crowd levels, while some islands and beach destinations remain strongest in the heart of summer.</p></article>
          </div>
        </div>

        <h2>Explore Greece destinations</h2>
        <div className="destination-grid">
          {destinations.map(item => {
            const seo = destinationSeoEn(item);
            return <Link key={item.slug} className="destination-link" href={`/en/destinations/${item.slug}`} style={{ backgroundImage: `url('/api/destination-photo?slug=${item.slug}')` }}>
              <div>
                <small>{seo.labels.slice(0, 3).join(" · ") || "Greece travel"}</small>
                <h2>{item.nameEn}</h2>
                <p>{seo.intro}</p>
              </div>
            </Link>;
          })}
        </div>

        <div className="seo-section">
          <h2>Greece vacation planning without the generic top-10 logic</h2>
          <div className="seo-section-copy">
            <article className="seo-answer"><h3>For first-time visitors</h3><p>Athens plus one well-matched island or mainland region is often more satisfying than rushing through several famous names. The right sequence depends on your flight logic, trip length and tolerance for transfers.</p></article>
            <article className="seo-answer"><h3>For repeat Greece travellers</h3><p>Look beyond the obvious shortlist. Smaller islands, regional cities and mainland coastlines can create a more distinctive trip when you already know the classic highlights and want stronger local character.</p></article>
            <article className="seo-answer"><h3>For families and groups</h3><p>Transport simplicity, beach access, walking distances and accommodation layout can matter more than social-media popularity. The planner treats those practical constraints as part of destination fit rather than as an afterthought.</p></article>
          </div>
        </div>

        <div className="seo-start">
          <div><h2>Still deciding where to go in Greece?</h2><p>Tell the AI advisor your dates, budget, pace and non-negotiables. It will compare meaningfully different Greek destinations before showing accommodation.</p></div>
          <Link href="/en#v28-inspire">Find my Greece match</Link>
        </div>
      </section>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <footer className="seo-footer"><Link href="/en">AI Greece Travel</Link> · decision-first Greece travel planning</footer>
  </div>;
}
