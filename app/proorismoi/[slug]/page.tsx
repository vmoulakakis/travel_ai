import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { destinationSeo } from "@/lib/seo/destination-content";
import { getSiteUrl } from "@/lib/site";
import "../seo-pages.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
const months = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μάι", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];

const findDestination = cache(async (slug: string) => {
  const catalog = await loadV8DestinationCatalog().catch(() => []);
  return { destination: catalog.find(item => item.slug === slug), catalog };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { destination } = await findDestination(slug);
  if (!destination) return { title: "Προορισμός" };
  const seo = destinationSeo(destination);
  const image = `/api/og?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(destination.nameEl)}`;
  return { title: seo.title, description: seo.description, keywords: [seo.primaryKeyword, ...seo.supportingKeywords], alternates: { canonical: `/proorismoi/${slug}` }, openGraph: { title: seo.title, description: seo.description, type: "article", locale: "el_GR", images: [{ url: image, width: 1200, height: 630, alt: `${destination.nameEl} - ταξιδιωτική πρόταση` }] }, twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: [image] } };
}

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;
  const { destination, catalog } = await findDestination(slug);
  if (!destination) notFound();
  const seo = destinationSeo(destination);
  const related = catalog.filter(item => item.slug !== slug).sort((a, b) => b.tags.filter(tag => destination.tags.includes(tag)).length - a.tags.filter(tag => destination.tags.includes(tag)).length).slice(0, 6);
  const site = getSiteUrl();
  const start = "2026-09-18", end = "2026-09-22";
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "TouristDestination", name: destination.nameEl, alternateName: destination.nameEn, description: seo.description, url: `${site}/proorismoi/${slug}`, geo: { "@type": "GeoCoordinates", latitude: destination.latitude, longitude: destination.longitude }, touristType: seo.labels },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Αρχική", item: site }, { "@type": "ListItem", position: 2, name: "Προορισμοί", item: `${site}/proorismoi` }, { "@type": "ListItem", position: 3, name: destination.nameEl, item: `${site}/proorismoi/${slug}` }] }
  ] };
  return <div className="seo-shell">
    <nav className="seo-nav"><Link className="seo-brand" href="/"><span>ΕΛΛΗΝΙΚΟΣ AI</span> TRAVEL GURU</Link><Link className="seo-cta" href={`/?mode=idea&destination=${encodeURIComponent(destination.nameEl)}#discovery`}>Έλεγξε αν σου ταιριάζει</Link></nav>
    <main>
      <section className="seo-hero"><div><span className="seo-kicker">ΟΧΙ ΑΛΛΟΣ ΕΝΑΣ ΓΕΝΙΚΟΣ ΟΔΗΓΟΣ</span><h1>{destination.nameEl}</h1><p>{seo.intro}</p><div className="seo-tags">{seo.labels.map(label => <span key={label}>{label}</span>)}</div></div><div className="seo-photo" style={{ backgroundImage: `url('/api/destination-photo?slug=${slug}&start_date=${start}&end_date=${end}')` }}><span>Πραγματική εικόνα από διαθέσιμη επιλογή διαμονής</span></div></section>
      <section className="seo-content">
        <div className="seo-facts"><div className="seo-fact"><small>Πόσες μέρες</small><strong>{seo.idealNights}</strong></div><div className="seo-fact"><small>Καλύτεροι μήνες</small><strong>{seo.bestMonths.map(month => months[month - 1]).join(" · ")}</strong></div><div className="seo-fact"><small>Επίπεδο budget</small><strong>{destination.costTier}/5</strong></div><div className="seo-fact"><small>Ρυθμός κόσμου</small><strong>{destination.crowdLevel >= 4 ? "Δημοφιλής" : destination.crowdLevel <= 2 ? "Ήσυχος" : "Ισορροπημένος"}</strong></div></div>
        <div className="seo-section"><h2>Η ειλικρινής εικόνα</h2><div className="seo-section-copy"><article className="seo-answer"><h3>Γιατί μπορεί να είναι σωστή επιλογή</h3><p>{seo.intro}</p></article><article className="seo-answer"><h3>Τι μπορεί να σε απογοητεύσει</h3><p>{seo.crowd}</p></article><article className="seo-answer"><h3>Τι πρέπει να προσέξεις στο κόστος</h3><p>{seo.cost}</p></article></div></div>
        <div className="seo-section"><h2>Σχετικές επιλογές</h2><div className="seo-related">{related.map(item => <Link href={`/proorismoi/${item.slug}`} key={item.slug}>{item.nameEl}</Link>)}</div></div>
        <div className="seo-start"><div><h2>Μην αποφασίσεις μόνο από τη φωτογραφία.</h2><p>Σύγκρινε τον προορισμό {destination.nameEl} με πέντε πραγματικά διαφορετικές επιλογές για τις δικές σου ημερομηνίες.</p></div><Link href={`/?mode=idea&destination=${encodeURIComponent(destination.nameEl)}#discovery`}>Ρώτησε τον Guru</Link></div>
      </section>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <footer className="seo-footer"><Link href="/proorismoi">Όλοι οι προορισμοί</Link></footer>
  </div>;
}
