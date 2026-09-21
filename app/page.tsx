import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { V67FourStepFunnel } from "@/components/v67-four-step-funnel";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TravelAI | AI Travel Planner για Ελλάδα" },
  description:
    "Βρες πού να πας στην Ελλάδα με AI που συνδυάζει ημερομηνίες, καιρό, εποχικότητα, ζήτηση, budget, διαμονές και local life σε ένα 4-step itinerary.",
  alternates: {
    canonical: "/",
    languages: { "el-GR": "/", "en-GB": "/en", "x-default": "/" },
  },
  openGraph: {
    title: "TravelAI | AI Travel Planner για Ελλάδα",
    description:
      "Από dates και budget σε μία stay-backed επιλογή, weather intelligence, local life και προσωπικό 360° itinerary.",
    type: "website",
    locale: "el_GR",
    alternateLocale: ["en_GB"],
    siteName: "TravelAI",
    url: "/",
    images: [
      {
        url: "/api/og?name=TravelAI",
        width: 1200,
        height: 630,
        alt: "TravelAI — AI travel planner για διακοπές στην Ελλάδα",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TravelAI | AI Travel Planner για Ελλάδα",
    description:
      "Dates + weather + seasonality + demand + stays + local life → ένα προσωπικό 360° itinerary.",
    images: ["/api/og?name=TravelAI"],
  },
};

const faq = [
  {
    question: "Τι κάνει διαφορετικά το TravelAI από μια απλή αναζήτηση ξενοδοχείων;",
    answer:
      "Το TravelAI ξεκινά από το ταξίδι και όχι από μια λίστα καταλυμάτων. Συνδυάζει ημερομηνίες, budget, τύπο ταξιδιού, γεωγραφικό focus, εποχικότητα, καιρό, διαθέσιμα stay signals και τοπική ζωή ώστε να περιορίσει τις επιλογές και να οδηγήσει σε μία συγκεκριμένη πρόταση.",
  },
  {
    question: "Χρησιμοποιεί τον καιρό για τις πραγματικές ημερομηνίες του ταξιδιού;",
    answer:
      "Ναι. Μετά την επιλογή προορισμού και stay, το δεύτερο βήμα εμφανίζει weather intelligence για τις ημερομηνίες που έχει επιλέξει ο ταξιδιώτης, μαζί με seasonality και τα υπόλοιπα σήματα που επηρεάζουν το fit.",
  },
  {
    question: "Περιλαμβάνει εστιατόρια, ποτό, nightlife και events;",
    answer:
      "Το τρίτο βήμα οργανώνει local-life επιλογές γύρω από την επιλεγμένη βάση, όπως restaurants, cafés, drinks, nightlife, αξιοθέατα και διαθέσιμα verified events για το σχετικό χρονικό παράθυρο.",
  },
  {
    question: "Τι παίρνω στο τέλος;",
    answer:
      "Το τέταρτο βήμα χτίζει ένα 360° Escape Book με itinerary, weather context, local-life επιλογές, PDF-ready guide, email delivery και QR που οδηγεί στο τελικό tracking URL της επιλεγμένης διαμονής.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#travel-app`,
      name: "TravelAI",
      url: siteUrl,
      applicationCategory: "TravelApplication",
      operatingSystem: "Web",
      inLanguage: ["el-GR", "en-GB"],
      description:
        "AI travel planner για την Ελλάδα που συνδυάζει ημερομηνίες, weather, seasonality, demand, stay inventory και local-life intelligence.",
      featureList: [
        "AI destination and stay selection",
        "Date-aware weather intelligence",
        "Seasonality and demand signals",
        "Restaurants, nightlife and events",
        "Personal 360-degree itinerary",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <V67FourStepFunnel />
      <section className="travelai-seo" aria-labelledby="travelai-seo-title">
        <div className="travelai-seo__shell">
          <div className="travelai-seo__brand">
            <Image src="/icon.svg" width={48} height={48} alt="TravelAI" />
            <span>AI TRAVEL PLANNING · GREECE</span>
          </div>

          <h2 id="travelai-seo-title">
            AI travel planner για διακοπές στην Ελλάδα, με απόφαση πριν από την κράτηση
          </h2>
          <p className="travelai-seo__lead">
            Το TravelAI είναι σχεδιασμένο για ένα πρόβλημα που οι κλασικές travel πλατφόρμες δεν λύνουν καλά:
            υπάρχουν πάρα πολλές επιλογές και ελάχιστη βοήθεια για να αποφασίσεις ποια ταιριάζει πραγματικά στις
            συγκεκριμένες ημερομηνίες, στο budget και στον τρόπο που θέλεις να ταξιδέψεις. Αντί να ξεκινά με εκατοντάδες
            ίδια pins ή μια ατελείωτη λίστα ξενοδοχείων, το TravelAI χρησιμοποιεί ένα τετραβήματο funnel που μετατρέπει
            το brief του ταξιδιώτη σε μία πιο συγκεκριμένη, ελέγξιμη ταξιδιωτική πρόταση.
          </p>

          <div className="travelai-seo__grid">
            <article>
              <h3>1. Ημερομηνίες, budget και πραγματικό travel intent</h3>
              <p>
                Ο ταξιδιώτης δίνει ημερομηνίες, budget, τύπο παρέας και προτιμήσεις όπως χαλάρωση, ρομαντικό ταξίδι,
                γαστρονομία, πολιτισμό, nightlife, φύση ή περιπέτεια. Μπορεί επίσης να ορίσει περιοχή ή geographic focus
                πάνω στον χάρτη και να προσθέσει φυσική γλώσσα, για παράδειγμα «ήσυχα, καλό φαγητό, χωρίς πολύ
                οδήγηση». Αυτά λειτουργούν ως πραγματικά constraints και όχι ως διακοσμητικά φίλτρα.
              </p>
            </article>
            <article>
              <h3>2. Καιρός και εποχικότητα στις ημερομηνίες σου</h3>
              <p>
                Η σωστή απόδραση αλλάζει ανάλογα με την εποχή. Μια περιοχή που είναι εξαιρετική τον Ιούνιο μπορεί να
                μην είναι η σωστή επιλογή τον Οκτώβριο. Γι’ αυτό το TravelAI εξετάζει weather intelligence για το
                συγκεκριμένο ταξιδιωτικό παράθυρο και το συνδυάζει με seasonality, fit, value και διαθέσιμα demand
                signals, αντί να αντιμετωπίζει κάθε προορισμό σαν να είναι ίδιος όλο τον χρόνο.
              </p>
            </article>
            <article>
              <h3>3. Restaurants, drinks, nightlife και local life γύρω από το stay</h3>
              <p>
                Η επιλογή ξενοδοχείου δεν αρκεί για να κρίνεις ένα ταξίδι. Το επόμενο επίπεδο είναι τι υπάρχει γύρω από
                τη βάση σου: πού θα φας, πού θα πιεις, τι αξίζει να δεις και αν υπάρχουν σχετικά events στις
                ημερομηνίες σου. Το TravelAI οργανώνει αυτή την πληροφορία μετά την επιλογή stay, ώστε το local context
                να συνδέεται με την πραγματική περιοχή που θα μείνεις και όχι απλώς με το όνομα ενός προορισμού.
              </p>
            </article>
            <article>
              <h3>4. Ένα προσωπικό 360° itinerary αντί για άλλη μία λίστα</h3>
              <p>
                Στο τελικό βήμα η πρόταση μετατρέπεται σε Escape Book: ημερήσιο itinerary, weather context, local-life
                επιλογές, guide έτοιμο για PDF, email delivery και QR. Ο στόχος είναι να φτάνεις στο τέλος με ένα
                ολοκληρωμένο σχέδιο ταξιδιού και με μία καθαρή εμπορική έξοδο προς την επιλεγμένη προσφορά, αντί να
                ανοίγεις ξανά δεκάδες tabs και να ξεκινάς από την αρχή.
              </p>
            </article>
          </div>

          <div className="travelai-seo__context">
            <h3>Travel intelligence για ελληνικά νησιά και ηπειρωτικούς προορισμούς</h3>
            <p>
              Το TravelAI είναι προσανατολισμένο στην Ελλάδα και στη διαφορετικότητα που έχει κάθε περιοχή: νησιά,
              παραθαλάσσιες αποδράσεις, βουνό, city breaks και ηπειρωτικές διαδρομές. Για περισσότερο destination
              research μπορείς να εξερευνήσεις τους <Link href="/proorismoi">προορισμούς στην Ελλάδα</Link>, να δεις
              επιλογές <Link href="/seasonal">ανά εποχή</Link>, να διαβάσεις τους <Link href="/guides">travel guides</Link>{" "}
              ή να δεις <Link href="/how-ai-works">πώς λειτουργεί το AI travel engine</Link>.
            </p>
          </div>

          <div className="travelai-seo__faq" id="faq">
            <h3>Συχνές ερωτήσεις για το TravelAI</h3>
            {faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
