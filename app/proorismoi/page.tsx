import type { Metadata } from "next";
import Link from "next/link";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { destinationSeo } from "@/lib/seo/destination-content";
import { getSiteUrl } from "@/lib/site";
import "./seo-pages.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Διακοπές στην Ελλάδα: Προορισμοί & Νησιά",
  description: "Βρες προορισμούς για διακοπές στην Ελλάδα και σύγκρινε ελληνικά νησιά και ηπειρωτικές επιλογές με βάση εποχή, budget, παρέα, ρυθμό και πραγματικό travel fit.",
  alternates: { canonical: "/proorismoi", languages: { "el-GR": "/proorismoi", "en-GB": "/en/destinations" } },
  openGraph: { title: "Διακοπές στην Ελλάδα — προορισμοί που σου ταιριάζουν", description: "Όχι άλλη μία top-10 λίστα. Σύγκρινε ελληνικά νησιά και ηπειρωτικούς προορισμούς με εποχή, budget, ρυθμό και πραγματικές απαιτήσεις ταξιδιού.", images: [{ url: "/api/og?name=%CE%94%CE%B9%CE%B1%CE%BA%CE%BF%CF%80%CE%AD%CF%82%20%CF%83%CF%84%CE%B7%CE%BD%20%CE%95%CE%BB%CE%BB%CE%AC%CE%B4%CE%B1" }] },
};

export default async function DestinationsPage() {
  const catalog = await loadV8DestinationCatalog();
  const destinations = catalog.filter(item => item.countryCode === "GR");
  const site = getSiteUrl();
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Προορισμοί για διακοπές στην Ελλάδα", description: "Ελληνικά νησιά και ηπειρωτικοί προορισμοί με decision-first ταξιδιωτική καθοδήγηση.", url: `${site}/proorismoi`, inLanguage: "el-GR", mainEntity: { "@type": "ItemList", itemListElement: destinations.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.nameEl, url: `${site}/proorismoi/${item.slug}` })) } };
  const start = "2026-09-18", end = "2026-09-22";
  return <div className="seo-shell">
    <nav className="seo-nav"><Link className="seo-brand" href="/"><span>AI GREECE</span> TRAVEL</Link><Link className="seo-cta" href="/#v28-inspire">Βρες το ταξίδι σου</Link></nav>
    <main>
      <section className="seo-index-hero"><span className="seo-kicker">ΕΛΛΗΝΙΚΑ ΝΗΣΙΑ · ΗΠΕΙΡΩΤΙΚΗ ΕΛΛΑΔΑ · AI DESTINATION FIT</span><h1>Προορισμοί για διακοπές στην Ελλάδα — με βάση εσένα.</h1><p>Οι καλύτερες διακοπές στην Ελλάδα δεν είναι ίδιες για όλους. Σύγκρινε νησιά και ηπειρωτικούς προορισμούς με βάση εποχή, μετακίνηση, budget, κόσμο, διάρκεια και το είδος ταξιδιού που πραγματικά θέλεις.</p></section>
      <section className="seo-index-content">
        <div className="seo-section"><h2>Πώς να διαλέξεις προορισμό στην Ελλάδα</h2><div className="seo-section-copy"><article className="seo-answer"><h3>Ξεκίνα από το ταξίδι, όχι από το ξενοδοχείο</h3><p>Ένα όμορφο κατάλυμα δεν διορθώνει έναν λάθος προορισμό. Πρώτα αποφάσισε αν προτεραιότητά σου είναι παραλίες, φαγητό, πολιτισμός, οικογενειακή ευκολία, νυχτερινή ζωή, φύση, ρομαντισμός ή πιο αργός ρυθμός.</p></article><article className="seo-answer"><h3>Νησί ή ηπειρωτική Ελλάδα;</h3><p>Τα ελληνικά νησιά δίνουν έντονη αίσθηση απόδρασης, αλλά τα δρομολόγια, ο άνεμος και οι μετακινήσεις επηρεάζουν πολύ ένα σύντομο ταξίδι. Η ηπειρωτική Ελλάδα προσφέρει road trips, βουνό, ιστορικές πόλεις, ακτές και μεγαλύτερη ευελιξία.</p></article><article className="seo-answer"><h3>Πότε να πας διακοπές;</h3><p>Ο Ιούλιος και ο Αύγουστος δεν είναι αυτόματα οι καλύτεροι μήνες για κάθε προορισμό. Άνοιξη και φθινόπωρο μπορούν να δώσουν καλύτερη ισορροπία σε κόστος, θερμοκρασία και κόσμο, ενώ ορισμένα νησιά κορυφώνονται το καλοκαίρι.</p></article></div></div>
        <h2>Εξερεύνησε προορισμούς στην Ελλάδα</h2><div className="destination-grid">{destinations.map(item => { const seo = destinationSeo(item); return <Link key={item.slug} className="destination-link" href={`/proorismoi/${item.slug}`} style={{ backgroundImage: `url('/api/destination-photo?slug=${item.slug}&start_date=${start}&end_date=${end}')` }}><div><small>{seo.labels.slice(0, 3).join(" · ") || "διακοπές στην Ελλάδα"}</small><h2>{item.nameEl}</h2><p>{seo.intro}</p></div></Link>; })}</div>
        <div className="seo-section"><h2>Διακοπές στην Ελλάδα χωρίς γενικές «top 10» απαντήσεις</h2><div className="seo-section-copy"><article className="seo-answer"><h3>Για πρώτη φορά στην Ελλάδα</h3><p>Λίγες, σωστά συνδεδεμένες στάσεις συνήθως δίνουν καλύτερο ταξίδι από ένα πιεστικό island hopping. Η σωστή διαδρομή εξαρτάται από αφετηρία, διάρκεια, πτήσεις και πόσο χρόνο θέλεις να χάσεις σε μεταφορές.</p></article><article className="seo-answer"><h3>Για οικογένειες και παρέες</h3><p>Απόσταση από παραλία, οδήγηση, parking, περπάτημα και σωστή διαμονή μπορεί να είναι σημαντικότερα από τη δημοφιλία ενός νησιού. Ο planner βάζει αυτά τα πρακτικά κριτήρια μέσα στην ίδια την επιλογή προορισμού.</p></article><article className="seo-answer"><h3>Για πιο οικονομικές διακοπές</h3><p>Το value δεν είναι μόνο η φθηνότερη τιμή. Μετρά πόσο κοστίζει να φτάσεις, πόσες μετακινήσεις χρειάζονται και αν μπορείς να ζήσεις τον προορισμό χωρίς να πληρώνεις συνεχώς premium επιλογές.</p></article></div></div>
        <div className="seo-start"><div><h2>Δεν ξέρεις ποια Ελλάδα σου ταιριάζει;</h2><p>Πες ημερομηνίες, budget, παρέα και κόκκινες γραμμές. Ο AI advisor θα συγκρίνει πραγματικά διαφορετικούς ελληνικούς προορισμούς πριν περάσει στη διαμονή.</p></div><Link href="/#v28-inspire">Ξεκίνα τη σύγκριση</Link></div>
      </section>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <footer className="seo-footer">AI Greece Travel · διακοπές στην Ελλάδα με πραγματικά κριτήρια · <Link href="/en/destinations">English</Link></footer>
  </div>;
}
