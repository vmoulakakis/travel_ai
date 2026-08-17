type Lang = "el" | "en";

const content = {
  el: {
    eyebrow: "AI TRAVEL INTELLIGENCE",
    title: "Πριν διαλέξεις ξενοδοχείο, διάλεξε σωστά την Ελλάδα σου.",
    intro: "Το AI Greece Travel δεν ξεκινά από μια λίστα καταλυμάτων. Ξεκινά από την απόφαση που έχει μεγαλύτερη αξία: ποιος ελληνικός προορισμός ταιριάζει πραγματικά στις ημερομηνίες, στην παρέα, στο budget, στον ρυθμό και στις κόκκινες γραμμές σου. Ο AI advisor συγκρίνει διαφορετικές επιλογές, εξηγεί τα trade-offs και μόνο μετά περνά στη διαμονή.",
    cards: [
      ["Πώς γίνεται το matching;", "Συνδυάζουμε όσα δηλώνεις — διάθεση, μήνα, διάρκεια, αφετηρία, κόστος, τρόπο μετακίνησης και τύπο ταξιδιώτη — με επαληθευμένα χαρακτηριστικά ελληνικών προορισμών. Η φυσική γλώσσα λειτουργεί συμπληρωματικά στα δομημένα κριτήρια: μπορείς να γράψεις «ήσυχο νησί χωρίς πολύ αυτοκίνητο» ή «παλιά πόλη, φαγητό και θάλασσα κοντά» και το σύστημα μεταφράζει το ζητούμενο σε συγκρίσιμα κριτήρια."],
      ["Γιατί δεν δείχνουμε αμέσως ξενοδοχεία;", "Ένα καλό κατάλυμα δεν διορθώνει έναν λάθος προορισμό. Πρώτα ελέγχουμε εποχή, κόπο μετάβασης, διάρκεια, budget fit, χαρακτήρα τόπου και βασικές ανάγκες της παρέας. Όταν προκύψουν οι ισχυρότερες επιλογές, τότε εξετάζονται διαθέσιμα stays και hard requirements όπως παραλία, parking, πρωινό ή οικογενειακό δωμάτιο."],
      ["Τι σημαίνει evidence-first;", "Οι προτάσεις δεν παρουσιάζονται σαν απόλυτες αλήθειες. Το σύστημα κρατά confidence, route evidence, season checks και πραγματικά δεδομένα καταλόγου, ενώ ένας skeptical auditor προσπαθεί να απορρίψει αδύναμες επιλογές. Έτσι βλέπεις όχι μόνο τι προτείνεται, αλλά και πού υπάρχει συμβιβασμός ή αβεβαιότητα."],
    ],
    faqTitle: "Συχνές ερωτήσεις πριν ξεκινήσεις",
    faq: [
      ["Μπορώ να ζητήσω έκπληξη;", "Ναι. Το Surprise mode ανοίγει το εύρος επιλογών, αλλά εξακολουθεί να σέβεται budget, μετακίνηση και βασικές προτιμήσεις."],
      ["Λειτουργεί για νησιά και ηπειρωτική Ελλάδα;", "Ναι. Το matching συγκρίνει νησιωτικούς και ηπειρωτικούς προορισμούς και μπορεί να περιοριστεί γεωγραφικά όταν το ζητήσεις."],
      ["Μπορώ να αλλάξω γνώμη μετά την πρόταση;", "Φυσικά. Το detailed planner επιτρέπει refinement και σύγκριση ώστε η τελική επιλογή να παραμένει δική σου."],
    ],
  },
  en: {
    eyebrow: "AI TRAVEL INTELLIGENCE",
    title: "Choose the right Greece before choosing the hotel.",
    intro: "AI Greece Travel does not begin with a wall of accommodation listings. It starts with the decision that matters most: which Greek destination genuinely fits your dates, group, budget, pace and non-negotiables. The AI advisor compares meaningfully different options, explains the trade-offs and only then moves downstream to accommodation.",
    cards: [
      ["How does destination matching work?", "We combine your stated preferences — mood, month, trip length, origin, budget, transport and traveller type — with verified characteristics of Greek destinations. Natural language complements the structured criteria: you can write “a quiet island without much driving” or “old town, excellent food and the sea nearby”, and the system translates the request into criteria that can be compared consistently."],
      ["Why do we not show hotels first?", "A great hotel cannot rescue the wrong destination. The decision engine first checks season, travel effort, duration, budget fit, local character and the group’s core needs. After the strongest destination paths emerge, the stay layer can evaluate available properties and hard requirements such as beachfront location, parking, breakfast or a family room."],
      ["What does evidence-first mean?", "Recommendations are not presented as unquestionable facts. The system tracks confidence, route evidence, season checks and verified catalog data, while a skeptical auditing stage actively tries to reject weak choices. You therefore see not only what ranks highly, but also where an option involves a compromise or uncertainty."],
    ],
    faqTitle: "Questions worth answering before you go",
    faq: [
      ["Can the AI surprise me?", "Yes. Surprise mode widens the search space while still respecting practical constraints such as budget, travel effort and your strongest preferences."],
      ["Does it cover islands and mainland Greece?", "Yes. Matching compares island and mainland destinations, and geography can become a hard constraint when you explicitly request a region or type of place."],
      ["Can I refine the result after the first match?", "Absolutely. The detailed planner lets you refine and compare alternatives so the final decision remains yours rather than becoming an opaque AI verdict."],
    ],
  },
} as const;

export function V28TravelIntelligence({ lang }: { lang: Lang }) {
  const copy = content[lang];
  return <section className="v28-intelligence" aria-labelledby={`v28-intelligence-${lang}`}>
    <div className="v28-intelligence-head">
      <span>{copy.eyebrow}</span>
      <h2 id={`v28-intelligence-${lang}`}>{copy.title}</h2>
      <p>{copy.intro}</p>
    </div>
    <div className="v28-intelligence-grid">
      {copy.cards.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}
    </div>
    <div className="v28-faq">
      <h2>{copy.faqTitle}</h2>
      <div>{copy.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    </div>
  </section>;
}
