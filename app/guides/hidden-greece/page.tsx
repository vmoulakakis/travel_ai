import type { Metadata } from "next";
import { V31PageFrame } from "@/components/v31-site-shell";
import styles from "./hidden-greece.module.css";

export const metadata: Metadata = {
  title: "Hidden Greece | Μέρη που δεν ήξερες ότι χρειάζεσαι",
  description: "Editorial TravelAI guide για λιγότερο προφανείς, nature-first αποδράσεις στην Ελλάδα — με travel pain gaps και reality checks.",
  alternates: { canonical: "/guides/hidden-greece" },
};

const discoveries = [
  {n:"01",region:"Αττική",place:"Λαυρεωτική · Χάος",gap:"Έχω μόνο μία μέρα αλλά θέλω κάτι που δεν μοιάζει με Αθήνα.",why:"Μεταλλευτικό τοπίο, γεωλογία και μια εντελώς διαφορετική πλευρά της Αττικής.",level:"EASY",image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=84"},
  {n:"02",region:"Θεσσαλία",place:"Κίσσαβος · Μεταξοχώρι · Καλυψώ",gap:"Θέλω βουνό, νερά και χωριά χωρίς να ξαναπάω στα ίδια.",why:"Δάση, καταρράκτες και μικρά χωριά με πολύ λιγότερη προβολή από το γειτονικό Πήλιο.",level:"EASY / MODERATE",image:"https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1400&q=84"},
  {n:"03",region:"Ευρυτανία",place:"Επινιανά · Άσπρορεμα · Άγραφα",gap:"Θέλω πραγματικό digital detox.",why:"Απομόνωση, μεγάλα ορεινά τοπία και road-trip αίσθηση μακριά από οργανωμένο resort.",level:"EXPLORER",image:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=84"},
  {n:"04",region:"Τζουμέρκα",place:"Θεοδώριανα · Σούδα",gap:"Θέλω wow νερά και βουνό χωρίς το κλασικό route.",why:"Καταρράκτες, άγρια φύση και ένα ορεινό χωριό που ανοίγει πιο ανεξερεύνητες διαδρομές.",level:"MODERATE",image:"https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1400&q=84"},
  {n:"05",region:"Ανατολικό Ζαγόρι",place:"Ηλιοχώρι · Balta di Striga",gap:"Θέλω Ζαγόρι χωρίς το πλήθος.",why:"Καταρράκτες, φυσικές βάθρες και δάσος — μια διαφορετική εμπειρία Ζαγορίου.",level:"MODERATE",image:"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=84"},
  {n:"06",region:"Γρεβενά",place:"Σπήλαιο · Πορτίτσα",gap:"Θέλω δραματικό τοπίο χωρίς πολυήμερο trekking.",why:"Φαράγγι, πέτρινο γεφύρι και γεωλογία έξω από το mainstream weekend circuit.",level:"MODERATE",image:"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=84"},
  {n:"07",region:"Γράμμος",place:"Αρρένες · Αετομηλίτσα",gap:"Θέλω ελληνική alpine wilderness.",why:"Ψηλό βουνό, δάση και απομόνωση. Δεν είναι casual weekend — κι αυτό είναι το νόημα.",level:"EXPLORER",image:"https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1400&q=84"},
  {n:"08",region:"Πρέσπες",place:"Άγιος Αχίλλειος · Μικρή Πρέσπα",gap:"Θέλω ησυχία, φωτογραφία και ιστορία.",why:"Νερό, βουνό, βυζαντινή μνήμη και μια σπάνια αίσθηση αργού ταξιδιού.",level:"EASY",image:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=84"},
  {n:"09",region:"Δράμα · Ροδόπη",place:"Φρακτό · περιμετρικές διαδρομές",gap:"Θέλω να πλησιάσω πραγματικά αρχέγονη φύση.",why:"Η αξία είναι και το όριο: προστατευόμενη φύση, αυστηροί κανόνες και εμπειρία που απαιτεί σεβασμό.",level:"EXPLORER",image:"https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=84"},
  {n:"10",region:"Πάρνωνας",place:"Καστάνιτσα · Πραστός",gap:"Θέλω παραμυθένιο χωριό χωρίς Δημητσάνα.",why:"Τσακώνικη ταυτότητα, καστανόδασος και ιστορικοί οικισμοί με ισχυρή προσωπικότητα.",level:"EASY",image:"https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1400&q=84"},
  {n:"11",region:"Χελμός · Φενεός",place:"Στύγα · Φενεός · γεωτοπία",gap:"Θέλω myth + geology, όχι απλώς Καλάβρυτα.",why:"Το τοπίο αποκτά άλλο νόημα μέσα από μύθο, γεωλογία και υψόμετρο.",level:"MODERATE",image:"https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=84"},
  {n:"12",region:"Ορεινή Κρήτη",place:"Ρούβας · Ψηλορείτης",gap:"Θέλω Κρήτη χωρίς resort και παραλία.",why:"Δάσος, φαράγγια, οροπέδια και η ορεινή εκδοχή της Κρήτης που συχνά μένει έξω από την πρώτη εικόνα του νησιού.",level:"MODERATE",image:"https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1400&q=84"},
];

export default function HiddenGreecePage(){
 return <V31PageFrame lang="el">
  <section className={styles.hero}>
   <div className={styles.heroPhoto}/>
   <div className={styles.heroShade}/>
   <div className={styles.heroCopy}>
    <span className={styles.eyebrow}>TRAVELAI LIBRARY · VOLUME 01</span>
    <h1>HIDDEN<br/><em>GREECE</em></h1>
    <p>Μέρη που δεν σου λείπουν επειδή δεν ήξερες ότι υπάρχουν.</p>
    <div className={styles.heroActions}><a href="#discoveries">Ανακάλυψέ τα ↓</a><a href="/ai-planner">Βρες τι σου ταιριάζει →</a></div>
   </div>
  </section>

  <section className={styles.manifesto}>
   <div><span className={styles.eyebrow}>THE IDEA</span><h2>Δεν ψάχνουμε το “ωραίο”.<br/>Ψάχνουμε το <em>αναπάντεχο.</em></h2></div>
   <p>Κάθε μέρος μπαίνει επειδή λύνει ένα πραγματικό travel pain gap: λίγος χρόνος, ανάγκη για ησυχία, crowd fatigue, ανάγκη για φύση, περιπέτεια ή μια εμπειρία που δεν θυμίζει το κλασικό ελληνικό weekend.</p>
  </section>

  <section className={styles.swap}>
   <span className={styles.eyebrow}>SWAP THE OBVIOUS</span>
   <div><p>Αν σκέφτεσαι <strong>Πάπιγκο</strong><br/>κοίτα <b>Ηλιοχώρι.</b></p><p>Αν σκέφτεσαι <strong>Δημητσάνα</strong><br/>κοίτα <b>Καστάνιτσα.</b></p><p>Αν σκέφτεσαι <strong>Πήλιο</strong><br/>κοίτα <b>Κίσσαβο.</b></p></div>
  </section>

  <section id="discoveries" className={styles.discoveries}>
   <div className={styles.sectionHead}><div><span className={styles.eyebrow}>12 DISCOVERIES</span><h2>Η Ελλάδα έξω από<br/>το προφανές.</h2></div><p>Easy, moderate και explorer επιλογές. Όχι όλες για όλους — και αυτό είναι μέρος της αξίας τους.</p></div>
   <div className={styles.grid}>{discoveries.map(item=><article className={styles.card} key={item.place}>
    <div className={styles.image} style={{backgroundImage:`linear-gradient(180deg,transparent 32%,rgba(8,24,18,.76)),url("${item.image}")`}}><span>{item.n} · {item.region}</span><b>{item.level}</b></div>
    <div className={styles.body}><h3>{item.place}</h3><p className={styles.gap}>“{item.gap}”</p><p>{item.why}</p></div>
   </article>)}</div>
  </section>

  <section className={styles.rules}>
   <div><span className={styles.eyebrow}>EDITORIAL RULES</span><h2>Τι σημαίνει “hidden” για εμάς.</h2></div>
   <div className={styles.ruleGrid}>
    <article><b>01</b><h3>Όχι απλώς άγνωστο.</h3><p>Πρέπει να έχει αρκετή αξία ώστε να δικαιολογεί το ταξίδι.</p></article>
    <article><b>02</b><h3>Reality check.</h3><p>Δρόμος, καιρός, δυσκολία και περιορισμοί έχουν την ίδια βαρύτητα με τη φωτογραφία.</p></article>
    <article><b>03</b><h3>Wild ≠ accessible.</h3><p>Οι αυστηρά προστατευόμενες ζώνες δεν παρουσιάζονται σαν τουριστικά spots.</p></article>
    <article><b>04</b><h3>Το stay έρχεται μετά.</h3><p>Πρώτα αποφασίζουμε ότι το μέρος αξίζει· μετά χτίζουμε γύρω του διαμονή και itinerary.</p></article>
   </div>
  </section>

  <section className={styles.cta}>
   <span className={styles.eyebrow}>YOUR NEXT ESCAPE</span><h2>Ποιο από αυτά<br/>είναι το δικό σου;</h2>
   <p>Δώσε στο TravelAI χρόνο, budget, παρέα και mood. Ο AI Planner θα τα μετατρέψει σε πραγματική ταξιδιωτική απόφαση.</p>
   <a href="/ai-planner">Βρες την απόδρασή μου →</a>
  </section>
 </V31PageFrame>
}
