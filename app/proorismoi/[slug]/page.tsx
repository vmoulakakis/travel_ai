import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { loadV8DestinationCatalog, loadV8StayOffers } from "@/lib/data/destination-v8";
import { loadDestinationEvidence } from "@/lib/data/evidence-v12";
import { destinationSeo } from "@/lib/seo/destination-content";
import { getSiteUrl } from "@/lib/site";
import "../seo-pages.css";
import "../v12.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };
const months = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μάι", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];
const iso = /^\d{4}-\d{2}-\d{2}$/;
const pretty = (date:string) => new Intl.DateTimeFormat("el-GR",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${date}T12:00:00Z`));

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

export default async function DestinationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { destination, catalog } = await findDestination(slug);
  if (!destination) notFound();
  const query = await searchParams;
  const requestedStart = typeof query?.start === "string" ? query.start : "";
  const requestedEnd = typeof query?.end === "string" ? query.end : "";
  const start = iso.test(requestedStart) ? requestedStart : "2026-09-18";
  const end = iso.test(requestedEnd) && Date.parse(requestedEnd) > Date.parse(start) ? requestedEnd : "2026-09-22";
  const seo = destinationSeo(destination);
  const related = catalog.filter(item => item.slug !== slug).sort((a, b) => b.tags.filter(tag => destination.tags.includes(tag)).length - a.tags.filter(tag => destination.tags.includes(tag)).length).slice(0, 6);
  const site = getSiteUrl();
  const [evidence, offers] = await Promise.all([loadDestinationEvidence(slug,start,end),loadV8StayOffers(slug,start,end,6).catch(()=>[])]);
  const validOffers = offers.filter(offer=>offer.trackingUrl.startsWith("https://go.linkwi.se/")&&offer.trackingUrl.includes("/CD104/")).slice(0,3);
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "TouristDestination", name: destination.nameEl, alternateName: destination.nameEn, description: seo.description, url: `${site}/proorismoi/${slug}`, geo: { "@type": "GeoCoordinates", latitude: destination.latitude, longitude: destination.longitude }, touristType: seo.labels },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Αρχική", item: site }, { "@type": "ListItem", position: 2, name: "Προορισμοί", item: `${site}/proorismoi` }, { "@type": "ListItem", position: 3, name: destination.nameEl, item: `${site}/proorismoi/${slug}` }] }
  ] };
  return <div className="seo-shell">
    <nav className="seo-nav"><Link className="seo-brand" href="/"><span>ΕΛΛΗΝΙΚΟΣ AI</span> TRAVEL GURU</Link><Link className="seo-cta" href={`/?mode=idea&destination=${encodeURIComponent(destination.nameEl)}#discovery`}>Έλεγξε αν σου ταιριάζει</Link></nav>
    <main>
      <section className="seo-hero"><div><span className="seo-kicker">Η ΔΙΚΗ ΣΟΥ ΕΠΙΛΟΓΗ · {pretty(start)} — {pretty(end)}</span><h1>{destination.nameEl}</h1><p>{seo.intro} Αυτή η σελίδα προσαρμόζεται στις ημερομηνίες που επέλεξες και δημοσιεύει μόνο στοιχεία που παραμένουν ενεργά.</p><div className="seo-tags">{seo.labels.map(label => <span key={label}>{label}</span>)}</div></div><div className="seo-photo" style={{ backgroundImage: `url('/api/destination-photo?slug=${slug}&start_date=${start}&end_date=${end}')` }}><span>Πραγματική εικόνα από διαθέσιμη επιλογή διαμονής</span></div></section>
      <section className="seo-content">
        <div className="seo-facts"><div className="seo-fact"><small>Πόσες μέρες</small><strong>{seo.idealNights}</strong></div><div className="seo-fact"><small>Καλύτεροι μήνες</small><strong>{seo.bestMonths.map(month => months[month - 1]).join(" · ")}</strong></div><div className="seo-fact"><small>Επίπεδο budget</small><strong>{destination.costTier}/5</strong></div><div className="seo-fact"><small>Ρυθμός κόσμου</small><strong>{destination.crowdLevel >= 4 ? "Δημοφιλής" : destination.crowdLevel <= 2 ? "Ήσυχος" : "Ισορροπημένος"}</strong></div></div>
        <div className="seo-section"><h2>Η ειλικρινής εικόνα</h2><div className="seo-section-copy"><article className="seo-answer"><h3>Γιατί μπορεί να είναι σωστή επιλογή</h3><p>{seo.intro}</p></article><article className="seo-answer"><h3>Τι μπορεί να σε απογοητεύσει</h3><p>{seo.crowd}</p></article><article className="seo-answer"><h3>Τι πρέπει να προσέξεις στο κόστος</h3><p>{seo.cost}</p></article></div></div>
        <div className="seo-section"><h2>Η απόδειξη πίσω από την επιλογή</h2><div className="seo-section-copy">{evidence.tripadvisor.length?<>{evidence.tripadvisor.slice(0,3).map(item=><article className="seo-answer proof-answer" key={item.id}><span>TRIPADVISOR · {item.sourceMonth?.slice(0,7)}</span><h3>{item.subjectName}</h3><p>{item.headline}</p><div>{item.rank!=null&&<strong>#{item.rank}</strong>}{item.rating!=null&&<strong>{item.rating}/{item.ratingScale??5}</strong>}{item.reviewCount!=null&&<small>{item.reviewCount.toLocaleString("el-GR")} κριτικές</small>}</div></article>)}</>:<article className="seo-answer proof-empty"><h3>Χωρίς δανεικό social proof</h3><p>Δεν υπάρχει αυτή τη στιγμή ενεργό, επαληθευμένο snapshot κατάταξης. Δεν θα εμφανίσουμε παλιό score μόνο και μόνο για να εντυπωσιάσουμε.</p></article>}</div></div>
        <div className="seo-section"><h2>Τι συμβαίνει στις ημερομηνίες σου</h2><div className="seo-section-copy">{evidence.events.length?evidence.events.slice(0,4).map(item=><article className="seo-answer event-answer" key={item.id}><span>{item.startsAt?pretty(item.startsAt.slice(0,10)):pretty(start)}</span><h3>{item.subjectName}</h3><p>{item.summary||item.headline}</p><small>{item.provider}</small></article>):<article className="seo-answer proof-empty"><h3>Καμία επιβεβαιωμένη εκδήλωση ακόμη</h3><p>Για {pretty(start)}–{pretty(end)} δεν έχει περάσει ακόμη εκδήλωση τον έλεγχο πηγής και ημερομηνίας. Το πρόγραμμα μένει δυνατό χωρίς να εφεύρουμε γεγονότα.</p></article>}</div></div>
        {validOffers.length>0&&<div className="seo-section"><h2>Διαμονές που καλύπτουν όλο το ταξίδι</h2><div className="landing-stays">{validOffers.map((offer,index)=><article key={offer.sourceProductId}><div style={{backgroundImage:offer.imageUrl||offer.thumbUrl?`url('${offer.imageUrl||offer.thumbUrl}')`:undefined}}><span>{index===0?"Η επιλογή του Guru":index===1?"Πιο ήσυχη εκδοχή":"Άλλο travel mood"}</span></div><section><small>{offer.city||destination.nameEl}</small><h3>{offer.propertyName}</h3><p>{offer.distanceKm!=null?`${offer.distanceKm.toFixed(1)} km από το κέντρο αναφοράς. `:""}Καλύπτει ολόκληρο το διάστημα που επέλεξες· η τελική τιμή και το δωμάτιο επιβεβαιώνονται στο επόμενο βήμα.</p><a href={offer.trackingUrl} target="_blank" rel="sponsored nofollow noopener">Έλεγξε τιμή & διαθεσιμότητα</a></section></article>)}</div></div>}
        <div className="seo-section"><h2>Σχετικές επιλογές</h2><div className="seo-related">{related.map(item => <Link href={`/proorismoi/${item.slug}`} key={item.slug}>{item.nameEl}</Link>)}</div></div>
        <div className="seo-start"><div><h2>Μην αποφασίσεις μόνο από τη φωτογραφία.</h2><p>Σύγκρινε τον προορισμό {destination.nameEl} με έως επτά πραγματικά διαφορετικές επιλογές για τις δικές σου ημερομηνίες.</p></div><Link href={`/?mode=idea&destination=${encodeURIComponent(destination.nameEl)}#discovery`}>Ρώτησε τον Guru</Link></div>
      </section>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <footer className="seo-footer"><Link href="/proorismoi">Όλοι οι προορισμοί</Link></footer>
  </div>;
}
