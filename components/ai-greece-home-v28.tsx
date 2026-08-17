"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarBlank,
  Compass,
  ForkKnife,
  Heart,
  Leaf,
  MapPin,
  Mountains,
  ShieldCheck,
  Sparkle,
  SunHorizon,
  UsersThree,
  Waves,
} from "@phosphor-icons/react";
import type { EntryMode, TripRequest } from "@/lib/validation/trip";
import type { WeeklyPick } from "@/lib/decision/weekly-pick";

type Lang = "el" | "en";
type Mood = TripRequest["moods"][number];

type StartDetail = {
  mode: EntryMode;
  text?: string;
  destination?: string;
  moods?: Mood[];
};

const say = (lang: Lang, el: string, en: string) => (lang === "el" ? el : en);

const moodOptions: Array<{ value: Mood; el: string; en: string; icon: typeof Heart }> = [
  { value: "relax", el: "Απόλυτη χαλάρωση", en: "Slow down", icon: Waves },
  { value: "romantic", el: "Ρομαντικό", en: "Romance", icon: Heart },
  { value: "food", el: "Φαγητό & κρασί", en: "Food & wine", icon: ForkKnife },
  { value: "nature", el: "Φύση", en: "Nature", icon: Leaf },
  { value: "culture", el: "Πολιτισμός", en: "Culture", icon: Mountains },
  { value: "warmth", el: "Ήλιος & θάλασσα", en: "Sun & sea", icon: SunHorizon },
];

const destinations = [
  {
    slug: "milos",
    el: "Μήλος",
    en: "Milos",
    kickerEl: "Ηφαιστειακές ακτές · ζευγάρια",
    kickerEn: "Volcanic coast · couples",
    moods: ["romantic", "relax", "warmth"] as Mood[],
    score: 96,
  },
  {
    slug: "chania",
    el: "Χανιά",
    en: "Chania",
    kickerEl: "Παραλίες · φαγητό · road trips",
    kickerEn: "Beaches · food · road trips",
    moods: ["food", "culture", "warmth"] as Mood[],
    score: 94,
  },
  {
    slug: "naxos",
    el: "Νάξος",
    en: "Naxos",
    kickerEl: "Οικογένεια · χωριά · μεγάλες παραλίες",
    kickerEn: "Family · villages · long beaches",
    moods: ["relax", "food", "warmth"] as Mood[],
    score: 93,
  },
  {
    slug: "corfu",
    el: "Κέρκυρα",
    en: "Corfu",
    kickerEl: "Πράσινο · αρχιτεκτονική · Ιόνιο",
    kickerEn: "Green landscapes · heritage · Ionian",
    moods: ["nature", "culture", "romantic"] as Mood[],
    score: 91,
  },
];

const regions = [
  { slug: "cyclades", destination: "naxos", el: "Κυκλάδες", en: "Cyclades", lineEl: "Λευκό, μπλε, φως", lineEn: "White, blue, light", icon: SunHorizon },
  { slug: "crete", destination: "chania", el: "Κρήτη", en: "Crete", lineEl: "Πλήρες ταξίδι σε ένα νησί", lineEn: "A complete trip in one island", icon: Mountains },
  { slug: "ionian", destination: "corfu", el: "Ιόνιο", en: "Ionian", lineEl: "Πράσινο και τιρκουάζ", lineEn: "Green and turquoise", icon: Leaf },
  { slug: "peloponnese", destination: "nafplio", el: "Πελοπόννησος", en: "Peloponnese", lineEl: "Road trip, ιστορία, ακτές", lineEn: "Road trips, history, coast", icon: MapPin },
];

export function AiGreeceHomeV28({ weeklyPick, initialLang = "el" }: { weeklyPick: WeeklyPick | null; initialLang?: Lang }) {
  const [lang] = useState<Lang>(initialLang);
  const [prompt, setPrompt] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>(["relax", "warmth"]);

  const promptExample = useMemo(
    () => say(lang, "7 μέρες τον Σεπτέμβριο, ήρεμο νησί, καλό φαγητό, χωρίς πολύ οδήγηση, έως €1.500.", "7 days in September, a calm island, great food, little driving, up to €1,500."),
    [lang],
  );

  function toggleMood(value: Mood) {
    setSelectedMoods(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value].slice(-3));
  }

  function start(detail: StartDetail) {
    window.dispatchEvent(new CustomEvent<StartDetail>("travel:v28-start", { detail }));
  }

  function startPrompt() {
    start({
      mode: "unknown",
      text: prompt.trim() || promptExample,
      moods: selectedMoods.length ? selectedMoods : ["relax", "warmth"],
    });
  }

  return (
    <div className="ai-greece-v28">
      <header className="v28-nav" aria-label={say(lang, "Κύρια πλοήγηση", "Main navigation")}>
        <a className="v28-brand" href={lang === "el" ? "/" : "/en"}>
          <span className="v28-brand-mark"><Compass size={22} weight="fill" /></span>
          <span><strong>AI GREECE</strong><small>Travel Intelligence</small></span>
        </a>
        <nav>
          <a href="#v28-inspire">{say(lang, "Έμπνευση", "Inspire me")}</a>
          <a href="#v28-regions">{say(lang, "Ελλάδα", "Explore Greece")}</a>
          <a href={lang === "el" ? "/ai-map" : "/en/ai-map"}>{say(lang, "AI Χάρτης", "AI Map")}</a>
          <a href="#v28-how">{say(lang, "Πώς δουλεύει", "How it works")}</a>
        </nav>
        <div className="v28-nav-actions">
          <div className="v28-language" aria-label="Language">
            <a className={lang === "el" ? "active" : ""} href="/">EL</a>
            <a className={lang === "en" ? "active" : ""} href="/en">EN</a>
          </div>
          <button onClick={() => start({ mode: "unknown", moods: selectedMoods })}>{say(lang, "Σχεδίασε ταξίδι", "Plan a trip")} <ArrowRight size={16} /></button>
        </div>
      </header>

      <main>
        <section className="v28-hero" aria-labelledby="v28-hero-title">
          <div className="v28-hero-photo" aria-hidden="true" />
          <div className="v28-hero-scrim" aria-hidden="true" />
          <div className="v28-hero-content">
            <div className="v28-hero-copy">
              <span className="v28-kicker"><Sparkle size={15} weight="fill" /> {say(lang, "AI TRAVEL · GREECE", "AI TRAVEL · GREECE")}</span>
              <h1 id="v28-hero-title">
                {say(lang, "Μην ψάχνεις απλώς", "Don’t just search")}
                <span>{say(lang, "πού να πας.", "where to go.")}</span>
                <em>{say(lang, "Βρες πού ταιριάζεις.", "Find where you belong.")}</em>
              </h1>
              <p>{say(lang, "Ένας AI travel advisor για την Ελλάδα που καταλαβαίνει διάθεση, budget, εποχή και τρόπο ταξιδιού — πριν σου δείξει οποιοδήποτε κατάλυμα.", "An AI travel advisor for Greece that understands mood, budget, season and travel style — before it shows you a single stay.")}</p>
              <div className="v28-proof-row">
                <span><ShieldCheck size={17} /> {say(lang, "Evidence-backed επιλογές", "Evidence-backed choices")}</span>
                <span><Sparkle size={17} /> {say(lang, "AI match, όχι φίλτρα", "AI matching, not filters")}</span>
              </div>
            </div>

            <div className="v28-composer" aria-label={say(lang, "AI σχεδιαστής ταξιδιού", "AI trip composer")}>
              <div className="v28-composer-head">
                <span className="v28-ai-dot"><Sparkle size={16} weight="fill" /></span>
                <div><strong>{say(lang, "Πες μου τι ταξίδι χρειάζεσαι", "Tell me the trip you need")}</strong><small>{say(lang, "Γράψε όπως θα μιλούσες σε έναν ταξιδιωτικό σύμβουλο.", "Write as you would speak to a travel advisor.")}</small></div>
              </div>
              <textarea value={prompt} onChange={event => setPrompt(event.target.value)} placeholder={promptExample} rows={4} />
              <div className="v28-mood-list">
                {moodOptions.map(item => {
                  const Icon = item.icon;
                  return <button key={item.value} className={selectedMoods.includes(item.value) ? "active" : ""} onClick={() => toggleMood(item.value)}><Icon size={15} /> {lang === "el" ? item.el : item.en}</button>;
                })}
              </div>
              <button className="v28-submit" onClick={startPrompt}>
                <span>{say(lang, "Βρες το ταξίδι μου", "Find my trip")}</span>
                <ArrowRight size={19} weight="bold" />
              </button>
              <div className="v28-composer-foot"><span><CalendarBlank size={15} /> {say(lang, "Ημερομηνίες στο επόμενο βήμα", "Dates in the next step")}</span><span>{say(lang, "EL / EN", "EL / EN")}</span></div>
            </div>
          </div>

          <div className="v28-hero-rail" aria-label={say(lang, "Γρήγορες επιλογές", "Quick choices")}>
            <button onClick={() => start({ mode: "surprise", moods: ["adventure", "warmth"] })}><Sparkle size={18} /><span>{say(lang, "Κάνε μου έκπληξη", "Surprise me")}</span><small>{say(lang, "Άφησε τον AI να διαλέξει", "Let AI choose")}</small></button>
            <button onClick={() => start({ mode: "idea" })}><MapPin size={18} /><span>{say(lang, "Έχω προορισμό", "I have a place")}</span><small>{say(lang, "Έλεγξέ τον αντικειμενικά", "Pressure-test it")}</small></button>
            <button onClick={() => start({ mode: "unknown", moods: ["relax", "food"] })}><Waves size={18} /><span>{say(lang, "Θέλω απλώς να φύγω", "I just need a break")}</span><small>{say(lang, "Ξεκίνα από το συναίσθημα", "Start from the feeling")}</small></button>
          </div>
        </section>

        <section id="v28-inspire" className="v28-section v28-inspire">
          <div className="v28-section-head">
            <div><span className="v28-overline">{say(lang, "MATCHED TO A FEELING", "MATCHED TO A FEELING")}</span><h2>{say(lang, "Η Ελλάδα δεν είναι μία επιλογή.", "Greece is not one choice.")}<br />{say(lang, "Είναι εκατοντάδες διαφορετικά ταξίδια.", "It is hundreds of different trips.")}</h2></div>
            <p>{say(lang, "Ξεκίνα από το πώς θέλεις να νιώσεις — και άσε τον decision engine να περιορίσει τον θόρυβο.", "Start with how you want to feel and let the decision engine remove the noise.")}</p>
          </div>
          <div className="v28-destination-grid">
            {destinations.map((destination, index) => (
              <button key={destination.slug} className={`v28-destination-card card-${index + 1}`} onClick={() => start({ mode: "idea", destination: destination.slug, moods: destination.moods })}>
                <span className="v28-card-photo" style={{ backgroundImage: `url('/api/destination-photo?slug=${destination.slug}')` }} />
                <span className="v28-card-shade" />
                <span className="v28-match"><strong>{destination.score}%</strong> AI match</span>
                <span className="v28-card-copy"><small>{lang === "el" ? destination.kickerEl : destination.kickerEn}</small><strong>{lang === "el" ? destination.el : destination.en}</strong><span>{say(lang, "Δες αν μου ταιριάζει", "See if it fits me")} <ArrowRight size={17} /></span></span>
              </button>
            ))}
          </div>
        </section>

        <section id="v28-regions" className="v28-section v28-regions">
          <div className="v28-region-copy">
            <span className="v28-overline">{say(lang, "EXPLORE GREECE", "EXPLORE GREECE")}</span>
            <h2>{say(lang, "Διάλεξε περιοχή.", "Choose a region.")}<br /><em>{say(lang, "Ή άσε τον AI να σε πάει αλλού.", "Or let AI take you elsewhere.")}</em></h2>
            <p>{say(lang, "Κάθε περιοχή αλλάζει τον ρυθμό, τη μετακίνηση και το είδος των διακοπών. Δεν βαθμολογούμε μόνο την ομορφιά — βαθμολογούμε το fit.", "Every region changes pace, transport and the shape of the holiday. We do not score beauty alone — we score fit.")}</p>
            <button onClick={() => start({ mode: "surprise" })}><Sparkle size={17} /> {say(lang, "AI επιλογή για εμένα", "AI pick for me")}</button>
          </div>
          <div className="v28-region-board">
            {regions.map(region => {
              const Icon = region.icon;
              return <button key={region.slug} onClick={() => start({ mode: "idea", destination: region.destination })}><Icon size={24} weight="duotone" /><span><strong>{lang === "el" ? region.el : region.en}</strong><small>{lang === "el" ? region.lineEl : region.lineEn}</small></span><ArrowRight size={17} /></button>;
            })}
          </div>
        </section>

        <section id="v28-how" className="v28-section v28-how">
          <div className="v28-section-head compact">
            <div><span className="v28-overline">{say(lang, "NOT A BOOKING CLONE", "NOT A BOOKING CLONE")}</span><h2>{say(lang, "Πρώτα η απόφαση. Μετά το κατάλυμα.", "Decision first. Stay second.")}</h2></div>
          </div>
          <div className="v28-how-grid">
            <article><span>01</span><Heart size={25} weight="duotone" /><h3>{say(lang, "Καταλαβαίνει το ταξίδι", "Understands the trip")}</h3><p>{say(lang, "Διάθεση, παρέα, budget, ημερομηνίες και πραγματικές κόκκινες γραμμές.", "Mood, company, budget, dates and the real red lines.")}</p></article>
            <article><span>02</span><Compass size={25} weight="duotone" /><h3>{say(lang, "Συγκρίνει διαφορετικούς δρόμους", "Compares different paths")}</h3><p>{say(lang, "Όχι δέκα σχεδόν ίδιες λίστες. Πραγματικά διαφορετικές επιλογές με trade-offs.", "Not ten nearly identical lists. Genuinely different choices with trade-offs.")}</p></article>
            <article><span>03</span><ShieldCheck size={25} weight="duotone" /><h3>{say(lang, "Αμφισβητεί την εύκολη απάντηση", "Challenges the easy answer")}</h3><p>{say(lang, "Εποχή, πρόσβαση, κόπος, stay constraints και evidence περνούν από έλεγχο.", "Season, access, effort, stay constraints and evidence are checked.")}</p></article>
            <article><span>04</span><Sparkle size={25} weight="duotone" /><h3>{say(lang, "Εξηγεί γιατί", "Explains why")}</h3><p>{say(lang, "Παίρνεις match score, λόγους επιλογής και τι χάνεις αν διαλέξεις κάτι άλλο.", "You get a match score, reasons and the trade-off behind the choice.")}</p></article>
          </div>
        </section>

        {weeklyPick && <section className="v28-weekly">
          <div className="v28-weekly-photo" style={{ backgroundImage: `url('/api/destination-photo?slug=${weeklyPick.slug}&start_date=${weeklyPick.startDate}&end_date=${weeklyPick.endDate}')` }} />
          <div className="v28-weekly-copy">
            <span className="v28-overline">{say(lang, "AI ESCAPE OF THE WEEK", "AI ESCAPE OF THE WEEK")}</span>
            <h2>{lang === "el" ? weeklyPick.destination : weeklyPick.destinationEn}</h2>
            <p>{lang === "el" ? weeklyPick.reasonEl : weeklyPick.reasonEn}</p>
            <button onClick={() => start({ mode: "idea", destination: weeklyPick.slug })}>{say(lang, "Έλεγξέ το για εμένα", "Check it for me")} <ArrowRight size={18} /></button>
          </div>
        </section>}

        <section className="v28-final-cta">
          <div><Sparkle size={24} weight="fill" /><span>{say(lang, "AI GREECE TRAVEL", "AI GREECE TRAVEL")}</span></div>
          <h2>{say(lang, "Το επόμενο ταξίδι σου δεν χρειάζεται περισσότερα tabs.", "Your next trip does not need more tabs.")}<br /><em>{say(lang, "Χρειάζεται καλύτερη απόφαση.", "It needs a better decision.")}</em></h2>
          <button onClick={() => start({ mode: "unknown", moods: selectedMoods })}>{say(lang, "Ξεκίνα με τον AI Travel Advisor", "Start with the AI Travel Advisor")} <ArrowRight size={19} /></button>
        </section>
      </main>
    </div>
  );
}