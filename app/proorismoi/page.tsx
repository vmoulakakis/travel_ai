import type { Metadata } from "next";
import Link from "next/link";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { destinationSeo } from "@/lib/seo/destination-content";
import { getSiteUrl } from "@/lib/site";
import "./seo-pages.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Προορισμοί για Έλληνες ταξιδιώτες - βρες ποιος σου ταιριάζει",
  description: "Σύγκρινε προορισμούς στην Ελλάδα και το εξωτερικό με βάση εποχή, ρυθμό, budget, παρέα και πραγματικό ταξιδιωτικό σκοπό.",
  alternates: { canonical: "/proorismoi" },
  openGraph: { title: "Προορισμοί που ταιριάζουν σε εσένα", description: "Όχι άλλη μία λίστα. Δες πότε λειτουργεί κάθε προορισμός και ποιον ταξιδιώτη εξυπηρετεί.", images: [{ url: "/api/og?name=%CE%A0%CF%81%CE%BF%CE%BF%CF%81%CE%B9%CF%83%CE%BC%CE%BF%CE%AF%20%CF%80%CE%BF%CF%85%20%CF%83%CE%BF%CF%85%20%CF%84%CE%B1%CE%B9%CF%81%CE%B9%CE%AC%CE%B6%CE%BF%CF%85%CE%BD" }] },
};

export default async function DestinationsPage() {
  const destinations = await loadV8DestinationCatalog();
  const site = getSiteUrl();
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Προορισμοί για Έλληνες ταξιδιώτες", url: `${site}/proorismoi`, inLanguage: "el-GR", mainEntity: { "@type": "ItemList", itemListElement: destinations.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.nameEl, url: `${site}/proorismoi/${item.slug}` })) } };
  const start = "2026-09-18", end = "2026-09-22";
  return <div className="seo-shell">
    <nav className="seo-nav"><Link className="seo-brand" href="/"><span>ΕΛΛΗΝΙΚΟΣ AI</span> TRAVEL GURU</Link><Link className="seo-cta" href="/#discovery">Βρες το ταξίδι σου</Link></nav>
    <main>
      <section className="seo-index-hero"><span className="seo-kicker">21 ΠΡΟΟΡΙΣΜΟΙ · ΜΙΑ ΠΙΟ ΕΞΥΠΝΗ ΑΠΟΦΑΣΗ</span><h1>Πού να πας — με βάση εσένα.</h1><p>Δεν ταξινομούμε τους τόπους σε γενικά «top 10». Εξετάζουμε πότε λειτουργούν, πόση προσπάθεια ζητούν, τι ρυθμό υποστηρίζουν και ποιος συμβιβασμός κρύβεται πίσω από την όμορφη φωτογραφία.</p></section>
      <section className="seo-index-content"><h2>Εξερεύνησε τους προορισμούς</h2><div className="destination-grid">{destinations.map(item => { const seo = destinationSeo(item); return <Link key={item.slug} className="destination-link" href={`/proorismoi/${item.slug}`} style={{ backgroundImage: `url('/api/destination-photo?slug=${item.slug}&start_date=${start}&end_date=${end}')` }}><div><small>{seo.labels.slice(0, 3).join(" · ") || "ταξίδι"}</small><h2>{item.nameEl}</h2><p>{seo.intro}</p></div></Link>; })}</div><div className="seo-start"><div><h2>Δεν ξέρεις ποια να διαλέξεις;</h2><p>Άφησε την ταξιδιωτική ομάδα να συγκρίνει Ελλάδα και εξωτερικό με τα δικά σου κριτήρια.</p></div><Link href="/?mode=unknown#discovery">Ξεκίνα τη σύγκριση</Link></div></section>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <footer className="seo-footer">Ελληνικός AI Travel Guru · πραγματικά κριτήρια, ειλικρινείς συμβιβασμοί</footer>
  </div>;
}
