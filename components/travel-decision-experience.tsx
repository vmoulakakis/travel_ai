"use client";

import { useMemo, useRef, useState } from "react";
import {
  AirplaneTilt,
  ArrowRight,
  Buildings,
  CalendarBlank,
  Check,
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
import type { TripRequest, Month } from "@/lib/validation/trip";
import type { V8Recommendation, V8RecommendationResponse, V8StayOffer, V8StayResponse } from "@/lib/decision/v8-types";
import type { DestinationInsightsResponse } from "@/lib/decision/types";
import type { ContinuityEnvelope } from "@/lib/continuity";
import type { SmartDateWindow } from "@/lib/decision/date-windows-v9";

type Lang = "el" | "en";
type EntryMode = "unknown" | "idea" | "surprise";
type StreamEvent = { type: string; message?: string; result?: V8RecommendationResponse; continuity?: ContinuityEnvelope };

const say = (lang: Lang, el: string, en: string) => (lang === "el" ? el : en);
const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const nightsBetween = (start: string, end: string) => Math.max(2, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000));
const monthFromDate = (iso: string): Month => Number(iso.slice(5, 7)) === 9 ? "september" : Number(iso.slice(5, 7)) === 10 ? "october" : Number(iso.slice(5, 7)) === 11 ? "november" : "flexible";
const prettyDate = (iso: string, lang: Lang) => new Intl.DateTimeFormat(lang === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00Z`));

const defaultTrip: TripRequest = {
  origin: "Athens",
  startDate: "2026-09-18",
  endDate: "2026-09-22",
  month: "september",
  nights: 4,
  budget: 800,
  moods: ["relax", "food"],
  travelerType: "couple",
  language: "el",
  distancePreference: "easy-hop",
  pace: "balanced",
  hotelStyle: "boutique",
  avoid: "crowds",
};

const moodOptions = [
  { value: "relax", el: "Να αποσυνδεθώ", en: "Switch off" },
  { value: "romantic", el: "Να ξαναβρεθούμε", en: "Reconnect" },
  { value: "food", el: "Να φάω πραγματικά καλά", en: "Eat very well" },
  { value: "culture", el: "Να νιώσω τον τόπο", en: "Feel the place" },
  { value: "city", el: "Να έχω ζωντάνια", en: "Feel the energy" },
  { value: "nature", el: "Να πάρω ανάσα", en: "Breathe again" },
  { value: "adventure", el: "Να ζήσω κάτι νέο", en: "Try something new" },
  { value: "warmth", el: "Ήλιο και θάλασσα", en: "Sun and sea" },
] as const;

const stageLabels: Record<string, [string, string]> = {
  "understand:start": ["Η Ψυχολόγος του ταξιδιού διαβάζει πίσω από τις απαντήσεις", "Your travel psychologist reads between the answers"],
  "understand:ready": ["Το πραγματικό σου ζητούμενο έγινε ξεκάθαρο", "Your real need is now clear"],
  "catalog:start": ["Ο Explorer ανοίγει όλη την Ελλάδα", "The Explorer opens up all of Greece"],
  "catalog:ready": ["21 ελληνικοί προορισμοί μπήκαν στη σύγκριση", "21 Greek destinations entered the comparison"],
  "shortlist:ready": ["Ο Matchmaker κράτησε μόνο όσα έχουν προσωπικό λόγο", "The Matchmaker kept only meaningful fits"],
  "weather:start": ["Ο Season Keeper ελέγχει αν οι ημερομηνίες στέκουν", "The Season Keeper checks whether the dates work"],
  "weather:ready": ["Καιρός και εποχή πέρασαν τον έλεγχο", "Weather and season passed the check"],
  "verify:start": ["Ο Skeptic ψάχνει λόγο να απορρίψει τις επιλογές", "The Skeptic looks for reasons to reject the choices"],
  "verify:ready": ["Οι αδύναμες επιλογές αποκλείστηκαν", "Weak choices were removed"],
  "council:start": ["Δύο ανεξάρτητες φωνές υπερασπίζονται την τελική επιλογή", "Two independent voices defend the final choice"],
  "council:ready": ["Η ομάδα κατέληξε στα τρία ταξίδια που αξίζουν", "The team agreed on the three trips worth taking"],
};

export function TravelDecisionExperience() {
  const [lang, setLang] = useState<Lang>("el");
  const [trip, setTrip] = useState<TripRequest>(defaultTrip);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<V8RecommendationResponse | null>(null);
  const [selected, setSelected] = useState<V8Recommendation | null>(null);
  const [stayData, setStayData] = useState<V8StayResponse | null>(null);
  const [insights, setInsights] = useState<DestinationInsightsResponse | null>(null);
  const [stayLoading, setStayLoading] = useState(false);
  const running = useRef(false);

  const stayOffers = useMemo(() => {
    return [...(stayData?.offers ?? [])]
      .filter(offer => Boolean(offer.validTo) && Date.parse(offer.validTo as string) >= Date.parse(`${trip.endDate}T00:00:00Z`) && offer.trackingUrl.includes("/CD104/"))
      .sort((a, b) => offerScore(b, trip.hotelStyle) - offerScore(a, trip.hotelStyle))
      .slice(0, 3);
  }, [stayData, trip.endDate, trip.hotelStyle]);

  const patch = <K extends keyof TripRequest>(key: K, value: TripRequest[K]) => setTrip(current => ({ ...current, [key]: value }));
  const setDates = (start: string, end: string) => {
    const safeEnd = !end || Date.parse(end) <= Date.parse(start) ? addDays(start, 4) : end;
    setTrip(current => ({ ...current, startDate: start, endDate: safeEnd, nights: nightsBetween(start, safeEnd), month: monthFromDate(start) }));
  };
  const toggleMood = (value: TripRequest["moods"][number]) => setTrip(current => {
    const exists = current.moods.includes(value);
    const next = exists ? current.moods.filter(item => item !== value) : [...current.moods, value].slice(-3);
    return next.length ? { ...current, moods: next } : current;
  });

  function begin(mode: EntryMode) {
    setEntryMode(mode);
    setStep(0);
    setResult(null);
    setSelected(null);
    if (mode === "surprise") setTrip(current => ({ ...current, distancePreference: "any", tripText: say(lang, "Θέλω μια απρόσμενη επιλογή στην Ελλάδα που να μου ταιριάζει πραγματικά.", "I want an unexpected Greek destination that genuinely fits me.") }));
    setTimeout(() => document.getElementById("discovery")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  async function run() {
    if (running.current) return;
    running.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected(null);
    setStayData(null);
    setInsights(null);
    setEvents([]);
    let final = false;
    try {
      const response = await fetch("/api/recommend/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...trip, language: lang }) });
      if (!response.ok || !response.body) throw new Error(say(lang, "Δεν μπόρεσα να ξεκινήσω τη σύγκριση.", "I could not start the comparison."));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "continuity") throw new Error(event.continuity?.message[lang] ?? say(lang, "Η ομάδα κράτησε τις επιλογές σου. Δοκίμασε ξανά σε λίγο.", "The team saved your choices. Try again in a moment."));
          if (event.type === "error") throw new Error(say(lang, "Η ομάδα δεν ολοκλήρωσε τον έλεγχο. Δοκίμασε ξανά.", "The team could not complete its checks. Try again."));
          if (event.type === "final" && event.result) {
            final = true;
            setResult(event.result);
            setTrip(event.result.request);
            await reader.cancel();
            setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
            break;
          }
          setEvents(previous => [...previous.filter(item => item.type !== event.type), event].slice(-6));
        }
        if (final) break;
      }
      if (!final) throw new Error(say(lang, "Η σύγκριση σταμάτησε πριν από την απόφαση.", "The comparison stopped before the decision."));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : say(lang, "Κάτι δεν πήγε σωστά.", "Something went wrong."));
    } finally {
      running.current = false;
      setLoading(false);
    }
  }

  async function choose(recommendation: V8Recommendation) {
    setSelected(recommendation);
    setStayData(null);
    setInsights(null);
    setStayLoading(true);
    setTimeout(() => document.getElementById("destination")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    try {
      const url = new URL("/api/destination-detail", window.location.origin);
      url.searchParams.set("slug", recommendation.slug);
      url.searchParams.set("start_date", trip.startDate);
      url.searchParams.set("end_date", trip.endDate);
      const insightUrl = new URL("/api/destination-insights", window.location.origin);
      insightUrl.searchParams.set("destination", recommendation.destination);
      insightUrl.searchParams.set("lat", String(recommendation.latitude));
      insightUrl.searchParams.set("lon", String(recommendation.longitude));
      insightUrl.searchParams.set("lang", lang);
      insightUrl.searchParams.set("traveler", trip.travelerType);
      insightUrl.searchParams.set("moods", trip.moods.join(","));
      insightUrl.searchParams.set("nights", String(trip.nights));
      const [stayResponse, insightResponse] = await Promise.allSettled([fetch(url), fetch(insightUrl)]);
      if (stayResponse.status === "fulfilled" && stayResponse.value.ok) setStayData(await stayResponse.value.json() as V8StayResponse);
      if (insightResponse.status === "fulfilled" && insightResponse.value.ok) setInsights(await insightResponse.value.json() as DestinationInsightsResponse);
    } catch {
      setStayData({ version: 9, slug: recommendation.slug, startDate: trip.startDate, endDate: trip.endDate, offers: [], availabilityMeaning: "full-trip-validity-confirm-before-booking" });
    } finally {
      setStayLoading(false);
    }
  }

  async function selectWindow(dateWindow: SmartDateWindow) {
    setDates(dateWindow.startDate, dateWindow.endDate);
    if (!selected) return;
    setStayLoading(true);
    setStayData(null);
    try {
      const url = new URL("/api/destination-detail", window.location.origin);
      url.searchParams.set("slug", selected.slug);
      url.searchParams.set("start_date", dateWindow.startDate);
      url.searchParams.set("end_date", dateWindow.endDate);
      const response = await fetch(url);
      if (response.ok) setStayData(await response.json() as V8StayResponse);
    } finally {
      setStayLoading(false);
    }
  }

  return <div className="guru-v9">
    <header className="guru-nav">
      <a href="#top" className="guru-brand"><Compass size={25} weight="duotone" /><span><strong>ΕΛΛΗΝΙΚΟΣ AI</strong> TRAVEL GURU<small>{say(lang, "Η Ελλάδα που ταιριάζει σε εσένα", "Greece, matched to you")}</small></span></a>
      <nav aria-label={say(lang, "Κύρια πλοήγηση", "Main navigation")}><a href="#discovery">{say(lang, "Βρες το ταξίδι σου", "Find your trip")}</a><a href="#how">{say(lang, "Πώς αποφασίζει", "How it decides")}</a></nav>
      <div className="guru-language"><button className={lang === "el" ? "active" : ""} onClick={() => setLang("el")}>EL</button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button></div>
    </header>

    <main id="top">
      <section className="guru-hero">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkle size={16} weight="fill" /> {say(lang, "Η προσωπική σου ταξιδιωτική ομάδα", "Your personal travel team")}</span>
          <h1>{say(lang, "Δεν χρειάζεται να ξέρεις πού.", "You do not need to know where.")}<em>{say(lang, " Πες μας πώς θέλεις να νιώσεις.", " Tell us how you want to feel.")}</em></h1>
          <p>{say(lang, "Ο Guru συγκρίνει ολόκληρη την Ελλάδα με τις ημερομηνίες, το budget, την παρέα και τον πραγματικό λόγο που θέλεις να φύγεις — και υπερασπίζεται μόνο τρεις επιλογές.", "The Guru compares all of Greece against your dates, budget, company and the real reason you want to leave — then defends only three choices.")}</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => begin("unknown")}>{say(lang, "Δεν ξέρω πού να πάω", "I do not know where to go")} <ArrowRight size={18} weight="bold" /></button>
            <button onClick={() => begin("idea")}>{say(lang, "Έχω κάτι στο μυαλό μου", "I have an idea")}</button>
            <button onClick={() => begin("surprise")}><Sparkle size={17} /> {say(lang, "Κάνε μου έκπληξη", "Surprise me")}</button>
          </div>
          <div className="trust-row"><span><ShieldCheck size={18} weight="duotone" /> {say(lang, "Πραγματικές φωτογραφίες", "Real photos")}</span><span><CalendarBlank size={18} weight="duotone" /> {say(lang, "Έλεγχος ημερομηνιών", "Date checks")}</span><span><Check size={18} weight="bold" /> {say(lang, "Ειλικρινές trade-off", "Honest trade-off")}</span></div>
        </div>
        <div className="hero-gallery" aria-label={say(lang, "Πραγματικές εικόνες καταλυμάτων από την Ελλάδα", "Real accommodation images from Greece")}>
          <DbPhoto slug="corfu" className="gallery-main" label="Κέρκυρα" />
          <DbPhoto slug="chania" className="gallery-top" label="Χανιά" />
          <DbPhoto slug="santorini" className="gallery-bottom" label="Σαντορίνη" />
          <div className="gallery-stamp"><strong>21</strong><span>{say(lang, "προορισμοί σε μία απόφαση", "destinations in one decision")}</span></div>
        </div>
      </section>

      <section id="how" className="guru-promise">
        <div><span>01</span><Heart size={27} weight="duotone" /><h2>{say(lang, "Σε καταλαβαίνει", "Understands you")}</h2><p>{say(lang, "Όχι μόνο φίλτρα. Μαθαίνει τι χρειάζεσαι από αυτό το ταξίδι.", "Beyond filters. It learns what you need from this trip.")}</p></div>
        <div><span>02</span><ShieldCheck size={27} weight="duotone" /><h2>{say(lang, "Αμφισβητεί", "Challenges")}</h2><p>{say(lang, "Ελέγχει εποχή, κόπο μετάβασης και όσα μπορούν να χαλάσουν την επιλογή.", "It checks season, travel effort and the details that could spoil the choice.")}</p></div>
        <div><span>03</span><Compass size={27} weight="duotone" /><h2>{say(lang, "Παίρνει θέση", "Takes a position")}</h2><p>{say(lang, "Μία δυνατή πρόταση, δύο διαφορετικές εναλλακτικές και καθαρό γιατί.", "One strong recommendation, two distinct alternatives and a clear why.")}</p></div>
      </section>

      <section id="discovery" className={`discovery ${entryMode ? "open" : ""}`}>
        <div className="discovery-head">
          <div><span className="eyebrow">{say(lang, "TRAVEL MOOD CHECK", "TRAVEL MOOD CHECK")}</span><h2>{say(lang, "Λίγα σωστά πράγματα. Όχι ανάκριση.", "A few right questions. Not an interrogation.")}</h2></div>
          <div className="step-meter" aria-label={`${step + 1}/3`}><span style={{ width: `${(step + 1) * 33.333}%` }} /><small>{step + 1}/3</small></div>
        </div>

        {entryMode && step === 0 && <div className="question-stage">
          <Question title={say(lang, "Από πού ξεκινάς;", "Where do you start?")}><div className="choice-row"><Choice active={trip.origin === "Athens"} onClick={() => patch("origin", "Athens")}>Αθήνα</Choice><Choice active={trip.origin === "Thessaloniki"} onClick={() => patch("origin", "Thessaloniki")}>Θεσσαλονίκη</Choice></div></Question>
          <Question title={say(lang, "Πότε θέλεις να φύγεις;", "When do you want to leave?")}><div className="date-row"><label><span>{say(lang, "Άφιξη", "Arrival")}</span><input aria-label={say(lang, "Ημερομηνία άφιξης", "Arrival date")} type="date" min="2026-08-09" value={trip.startDate} onChange={event => setDates(event.target.value, trip.endDate)} /></label><ArrowRight size={18} /><label><span>{say(lang, "Αναχώρηση", "Departure")}</span><input aria-label={say(lang, "Ημερομηνία αναχώρησης", "Departure date")} type="date" min={addDays(trip.startDate, 2)} value={trip.endDate} onChange={event => setDates(trip.startDate, event.target.value)} /></label></div></Question>
          <Question title={say(lang, "Με ποιον μοιράζεσαι το ταξίδι;", "Who is coming with you?")}><div className="choice-row">{([['solo','Solo'],['couple',say(lang,'Ζευγάρι','Couple')],['family',say(lang,'Οικογένεια','Family')],['friends',say(lang,'Παρέα','Friends')]] as const).map(([value, label]) => <Choice key={value} active={trip.travelerType === value} onClick={() => patch("travelerType", value)}>{label}</Choice>)}</div></Question>
        </div>}

        {entryMode && step === 1 && <div className="question-stage">
          <Question title={say(lang, "Όταν επιστρέψεις, τι θέλεις να έχει αλλάξει μέσα σου;", "When you return, what should feel different?")} hint={say(lang, "Διάλεξε έως τρία.", "Choose up to three.")}><div className="mood-grid">{moodOptions.map(item => <button key={item.value} className={trip.moods.includes(item.value) ? "active" : ""} onClick={() => toggleMood(item.value)}><MoodIcon mood={item.value} /><span>{lang === "el" ? item.el : item.en}</span>{trip.moods.includes(item.value) && <Check size={17} weight="bold" />}</button>)}</div></Question>
          <Question title={say(lang, "Τι θα σου χαλούσε σίγουρα το ταξίδι;", "What would definitely spoil the trip?")}><div className="choice-row">{([['long-travel',say(lang,'Πολλή ταλαιπωρία','Too much travel')],['high-cost',say(lang,'Να ξεφύγει το κόστος','Cost running away')],['crowds',say(lang,'Υπερβολικός κόσμος','Too many crowds')],['none',say(lang,'Δεν έχω κόκκινη γραμμή','No red line')]] as const).map(([value, label]) => <Choice key={value} active={trip.avoid === value} onClick={() => patch("avoid", value)}>{label}</Choice>)}</div></Question>
        </div>}

        {entryMode && step === 2 && <div className="question-stage">
          <Question title={say(lang, "Ποιο είναι το συνολικό budget του ταξιδιού;", "What is the total trip budget?")} hint={say(lang, "Σήμα budget για όλη την παρέα — όχι υπόσχεση τιμής.", "A total-budget signal — not a price promise.")}><div className="budget-row">{[300, 500, 800, 1200, 1800].map(value => <Choice key={value} active={trip.budget === value} onClick={() => patch("budget", value)}>€{value}</Choice>)}</div></Question>
          <div className="question-pair"><Question title={say(lang, "Πόση μετακίνηση αντέχεις;", "How much travel effort feels okay?")}><div className="choice-row compact">{([['nearby',say(lang,'Κοντά','Nearby')],['easy-hop',say(lang,'Εύκολη μετάβαση','Easy hop')],['any',say(lang,'Όπου αξίζει','Wherever fits')],['island',say(lang,'Θέλω νησί','Island only')]] as const).map(([value, label]) => <Choice key={value} active={trip.distancePreference === value} onClick={() => patch("distancePreference", value)}>{label}</Choice>)}</div></Question><Question title={say(lang, "Πώς θέλεις να μένεις;", "How do you like to stay?")}><div className="choice-row compact">{([['boutique','Boutique'],['luxury','Luxury'],['value',say(lang,'Καλή αξία','Good value')],['resort','Resort'],['any',say(lang,'Ανοιχτός','Open')]] as const).map(([value, label]) => <Choice key={value} active={trip.hotelStyle === value} onClick={() => patch("hotelStyle", value)}>{label}</Choice>)}</div></Question></div>
          <Question title={entryMode === "idea" ? say(lang, "Ποιο μέρος σκέφτεσαι και τι σε τραβάει εκεί;", "Which place are you considering and why?") : say(lang, "Πες κάτι που δεν χώρεσε στις επιλογές.", "Tell us what the choices missed.")} hint={say(lang, "Προαιρετικό — μίλα φυσικά.", "Optional — speak naturally.")}><textarea maxLength={320} value={trip.tripText ?? ""} placeholder={say(lang, "π.χ. θέλω ήσυχα πρωινά, ωραίο φαγητό και λίγη ζωή το βράδυ, χωρίς να τρέχω", "e.g. quiet mornings, great food and a little evening energy, without rushing")} onChange={event => patch("tripText", event.target.value)} /></Question>
        </div>}

        {entryMode && <div className="discovery-actions">{step > 0 ? <button className="back" onClick={() => setStep(current => current - 1)}>{say(lang, "Πίσω", "Back")}</button> : <span />}{step < 2 ? <button className="next" onClick={() => setStep(current => current + 1)}>{say(lang, "Συνέχισε", "Continue")} <ArrowRight size={18} weight="bold" /></button> : <button className="next final" disabled={loading} onClick={() => void run()}>{say(lang, "Βρες το ταξίδι που μου ταιριάζει", "Find the trip that fits me")} <Sparkle size={18} weight="fill" /></button>}</div>}
        {error && <div className="guru-error" role="alert">{error}</div>}
      </section>

      {loading && <AgentCouncil events={events} lang={lang} />}

      {result && <section id="results" className="results-section">
        <div className="results-head"><div><span className="eyebrow">{say(lang, "Η ΑΠΟΦΑΣΗ ΤΗΣ ΟΜΑΔΑΣ", "THE TEAM DECISION")}</span><h2>{say(lang, "Τρία ταξίδια. Τρεις διαφορετικοί λόγοι να φύγεις.", "Three trips. Three different reasons to go.")}</h2></div><div className="results-proof"><ShieldCheck size={23} weight="duotone" /><span><strong>{result.catalogSize}</strong>{say(lang, " ελληνικοί προορισμοί εξετάστηκαν", " Greek destinations checked")}</span></div></div>
        <div className="results-grid">{result.recommendations.slice(0, 3).map((recommendation, index) => <ResultCard key={recommendation.slug} recommendation={recommendation} index={index} trip={trip} lang={lang} onChoose={() => void choose(recommendation)} />)}</div>
      </section>}

      {selected && result && <DestinationStory recommendation={selected} result={result} insights={insights} trip={trip} lang={lang} offers={stayOffers} loading={stayLoading} onSelectWindow={selectWindow} />}
    </main>

    <footer className="guru-footer"><span>ΕΛΛΗΝΙΚΟΣ AI TRAVEL GURU</span><span>{say(lang, "Πραγματικά δεδομένα · καθαρές επιλογές · καμία ψεύτικη πίεση", "Real data · clear choices · no fake pressure")}</span></footer>
  </div>;
}

function DbPhoto({ slug, className, label, startDate = "2026-09-18", endDate = "2026-09-22" }: { slug: string; className?: string; label: string; startDate?: string; endDate?: string }) {
  const url = `/api/destination-photo?slug=${encodeURIComponent(slug)}&start_date=${startDate}&end_date=${endDate}`;
  return <div className={className} style={{ backgroundImage: `url('${url}')` }}><span>{label}<small>ΠΡΑΓΜΑΤΙΚΗ ΕΙΚΟΝΑ</small></span></div>;
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <div className="question"><h3>{title}</h3>{hint && <p>{hint}</p>}{children}</div>;
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={active ? "active" : ""} onClick={onClick}>{children}{active && <Check size={15} weight="bold" />}</button>;
}

function MoodIcon({ mood }: { mood: TripRequest["moods"][number] }) {
  if (mood === "relax") return <Waves size={25} weight="duotone" />;
  if (mood === "romantic") return <Heart size={25} weight="duotone" />;
  if (mood === "food") return <ForkKnife size={25} weight="duotone" />;
  if (mood === "culture") return <Buildings size={25} weight="duotone" />;
  if (mood === "city") return <UsersThree size={25} weight="duotone" />;
  if (mood === "nature") return <Leaf size={25} weight="duotone" />;
  if (mood === "adventure") return <Mountains size={25} weight="duotone" />;
  return <SunHorizon size={25} weight="duotone" />;
}

function AgentCouncil({ events, lang }: { events: StreamEvent[]; lang: Lang }) {
  const current = events.at(-1)?.type ?? "understand:start";
  const visible = Object.keys(stageLabels).filter(key => events.some(event => event.type === key)).slice(-4);
  return <section className="agent-council" aria-live="polite"><div className="council-orbit"><Compass size={44} weight="duotone" /><span /><span /><span /></div><div><span className="eyebrow">{say(lang, "Η ΟΜΑΔΑ ΔΟΥΛΕΥΕΙ", "THE TEAM IS WORKING")}</span><h2>{stageLabels[current]?.[lang === "el" ? 0 : 1] ?? say(lang, "Χτίζουμε την απόφαση…", "Building the decision…")}</h2><div className="agent-list">{visible.map(key => <div key={key} className={key === current ? "active" : "done"}>{key === current ? <Sparkle size={17} weight="fill" /> : <Check size={17} weight="bold" />}<span>{stageLabels[key][lang === "el" ? 0 : 1]}</span><small>{key === current ? say(lang, "τώρα", "now") : say(lang, "ελέγχθηκε", "checked")}</small></div>)}</div><p>{say(lang, "Κάθε επιλογή πρέπει να αντέξει σε έλεγχο σκοπού, εποχής, μετακίνησης και κόστους. Αν κάτι δεν στηρίζεται αρκετά, δεν περνά στην τελική τριάδα.", "Every choice must survive purpose, timing, travel and cost checks. If it is not well supported, it does not reach the final three.")}</p></div></section>;
}

function ResultCard({ recommendation, index, trip, lang, onChoose }: { recommendation: V8Recommendation; index: number; trip: TripRequest; lang: Lang; onChoose: () => void }) {
  const title = index === 0 ? say(lang, "Η επιλογή του Guru", "The Guru's choice") : index === 1 ? say(lang, "Η πιο ήρεμη εναλλακτική", "The calmer alternative") : say(lang, "Η πιο τολμηρή στροφή", "The bolder turn");
  return <article className={`result-card ${index === 0 ? "featured" : ""}`}>
    <div className="result-photo" style={{ backgroundImage: `url('/api/destination-photo?slug=${encodeURIComponent(recommendation.slug)}&start_date=${trip.startDate}&end_date=${trip.endDate}')` }}><div className="result-top"><span>0{index + 1}</span><span>{title}</span></div><div><small>ΕΛΛΑΔΑ · {prettyDate(trip.startDate, lang)}–{prettyDate(trip.endDate, lang)}</small><h3>{recommendation.destination}</h3></div></div>
    <div className="result-copy"><div className="match-line"><strong>{recommendation.confidence === "HIGH" ? say(lang, "Ισχυρό ταίριασμα", "Strong match") : say(lang, "Καλό ταίριασμα", "Good match")}</strong><span>{say(lang, "για το δικό σου ταξίδι", "for your trip")}</span></div><p>{recommendation.why}</p><div className="reason-list"><span><Heart size={18} /> {topReason(recommendation, lang)}</span><span><CalendarBlank size={18} /> {recommendation.seasonNote}</span><span><AirplaneTilt size={18} /> {recommendation.effortLabel}</span></div><div className="honest-note"><ShieldCheck size={20} weight="duotone" /><span><small>{say(lang, "Τι μας προβληματίζει", "What gives us pause")}</small>{tradeoff(recommendation, lang)}</span></div><button onClick={onChoose}>{say(lang, "Δείξε μου γιατί πρέπει να πάω", "Show me why I should go")} <ArrowRight size={19} weight="bold" /></button></div>
  </article>;
}

function DestinationStory({ recommendation, result, insights, trip, lang, offers, loading, onSelectWindow }: { recommendation: V8Recommendation; result: V8RecommendationResponse; insights: DestinationInsightsResponse | null; trip: TripRequest; lang: Lang; offers: V8StayOffer[]; loading: boolean; onSelectWindow: (window: SmartDateWindow) => Promise<void> }) {
  const days = [say(lang, "Άφιξη & πρώτη ανάσα", "Arrival & first breath"), say(lang, "Η μέρα του τόπου", "The day of the place"), say(lang, "Ο δικός σου ρυθμός", "Your own rhythm"), say(lang, "Κλείσιμο χωρίς βιασύνη", "A slow final chapter")];
  const windows = recommendation.dateWindows ?? [];
  return <section id="destination" className="destination-story">
    {result.council && <div className="council-verdict"><div className="council-verdict-head"><span className="eyebrow">{say(lang, "ΟΙ ΑΝΕΞΑΡΤΗΤΕΣ ΦΩΝΕΣ", "THE INDEPENDENT VOICES")}</span><h3>{say(lang, "Δεν αποφάσισαν από ευγένεια. Έλεγξαν διαφορετικά πράγματα.", "They did not decide to be polite. They checked different things.")}</h3></div><div className="council-voices">{result.council.voices.map(voice => <article key={voice.role}><span>{lang === "el" ? voice.titleEl : voice.titleEn}</span><p>{polishVerdict(voice.verdict, lang)}</p><strong>{voice.pickSlug === recommendation.slug ? say(lang, "Υπερασπίζεται αυτή την επιλογή", "Defends this choice") : say(lang, "Υπερασπίζεται διαφορετική οπτική", "Defends a different perspective")}</strong></article>)}</div></div>}
    <div className="destination-hero">
      <div className="destination-verdict"><span className="eyebrow">{say(lang, "Η ΤΕΛΙΚΗ ΕΤΥΜΗΓΟΡΙΑ", "THE FINAL VERDICT")}</span><h2>{say(lang, `${recommendation.destination}: αυτό είναι το ταξίδι που χρειάζεσαι τώρα.`, `${recommendation.destination}: this is the trip you need now.`)}</h2><p>{insights?.overview || recommendation.why}</p><div className="verdict-reasons"><span><Check size={17} weight="bold" /> {topReason(recommendation, lang)}</span><span><Check size={17} weight="bold" /> {recommendation.budgetLabel}</span><span><Check size={17} weight="bold" /> {recommendation.effortLabel}</span></div><div className="tradeoff-block"><ShieldCheck size={23} weight="duotone" /><div><small>{say(lang, "Ειλικρινές heads-up", "Honest heads-up")}</small><strong>{tradeoff(recommendation, lang)}</strong></div></div></div>
      <div className="destination-visual" style={{ backgroundImage: `url('/api/destination-photo?slug=${encodeURIComponent(recommendation.slug)}&start_date=${trip.startDate}&end_date=${trip.endDate}')` }}><div className="visual-date"><CalendarBlank size={21} /><span>{prettyDate(trip.startDate, lang)} — {prettyDate(trip.endDate, lang)}<small>{trip.nights} {say(lang, "νύχτες", "nights")}</small></span></div><div className="visual-proof"><ShieldCheck size={18} weight="duotone" /> {say(lang, "Εικόνα από πραγματική επιλογή διαμονής", "Image from a real stay option")}</div></div>
    </div>

    {windows.length > 0 && <div className="date-windows"><div className="journey-label"><span className="eyebrow">{say(lang, "ΠΟΤΕ ΑΞΙΖΕΙ ΠΕΡΙΣΣΟΤΕΡΟ", "WHEN IT WORKS BEST")}</span><h3>{say(lang, "Τρία παράθυρα. Καθαρό κέρδος και καθαρός συμβιβασμός.", "Three windows. A clear gain and a clear trade-off.")}</h3></div><div className="date-window-grid">{windows.map((window, index) => <button type="button" key={window.id} className={trip.startDate === window.startDate && trip.endDate === window.endDate ? "active" : ""} onClick={() => void onSelectWindow(window)}><span>{index === 0 ? say(lang, "ΠΡΟΤΕΙΝΟΜΕΝΟ", "RECOMMENDED") : say(lang, "ΕΝΑΛΛΑΚΤΙΚΗ", "ALTERNATIVE")}</span><strong>{prettyDate(window.startDate, lang)} → {prettyDate(window.endDate, lang)}</strong><b>{lang === "el" ? window.titleEl : window.titleEn}</b><p>{lang === "el" ? window.tradeoffEl : window.tradeoffEn}</p></button>)}</div></div>}

    <div className="journey-strip"><div className="journey-label"><span className="eyebrow">{say(lang, "ΤΟ ΤΑΞΙΔΙ ΣΕ 90″", "THE TRIP IN 90 SECONDS")}</span><h3>{say(lang, "Ένας ρυθμός που μπορείς ήδη να φανταστείς.", "A rhythm you can already picture.")}</h3></div><div className="journey-days">{days.map((day, index) => <div key={day}><span>{index + 1}</span><i /><strong>{index === 1 && insights?.attractions[0]?.name ? insights.attractions[0].name : index === 2 && insights?.restaurants[0]?.name ? insights.restaurants[0].name : day}</strong><small>{index === 0 ? insights?.practicalNotes[0] || say(lang, "check-in, βόλτα, πρώτη εικόνα", "check-in, walk, first impression") : index === 1 ? insights?.attractions[0]?.whyItFits || insights?.attractions[0]?.summary || say(lang, "τοπική ζωή και μια χαρακτηριστική εμπειρία", "local life and a signature experience") : index === 2 ? insights?.restaurants[0]?.whyItFits || insights?.restaurants[0]?.summary || say(lang, "χώρος για αυτό που θα αγαπήσεις", "space for what you will love") : say(lang, "χωρίς πρόγραμμα-μαραθώνιο", "without an itinerary marathon")}</small></div>)}</div></div>

    <div className="stay-match">
      <div className="stay-head"><div><span className="eyebrow">{say(lang, "ΤΩΡΑ — ΚΑΙ ΜΟΝΟ ΤΩΡΑ — Η ΔΙΑΜΟΝΗ", "NOW — AND ONLY NOW — THE STAY")}</span><h3>{say(lang, "Τρεις επιλογές που υπηρετούν την απόφαση.", "Three stays that serve the decision.")}</h3></div><p>{say(lang, `Εμφανίζονται μόνο επιλογές που καλύπτουν ολόκληρο το ταξίδι ${prettyDate(trip.startDate, lang)}–${prettyDate(trip.endDate, lang)}. Η τελική διαθεσιμότητα δωματίου και τιμή επιβεβαιώνονται στην επόμενη σελίδα.`, `Only options covering the full trip ${prettyDate(trip.startDate, lang)}–${prettyDate(trip.endDate, lang)} are shown. Final room availability and price are confirmed on the next page.`)}</p></div>
      {loading ? <div className="stay-loading"><Compass size={24} weight="duotone" /> {say(lang, "Ελέγχω ποια stays καλύπτουν όλες τις ημερομηνίες…", "Checking which stays cover every date…")}</div> : offers.length ? <div className="stay-grid">{offers.map((offer, index) => <StayCard key={offer.sourceProductId} offer={offer} index={index} destination={recommendation.slug} trip={trip} lang={lang} />)}</div> : <div className="no-stays"><ShieldCheck size={25} weight="duotone" /><div><strong>{say(lang, "Δεν θα σου δείξω μια αμφίβολη επιλογή μόνο και μόνο για να υπάρχει κουμπί.", "I will not show a doubtful option just to have a button.")}</strong><p>{say(lang, "Η πρόταση προορισμού παραμένει, αλλά αυτή τη στιγμή δεν υπάρχει stay που να περνά τον πλήρη έλεγχο ημερομηνιών.", "The destination recommendation stands, but there is currently no stay that passes the full date check.")}</p></div></div>}
    </div>
  </section>;
}

function StayCard({ offer, index, destination, trip, lang }: { offer: V8StayOffer; index: number; destination: string; trip: TripRequest; lang: Lang }) {
  const image = offer.imageUrl || offer.thumbUrl;
  const track = () => {
    const body = JSON.stringify({ eventName: "outbound_click", destinationId: destination, sourceProductId: offer.sourceProductId });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
  };
  return <article className={`stay-card ${index === 0 ? "best" : ""}`}>
    <div className="stay-photo" style={image ? { backgroundImage: `url('${image}')` } : undefined}><span>{index === 0 ? say(lang, "Η επιλογή μας", "Our pick") : index === 1 ? say(lang, "Πιο ήσυχο", "Calmer") : say(lang, "Διαφορετικό mood", "Different mood")}</span></div>
    <div className="stay-copy"><small>{offer.city || say(lang, "Περιοχή προορισμού", "Destination area")}</small><h4>{offer.propertyName}</h4><p>{cleanDescription(offer.description)}</p><div className="stay-trust"><span><CalendarBlank size={16} /> {say(lang, "Καλύπτει όλες τις ημερομηνίες", "Covers every trip date")}</span>{offer.distanceKm != null && <span><MapPin size={16} /> {offer.distanceKm.toFixed(1)} km</span>}</div><a href={offer.trackingUrl} target="_blank" rel="sponsored nofollow noopener" onClick={track}>{say(lang, "Έλεγξε τιμή & διαθεσιμότητα", "Check price & availability")} <ArrowRight size={18} weight="bold" /></a><small className="stay-fineprint">{say(lang, "Η τελική τιμή και το δωμάτιο επιβεβαιώνονται πριν προχωρήσεις.", "Final price and room are confirmed before you continue.")}</small></div>
  </article>;
}

function topReason(recommendation: V8Recommendation, lang: Lang) {
  const tags = new Set(recommendation.tags);
  if (tags.has("romantic")) return say(lang, "Ισορροπία ανάμεσα σε οικειότητα και εμπειρίες", "A balance of intimacy and experiences");
  if (tags.has("relax")) return say(lang, "Χαμηλός ρυθμός χωρίς να νιώθεις απομονωμένος", "A slower rhythm without feeling isolated");
  if (tags.has("food")) return say(lang, "Ο τόπος μπορεί να γίνει μέρος της γεύσης του ταξιδιού", "The place can become part of the trip's flavour");
  if (tags.has("nature")) return say(lang, "Αλλαγή σκηνικού που πραγματικά καθαρίζει το μυαλό", "A change of scene that genuinely clears the mind");
  return say(lang, "Σωστή ισορροπία εμπειρίας και προσπάθειας", "The right balance of experience and effort");
}

function tradeoff(recommendation: V8Recommendation, lang: Lang) {
  if (recommendation.breakdown.season < 70) return say(lang, "Η εποχή δεν είναι η απόλυτη κορύφωση· χρειάζεται ευελιξία στο ημερήσιο πλάνο.", "This is not peak season; the day plan needs some flexibility.");
  if (recommendation.breakdown.effort < 70) return say(lang, "Η μετάβαση ζητά περισσότερη ενέργεια από μια γρήγορη απόδραση.", "Getting there asks for more energy than a quick escape.");
  if (recommendation.breakdown.budget < 70) return say(lang, "Το budget θέλει πειθαρχία στη διαμονή και στις έξτρα εμπειρίες.", "The budget needs discipline around the stay and extras.");
  if (recommendation.breakdown.crowdFit < 78) return say(lang, "Τα δημοφιλή σημεία μπορεί να έχουν περισσότερο κόσμο από όσο θα ήθελες.", "Popular areas may feel busier than you would prefer.");
  return say(lang, "Δεν βλέπουμε κόκκινη σημαία, αλλά θα κρατούσαμε λίγο ελεύθερο χρόνο αντί για γεμάτο πρόγραμμα.", "There is no red flag, but we would keep some free time instead of over-planning.");
}

function polishVerdict(value: string, lang: Lang) {
  if (lang === "en") return value;
  return value
    .replace(/με καλύτερη προσαρμογή (?:στο|στην) αποφυγή πλήθους/gi, "χωρίς να θυσιάζει την ανάγκη σου για λιγότερο κόσμο")
    .replace(/στο αποφυγή/gi, "στην αποφυγή")
    .replace(/μέτρια προσπάθεια πρόσβασης/gi, "χρειάζεται λίγη περισσότερη ενέργεια για τη μετάβαση")
    .replace(/\s+,/g, ",")
    .trim();
}

function offerScore(offer: V8StayOffer, style: TripRequest["hotelStyle"]) {
  let score = 100 - (offer.distanceKm ?? 20);
  if (style === "luxury") score += (offer.starLevel ?? 0) * 12;
  if (style === "value" && offer.price != null) score += Math.max(0, 80 - offer.price) / 3;
  if (style === "boutique" && /boutique|design/i.test(`${offer.propertyName} ${offer.description ?? ""}`)) score += 25;
  if (style === "resort" && /resort|spa|all inclusive/i.test(`${offer.propertyName} ${offer.description ?? ""}`)) score += 25;
  return score;
}

function cleanDescription(value?: string | null) {
  const text = (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? `${text.slice(0, 120)}${text.length > 120 ? "…" : ""}` : "Επιλογή από την πραγματική βάση καταλυμάτων για την περιοχή.";
}
