"use client";

import { useMemo, useRef, useState } from "react";
import {
  AirplaneTilt,
  ArrowRight,
  Buildings,
  CalendarBlank,
  CaretDown,
  Check,
  Compass,
  ForkKnife,
  Heart,
  Leaf,
  MapPin,
  Mountains,
  Path,
  ShieldCheck,
  Sparkle,
  SunHorizon,
  UsersThree,
  Waves,
} from "@phosphor-icons/react";
import type { TripRequest, Month, EntryMode } from "@/lib/validation/trip";
import type { V8Recommendation, V8RecommendationResponse, V8StayOffer, V8StayResponse } from "@/lib/decision/v8-types";
import type { DestinationInsightsResponse } from "@/lib/decision/types";
import type { ContinuityEnvelope } from "@/lib/continuity";
import type { SmartDateWindow } from "@/lib/decision/date-windows-v9";
import type { WeeklyPick } from "@/lib/decision/weekly-pick";

type Lang = "el" | "en";
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
  entryMode: "unknown",
  groupSize: 2,
  desiredEnergy: "restore",
  socialPreference: "balanced",
  noveltyPreference: "balanced",
  mustHave: "none",
  dateFlexibility: "fixed",
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
  "catalog:ready": ["Ολόκληρος ο ελληνικός κατάλογος μπήκε στη σύγκριση", "The full Greek catalog entered the comparison"],
  "shortlist:ready": ["Ο Matchmaker κράτησε μόνο όσα έχουν προσωπικό λόγο", "The Matchmaker kept only meaningful fits"],
  "weather:start": ["Ο Season Keeper ελέγχει αν οι ημερομηνίες στέκουν", "The Season Keeper checks whether the dates work"],
  "weather:ready": ["Καιρός και εποχή πέρασαν τον έλεγχο", "Weather and season passed the check"],
  "verify:start": ["Ο Skeptic ψάχνει λόγο να απορρίψει τις επιλογές", "The Skeptic looks for reasons to reject the choices"],
  "verify:ready": ["Οι αδύναμες επιλογές αποκλείστηκαν", "Weak choices were removed"],
  "council:start": ["Δύο ανεξάρτητες φωνές υπερασπίζονται την τελική επιλογή", "Two independent voices defend the final choice"],
  "council:ready": ["Η ομάδα ιεράρχησε έξι διαφορετικές επιλογές", "The team ranked six distinct options"],
};

export function TravelDecisionExperience({weeklyPick}:{weeklyPick:WeeklyPick|null}) {
  const [lang, setLang] = useState<Lang>("el");
  const [trip, setTrip] = useState<TripRequest>(()=>weeklyPick?{...defaultTrip,startDate:weeklyPick.startDate,endDate:weeklyPick.endDate,nights:weeklyPick.nights,month:monthFromDate(weeklyPick.startDate)}:defaultTrip);
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
  const [showMore, setShowMore] = useState(false);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const running = useRef(false);
  const today=useMemo(()=>new Date().toISOString().slice(0,10),[]);

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

  const setTraveler = (travelerType:TripRequest["travelerType"]) => setTrip(current=>({...current,travelerType,groupSize:travelerType==="solo"?1:travelerType==="couple"?2:travelerType==="family"?Math.max(3,current.groupSize??4):Math.max(3,current.groupSize??4)}));
  const toggleCompare = (slug:string) => setCompareSlugs(current=>current.includes(slug)?current.filter(item=>item!==slug):current.length>=3?current:[...current,slug]);

  function begin(mode: EntryMode) {
    setEntryMode(mode);
    setStep(0);
    setResult(null);
    setSelected(null);
    setShowMore(false);
    setCompareSlugs([]);
    setTrip(current => ({ ...current, entryMode:mode, consideredDestination:mode==="idea"?current.consideredDestination:undefined, noveltyPreference:mode==="surprise"?"surprise":current.noveltyPreference, distancePreference:mode==="surprise"?"any":current.distancePreference, tripText:mode==="surprise"?say(lang, "Θέλω μια απρόσμενη επιλογή στην Ελλάδα που να μου ταιριάζει πραγματικά.", "I want an unexpected Greek destination that genuinely fits me."):current.tripText }));
    setTimeout(() => document.getElementById("discovery")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function beginWeekly(){if(!weeklyPick)return;const moods:TripRequest["moods"]=weeklyPick.tags.includes("beach")?["relax","warmth"]:weeklyPick.tags.includes("nature")?["relax","nature"]:["food","culture"];setTrip(current=>({...current,entryMode:"idea",consideredDestination:weeklyPick.destination,startDate:weeklyPick.startDate,endDate:weeklyPick.endDate,nights:weeklyPick.nights,month:monthFromDate(weeklyPick.startDate),moods}));setEntryMode("idea");setStep(0);setResult(null);setSelected(null);setShowMore(false);setCompareSlugs([]);setTimeout(()=>document.getElementById("discovery")?.scrollIntoView({behavior:"smooth",block:"start"}),40)}

  async function run() {
    if (running.current) return;
    running.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected(null);
    setStayData(null);
    setInsights(null);
    setShowMore(false);
    setCompareSlugs([]);
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
          <p>{say(lang, "Ο Guru συνδυάζει ημερομηνίες, budget ανά παρέα, κόκκινες γραμμές και την ψυχολογία του ταξιδιού — και σου δίνει έξι πραγματικά διαφορετικούς δρόμους, όχι την ίδια απάντηση ξανά και ξανά.", "The Guru combines dates, group budget, red lines and travel psychology — then gives you six genuinely different paths, not the same answer repeatedly.")}</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => begin("unknown")}>{say(lang, "Δεν ξέρω πού να πάω", "I do not know where to go")} <ArrowRight size={18} weight="bold" /></button>
            <button onClick={() => begin("idea")}>{say(lang, "Έχω κάτι στο μυαλό μου", "I have an idea")}</button>
            <button onClick={() => begin("surprise")}><Sparkle size={17} /> {say(lang, "Κάνε μου έκπληξη", "Surprise me")}</button>
          </div>
          <div className="trust-row"><span><ShieldCheck size={18} weight="duotone" /> {say(lang, "Πραγματικές φωτογραφίες", "Real photos")}</span><span><CalendarBlank size={18} weight="duotone" /> {say(lang, "Έλεγχος ημερομηνιών", "Date checks")}</span><span><Check size={18} weight="bold" /> {say(lang, "Ειλικρινές trade-off", "Honest trade-off")}</span></div>
        </div>
        <div className="hero-gallery" aria-label={say(lang, "Πραγματικές εικόνες καταλυμάτων από την Ελλάδα", "Real accommodation images from Greece")}>
          <DbPhoto slug={weeklyPick?.slug??"corfu"} className="gallery-main" label={weeklyPick?.destination??"Κέρκυρα"} startDate={trip.startDate} endDate={trip.endDate}/>
          <DbPhoto slug="chania" className="gallery-top" label="Χανιά" startDate={trip.startDate} endDate={trip.endDate}/>
          <DbPhoto slug="santorini" className="gallery-bottom" label="Σαντορίνη" startDate={trip.startDate} endDate={trip.endDate}/>
          <div className="gallery-stamp"><strong>21</strong><span>{say(lang, "προορισμοί σε μία απόφαση", "destinations in one decision")}</span></div>
        </div>
      </section>

      {weeklyPick && <section className="weekly-pick" aria-labelledby="weekly-title">
        <div className="weekly-visual" style={{backgroundImage:`url('/api/destination-photo?slug=${encodeURIComponent(weeklyPick.slug)}&start_date=${weeklyPick.startDate}&end_date=${weeklyPick.endDate}')`}}><span>{say(lang,"Η ΠΡΟΤΑΣΗ ΤΗΣ ΕΒΔΟΜΑΔΑΣ ΑΠΟ ΤΗΝ ΟΜΑΔΑ","THE TEAM'S PICK OF THE WEEK")}</span><strong>{lang==="el"?weeklyPick.destination:weeklyPick.destinationEn}</strong><small>{prettyDate(weeklyPick.startDate,lang)} — {prettyDate(weeklyPick.endDate,lang)}</small></div>
        <div className="weekly-copy"><span className="eyebrow"><Sparkle size={16} weight="fill" /> {say(lang,"AI WEEKLY ESCAPE","AI WEEKLY ESCAPE")}</span><h2 id="weekly-title">{say(lang,"Μία ιδέα για να ξεκινήσεις — όχι για να σταματήσεις να ψάχνεις.","One idea to start from — not to stop exploring.")}</h2><p>{lang==="el"?weeklyPick.reasonEl:weeklyPick.reasonEn}</p><div className="weekly-risk"><ShieldCheck size={20} weight="duotone" /><span><small>{say(lang,"Ο ειλικρινής έλεγχος","The honest check")}</small>{lang==="el"?weeklyPick.riskEl:weeklyPick.riskEn}</span></div><button onClick={beginWeekly}>{say(lang,"Δες αν ταιριάζει σε εμένα","See if it fits me")} <ArrowRight size={19} weight="bold" /></button></div>
      </section>}

      <section id="how" className="guru-promise">
        <div><span>01</span><Heart size={27} weight="duotone" /><h2>{say(lang, "Σε καταλαβαίνει", "Understands you")}</h2><p>{say(lang, "Όχι μόνο φίλτρα. Μαθαίνει τι χρειάζεσαι από αυτό το ταξίδι.", "Beyond filters. It learns what you need from this trip.")}</p></div>
        <div><span>02</span><ShieldCheck size={27} weight="duotone" /><h2>{say(lang, "Αμφισβητεί", "Challenges")}</h2><p>{say(lang, "Ελέγχει εποχή, κόπο μετάβασης και όσα μπορούν να χαλάσουν την επιλογή.", "It checks season, travel effort and the details that could spoil the choice.")}</p></div>
        <div><span>03</span><Compass size={27} weight="duotone" /><h2>{say(lang, "Σε οδηγεί μέχρι τέλους", "Guides you to the end")}</h2><p>{say(lang, "Έξι επιλογές, σύγκριση, σωστές ημερομηνίες και καθαρή τελική έξοδος.", "Six options, comparison, right dates and a clear final handoff.")}</p></div>
      </section>

      <section id="discovery" className={`discovery ${entryMode ? "open" : ""}`}>
        <div className="discovery-head">
          <div><span className="eyebrow">{say(lang, "TRAVEL PSYCHOLOGY FUNNEL", "TRAVEL PSYCHOLOGY FUNNEL")}</span><h2>{say(lang, "Πέντε μικρά βήματα. Μία πολύ καλύτερη απόφαση.", "Five short steps. One much better decision.")}</h2></div>
          <div className="step-meter" aria-label={`${step + 1}/5`}><span style={{ width: `${(step + 1) * 20}%` }} /><small>{step + 1}/5</small></div>
        </div>

        {entryMode && step === 0 && <div className="question-stage">
          <Question title={say(lang, "Από πού ξεκινάς;", "Where do you start?")} hint={say(lang,"Η αφετηρία αλλάζει πραγματικά τον κόπο της μετακίνησης.","Your origin materially changes travel effort.")}><div className="choice-row">{[["Athens","Αθήνα"],["Thessaloniki","Θεσσαλονίκη"],["Patras","Πάτρα"],["Heraklion","Ηράκλειο"]].map(([value,label])=><Choice key={value} active={trip.origin===value} onClick={()=>patch("origin",value)}>{label}</Choice>)}</div></Question>
          <Question title={say(lang, "Πότε θέλεις να φύγεις;", "When do you want to leave?")}><div className="date-row"><label><span>{say(lang, "Άφιξη", "Arrival")}</span><input aria-label={say(lang, "Ημερομηνία άφιξης", "Arrival date")} type="date" min={today} value={trip.startDate} onChange={event => setDates(event.target.value, trip.endDate)} /></label><ArrowRight size={18} /><label><span>{say(lang, "Αναχώρηση", "Departure")}</span><input aria-label={say(lang, "Ημερομηνία αναχώρησης", "Departure date")} type="date" min={addDays(trip.startDate, 2)} value={trip.endDate} onChange={event => setDates(trip.startDate, event.target.value)} /></label></div></Question>
          <div className="question-pair"><Question title={say(lang, "Με ποιον μοιράζεσαι το ταξίδι;", "Who is coming with you?")}><div className="choice-row">{([['solo','Solo'],['couple',say(lang,'Ζευγάρι','Couple')],['family',say(lang,'Οικογένεια','Family')],['friends',say(lang,'Παρέα','Friends')]] as const).map(([value, label]) => <Choice key={value} active={trip.travelerType === value} onClick={() => setTraveler(value)}>{label}</Choice>)}</div></Question><Question title={say(lang,"Πόσοι ταξιδεύετε συνολικά;","How many are travelling?")}><div className="choice-row">{[1,2,3,4,5,6].map(value=><Choice key={value} active={trip.groupSize===value} onClick={()=>patch("groupSize",value)}>{value}</Choice>)}</div></Question></div>
        </div>}

        {entryMode && step === 1 && <div className="question-stage">
          <Question title={say(lang, "Όταν επιστρέψεις, τι θέλεις να έχει αλλάξει μέσα σου;", "When you return, what should feel different?")} hint={say(lang, "Διάλεξε έως τρία.", "Choose up to three.")}><div className="mood-grid">{moodOptions.map(item => <button key={item.value} className={trip.moods.includes(item.value) ? "active" : ""} onClick={() => toggleMood(item.value)}><MoodIcon mood={item.value} /><span>{lang === "el" ? item.el : item.en}</span>{trip.moods.includes(item.value) && <Check size={17} weight="bold" />}</button>)}</div></Question>
          <Question title={say(lang,"Πόση ενέργεια θέλεις να έχει το ταξίδι;","What energy should the trip have?")}><div className="psychology-grid">{([['restore',say(lang,'Να με αποφορτίσει','Restore me'),say(lang,'Χώρος, ηρεμία, λιγότερες αποφάσεις','Space, calm, fewer decisions')],['balanced',say(lang,'Ισορροπημένο','Balanced'),say(lang,'Εμπειρίες χωρίς πρόγραμμα-μαραθώνιο','Experiences without a marathon')],['stimulating',say(lang,'Να με ξυπνήσει','Energise me'),say(lang,'Ανακάλυψη, κίνηση, νέες εικόνες','Discovery, movement, new images')]] as const).map(([value,title,detail])=><button key={value} className={trip.desiredEnergy===value?"active":""} onClick={()=>patch("desiredEnergy",value)}><Sparkle size={20} weight="duotone"/><span><strong>{title}</strong><small>{detail}</small></span>{trip.desiredEnergy===value&&<Check size={16} weight="bold"/>}</button>)}</div></Question>
        </div>}

        {entryMode && step === 2 && <div className="question-stage">
          <div className="question-pair"><Question title={say(lang,"Θέλεις ησυχία ή ανθρώπους γύρω σου;","Quiet or people around you?")}><div className="choice-row">{([['quiet',say(lang,'Ήσυχα','Quiet')],['balanced',say(lang,'Και τα δύο','A mix')],['lively',say(lang,'Ζωντάνια','Lively')]] as const).map(([value,label])=><Choice key={value} active={trip.socialPreference===value} onClick={()=>patch("socialPreference",value)}>{label}</Choice>)}</div></Question><Question title={say(lang,"Πόσο ασφαλής ή απρόσμενη να είναι η επιλογή;","How safe or surprising should it feel?")}><div className="choice-row">{([['familiar',say(lang,'Σίγουρη αξία','Proven')],['balanced',say(lang,'Ισορροπία','Balanced')],['surprise',say(lang,'Κρυφό χαρτί','Wildcard')]] as const).map(([value,label])=><Choice key={value} active={trip.noveltyPreference===value} onClick={()=>patch("noveltyPreference",value)}>{label}</Choice>)}</div></Question></div>
          <Question title={say(lang,"Πώς θέλεις να κυλά η κάθε μέρα;","How should each day flow?")}><div className="choice-row">{([['slow',say(lang,'Χωρίς ρολόι','Slow')],['balanced',say(lang,'Ένα βασικό πλάνο','Light plan')],['full',say(lang,'Θέλω να τα ζήσω όλα','Full days')]] as const).map(([value,label])=><Choice key={value} active={trip.pace===value} onClick={()=>patch("pace",value)}>{label}</Choice>)}</div></Question>
        </div>}

        {entryMode && step === 3 && <div className="question-stage">
          <Question title={say(lang,"Τι πρέπει οπωσδήποτε να υπάρχει;","What must be there?")} hint={say(lang,"Αυτό είναι σκληρό κριτήριο — οι επιλογές που δεν το έχουν απορρίπτονται.","This is a hard constraint — options without it are removed.")}><div className="choice-row">{([['sea',say(lang,'Θάλασσα','Sea')],['nature',say(lang,'Φύση','Nature')],['culture',say(lang,'Χαρακτήρας & πολιτισμός','Culture')],['nightlife',say(lang,'Βραδινή ζωή','Nightlife')],['none',say(lang,'Κανένα must','No must-have')]] as const).map(([value,label])=><Choice key={value} active={trip.mustHave===value} onClick={()=>patch("mustHave",value)}>{label}</Choice>)}</div></Question>
          <Question title={say(lang, "Τι θα σου χαλούσε σίγουρα το ταξίδι;", "What would definitely spoil the trip?")}><div className="choice-row">{([['long-travel',say(lang,'Πολλή ταλαιπωρία','Too much travel')],['high-cost',say(lang,'Να ξεφύγει το κόστος','Cost running away')],['crowds',say(lang,'Υπερβολικός κόσμος','Too many crowds')],['none',say(lang,'Δεν έχω κόκκινη γραμμή','No red line')]] as const).map(([value, label]) => <Choice key={value} active={trip.avoid === value} onClick={() => patch("avoid", value)}>{label}</Choice>)}</div></Question>
          <Question title={say(lang, "Πόση μετακίνηση αντέχεις;", "How much travel effort feels okay?")}><div className="choice-row compact">{([['nearby',say(lang,'Κοντά','Nearby')],['easy-hop',say(lang,'Εύκολη μετάβαση','Easy hop')],['any',say(lang,'Όπου αξίζει','Wherever fits')],['island',say(lang,'Μόνο νησί','Island only')]] as const).map(([value, label]) => <Choice key={value} active={trip.distancePreference === value} onClick={() => patch("distancePreference", value)}>{label}</Choice>)}</div></Question>
        </div>}

        {entryMode && step === 4 && <div className="question-stage">
          <Question title={say(lang, "Ποιο είναι το συνολικό budget για όλους;", "What is the total budget for everyone?")} hint={say(lang, `Υπολογίζεται για ${trip.groupSize??1} ταξιδιώτες και ${trip.nights} νύχτες — όχι ανά άτομο.`, `Calculated for ${trip.groupSize??1} travellers and ${trip.nights} nights — not per person.`)}><div className="budget-row">{[300, 500, 800, 1200, 1800, 2500].map(value => <Choice key={value} active={trip.budget === value} onClick={() => patch("budget", value)}>€{value}</Choice>)}</div></Question>
          <div className="question-pair"><Question title={say(lang, "Πώς θέλεις να μένεις;", "How do you like to stay?")}><div className="choice-row compact">{([['boutique','Boutique'],['luxury','Luxury'],['value',say(lang,'Καλή αξία','Good value')],['resort','Resort'],['any',say(lang,'Ανοιχτός','Open')]] as const).map(([value, label]) => <Choice key={value} active={trip.hotelStyle === value} onClick={() => patch("hotelStyle", value)}>{label}</Choice>)}</div></Question><Question title={say(lang,"Μπορούν να μετακινηθούν λίγο οι ημερομηνίες;","Can the dates move a little?")}><div className="choice-row">{([['fixed',say(lang,'Είναι σταθερές','Fixed')],['few-days',say(lang,'± λίγες ημέρες','A few days')],['open',say(lang,'Είμαι ανοιχτός','Open')]] as const).map(([value,label])=><Choice key={value} active={trip.dateFlexibility===value} onClick={()=>patch("dateFlexibility",value)}>{label}</Choice>)}</div></Question></div>
          {entryMode === "idea" && <Question title={say(lang,"Ποιο μέρος έχεις στο μυαλό σου;","Which place do you have in mind?")} hint={say(lang,"Θα το εξετάσουμε, αλλά δεν θα το προωθήσουμε αν δεν περνά τα κριτήριά σου.","We will consider it, but not force it past your criteria.")}><input aria-label={say(lang,"Προορισμός που σκέφτεσαι","Destination you are considering")} className="destination-input" value={trip.consideredDestination??""} placeholder={say(lang,"π.χ. Κέρκυρα","e.g. Corfu")} onChange={event=>patch("consideredDestination",event.target.value)}/></Question>}
          <Question title={say(lang, "Πες κάτι που δεν χώρεσε στις επιλογές.", "Tell us what the choices missed.")} hint={say(lang, "Προαιρετικό — μίλα φυσικά.", "Optional — speak naturally.")}><textarea maxLength={320} value={trip.tripText ?? ""} placeholder={say(lang, "π.χ. θέλω ήσυχα πρωινά, ωραίο φαγητό και λίγη ζωή το βράδυ, χωρίς να τρέχω", "e.g. quiet mornings, great food and a little evening energy, without rushing")} onChange={event => patch("tripText", event.target.value)} /></Question>
        </div>}

        {entryMode && <div className="discovery-actions">{step > 0 ? <button className="back" onClick={() => setStep(current => current - 1)}>{say(lang, "Πίσω", "Back")}</button> : <span />}{step < 4 ? <button className="next" onClick={() => setStep(current => current + 1)}>{say(lang, "Συνέχισε", "Continue")} <ArrowRight size={18} weight="bold" /></button> : <button className="next final" disabled={loading} onClick={() => void run()}>{say(lang, "Σύγκρινε την Ελλάδα για εμένα", "Compare Greece for me")} <Sparkle size={18} weight="fill" /></button>}</div>}
        {error && <div className="guru-error" role="alert">{error}</div>}
      </section>

      {loading && <AgentCouncil events={events} lang={lang} />}

      {result && <section id="results" className="results-section">
        <div className="results-head"><div><span className="eyebrow">{say(lang, "Η ΑΠΟΦΑΣΗ ΤΗΣ ΟΜΑΔΑΣ", "THE TEAM DECISION")}</span><h2>{say(lang, "Τρεις τελικοί υποψήφιοι. Τρεις ακόμη δρόμοι αν θέλεις να ψάξεις βαθύτερα.", "Three finalists. Three more paths if you want to explore deeper.")}</h2><p className="profile-summary"><Heart size={18} weight="duotone" /> {result.profileSummary}</p></div><div className="results-proof"><ShieldCheck size={23} weight="duotone" /><span><strong>{result.catalogSize}</strong>{say(lang, " ελληνικοί προορισμοί εξετάστηκαν", " Greek destinations checked")}</span></div></div>
        {result.feasibility==="COMPROMISE"&&<div className="feasibility-note"><ShieldCheck size={24} weight="duotone"/><div><strong>{say(lang,"Τα κριτήρια συγκρούονται μεταξύ τους.","Your criteria conflict with each other.")}</strong><p>{say(lang,"Δεν θα βαφτίσουμε έναν συμβιβασμό τέλειο. Οι παρακάτω είναι οι πιο τίμιες επιλογές και δείχνουν καθαρά πού υποχωρείς.","We will not label a compromise perfect. These are the most honest options, with the trade-offs made explicit.")}</p></div></div>}
        <div className="results-grid">{result.recommendations.slice(0, 3).map((recommendation, index) => <ResultCard key={recommendation.slug} recommendation={recommendation} index={index} trip={trip} lang={lang} compared={compareSlugs.includes(recommendation.slug)} onToggleCompare={()=>toggleCompare(recommendation.slug)} onChoose={() => void choose(recommendation)} />)}</div>
        <div className="more-results-control"><button onClick={()=>setShowMore(current=>!current)}>{showMore?say(lang,"Κρύψε τις επιπλέον επιλογές","Hide extra options"):say(lang,"Δείξε μου 3 ακόμη διαφορετικές επιλογές","Show 3 more distinct options")} <CaretDown size={18} className={showMore?"turned":""}/></button></div>
        {showMore&&<div className="alternatives-grid">{result.recommendations.slice(3,6).map((recommendation,index)=><ResultCard key={recommendation.slug} recommendation={recommendation} index={index+3} compact trip={trip} lang={lang} compared={compareSlugs.includes(recommendation.slug)} onToggleCompare={()=>toggleCompare(recommendation.slug)} onChoose={()=>void choose(recommendation)}/>)}</div>}
        {compareSlugs.length>0&&<ComparisonPanel recommendations={result.recommendations.filter(item=>compareSlugs.includes(item.slug))} trip={trip} lang={lang} onChoose={item=>void choose(item)} onRemove={toggleCompare}/>}
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
  return <section className="agent-council" aria-live="polite"><div className="council-orbit"><Compass size={44} weight="duotone" /><span /><span /><span /></div><div><span className="eyebrow">{say(lang, "Η ΟΜΑΔΑ ΔΟΥΛΕΥΕΙ", "THE TEAM IS WORKING")}</span><h2>{stageLabels[current]?.[lang === "el" ? 0 : 1] ?? say(lang, "Χτίζουμε την απόφαση…", "Building the decision…")}</h2><div className="agent-list">{visible.map(key => <div key={key} className={key === current ? "active" : "done"}>{key === current ? <Sparkle size={17} weight="fill" /> : <Check size={17} weight="bold" />}<span>{stageLabels[key][lang === "el" ? 0 : 1]}</span><small>{key === current ? say(lang, "τώρα", "now") : say(lang, "ελέγχθηκε", "checked")}</small></div>)}</div><p>{say(lang, "Κάθε επιλογή πρέπει να αντέξει σε έλεγχο σκοπού, εποχής, μετακίνησης και κόστους. Οι τρεις ισχυρότερες γίνονται finalists και τρεις ακόμη μένουν διαθέσιμες για βαθύτερη εξερεύνηση.", "Every choice must survive purpose, timing, travel and cost checks. The strongest three become finalists, with three more available for deeper exploration.")}</p></div></section>;
}

function ResultCard({ recommendation, index, trip, lang, compact=false, compared, onToggleCompare, onChoose }: { recommendation: V8Recommendation; index: number; trip: TripRequest; lang: Lang; compact?:boolean; compared:boolean; onToggleCompare:()=>void; onChoose: () => void }) {
  const titles=[say(lang,"Η επιλογή του Guru","The Guru's choice"),say(lang,"Η πιο εύκολη ισορροπία","The easiest balance"),say(lang,"Η ουσιαστική εναλλακτική","The meaningful alternative"),say(lang,"Το ήσυχο χαρτί","The quieter card"),say(lang,"Η έξυπνη αξία","The smart-value path"),say(lang,"Το wildcard","The wildcard")];
  const title=titles[index]??say(lang,"Εναλλακτική","Alternative");
  const fit=recommendation.fitStatus==="strong"?say(lang,"Ισχυρό ταίριασμα","Strong match"):recommendation.fitStatus==="good"?say(lang,"Καλό ταίριασμα","Good match"):say(lang,"Τίμιος συμβιβασμός","Honest compromise");
  return <article className={`result-card ${index === 0 ? "featured" : ""} ${compact?"compact-result":""}`}>
    <div className="result-photo" style={{ backgroundImage: `url('/api/destination-photo?slug=${encodeURIComponent(recommendation.slug)}&start_date=${trip.startDate}&end_date=${trip.endDate}')` }}><div className="result-top"><span>0{index + 1}</span><span>{title}</span></div><div><small>ΕΛΛΑΔΑ · {prettyDate(trip.startDate, lang)}–{prettyDate(trip.endDate, lang)}</small><h3>{recommendation.destination}</h3></div></div>
    <div className="result-copy"><div className="match-line"><strong>{fit}</strong><span>{say(lang, "για το δικό σου ταξίδι", "for your trip")}</span></div><p>{recommendation.why}</p><div className="reason-list"><span><Heart size={18} /> {topReason(recommendation, lang)}</span><span><CalendarBlank size={18} /> {recommendation.seasonNote}</span><span><AirplaneTilt size={18} /> {recommendation.effortLabel}</span></div><div className="honest-note"><ShieldCheck size={20} weight="duotone" /><span><small>{say(lang, "Τι μας προβληματίζει", "What gives us pause")}</small>{tradeoff(recommendation, lang)}</span></div><div className="result-actions"><button className="compare-button" onClick={onToggleCompare}>{compared?<Check size={18} weight="bold"/>:<Path size={18}/>} {compared?say(lang,"Στη σύγκριση","Comparing"):say(lang,"Σύγκρινε","Compare")}</button><button className="choose-button" onClick={onChoose}>{say(lang, "Δείξε μου το ταξίδι", "Show me the trip")} <ArrowRight size={19} weight="bold" /></button></div></div>
  </article>;
}

function ComparisonPanel({recommendations,trip,lang,onChoose,onRemove}:{recommendations:V8Recommendation[];trip:TripRequest;lang:Lang;onChoose:(item:V8Recommendation)=>void;onRemove:(slug:string)=>void}){return <section className="comparison-panel" aria-labelledby="comparison-title"><div className="comparison-head"><div><span className="eyebrow">{say(lang,"ΣΥΓΚΡΙΣΗ ΧΩΡΙΣ ΘΟΡΥΒΟ","COMPARISON WITHOUT NOISE")}</span><h3 id="comparison-title">{say(lang,"Τι κερδίζεις και τι θυσιάζεις σε κάθε επιλογή.","What you gain and what you trade in each option.")}</h3></div><span>{recommendations.length}/3</span></div><div className="comparison-grid">{recommendations.map(item=><article key={item.slug}><button className="remove-compare" onClick={()=>onRemove(item.slug)} aria-label={say(lang,`Αφαίρεσε ${item.destination}`,`Remove ${item.destination}`)}>×</button><DbPhoto slug={item.slug} label={item.destination} startDate={trip.startDate} endDate={trip.endDate}/><h4>{item.destination}</h4><dl><div><dt>{say(lang,"Εποχή","Season")}</dt><dd>{item.seasonNote}</dd></div><div><dt>{say(lang,"Μετάβαση","Effort")}</dt><dd>{item.effortLabel}</dd></div><div><dt>{say(lang,"Trade-off","Trade-off")}</dt><dd>{tradeoff(item,lang)}</dd></div></dl><button className="comparison-choose" onClick={()=>onChoose(item)}>{say(lang,"Επιλέγω αυτόν τον δρόμο","Choose this path")} <ArrowRight size={18} weight="bold"/></button></article>)}</div></section>}

function DestinationStory({ recommendation, result, insights, trip, lang, offers, loading, onSelectWindow }: { recommendation: V8Recommendation; result: V8RecommendationResponse; insights: DestinationInsightsResponse | null; trip: TripRequest; lang: Lang; offers: V8StayOffer[]; loading: boolean; onSelectWindow: (window: SmartDateWindow) => Promise<void> }) {
  const days = [say(lang, "Άφιξη & πρώτη ανάσα", "Arrival & first breath"), say(lang, "Η μέρα του τόπου", "The day of the place"), say(lang, "Ο δικός σου ρυθμός", "Your own rhythm"), say(lang, "Κλείσιμο χωρίς βιασύνη", "A slow final chapter")];
  const windows = recommendation.dateWindows ?? [];
  return <section id="destination" className="destination-story">
    <div className="decision-path"><div><span>1</span><strong>{say(lang,"Προορισμός","Destination")}</strong><small>{recommendation.destination}</small></div><i/><div className="active"><span>2</span><strong>{say(lang,"Ημερομηνίες","Dates")}</strong><small>{prettyDate(trip.startDate,lang)}–{prettyDate(trip.endDate,lang)}</small></div><i/><div className={offers.length?"active":""}><span>3</span><strong>{say(lang,"Διαμονή","Stay")}</strong><small>{offers.length?say(lang,"Επιλογές έτοιμες","Options ready"):say(lang,"Ακολουθεί","Next")}</small></div><i/><div><span>4</span><strong>{say(lang,"Τελικός έλεγχος","Final check")}</strong><small>{say(lang,"Εξωτερική έξοδος","External handoff")}</small></div></div>
    {result.council && <div className="council-verdict"><div className="council-verdict-head"><span className="eyebrow">{say(lang, "ΟΙ ΑΝΕΞΑΡΤΗΤΕΣ ΦΩΝΕΣ", "THE INDEPENDENT VOICES")}</span><h3>{say(lang, "Δεν αποφάσισαν από ευγένεια. Έλεγξαν διαφορετικά πράγματα.", "They did not decide to be polite. They checked different things.")}</h3></div><div className="council-voices">{result.council.voices.map(voice => <article key={voice.role}><span>{lang === "el" ? voice.titleEl : voice.titleEn}</span><p>{polishVerdict(voice.verdict, lang, recommendation)}</p><strong>{voice.pickSlug === recommendation.slug ? say(lang, "Υπερασπίζεται αυτή την επιλογή", "Defends this choice") : say(lang, "Υπερασπίζεται διαφορετική οπτική", "Defends a different perspective")}</strong></article>)}</div></div>}
    <div className="destination-hero">
      <div className="destination-verdict"><span className="eyebrow">{say(lang, "Η ΤΕΛΙΚΗ ΕΤΥΜΗΓΟΡΙΑ", "THE FINAL VERDICT")}</span><h2>{recommendation.fitStatus==="compromise"?say(lang,`${recommendation.destination}: η πιο τίμια ισορροπία για όσα ζήτησες.`,`${recommendation.destination}: the most honest balance for your brief.`):say(lang,`${recommendation.destination}: τώρα ξέρεις γιατί αξίζει να την επιλέξεις.`,`${recommendation.destination}: now you know why it is worth choosing.`)}</h2><p>{insights?.overview || recommendation.why}</p><div className="verdict-reasons"><span><Check size={17} weight="bold" /> {topReason(recommendation, lang)}</span><span><Check size={17} weight="bold" /> {recommendation.budgetLabel}</span><span><Check size={17} weight="bold" /> {recommendation.effortLabel}</span></div><div className="tradeoff-block"><ShieldCheck size={23} weight="duotone" /><div><small>{say(lang, "Ειλικρινές heads-up", "Honest heads-up")}</small><strong>{tradeoff(recommendation, lang)}</strong></div></div></div>
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

function polishVerdict(value: string, lang: Lang, recommendation: V8Recommendation) {
  if (/\d/.test(value)) return say(lang, `${recommendation.destination}: παραμένει δυνατή επιλογή μετά τον έλεγχο εποχής, μετακίνησης, κόστους και των πιθανών συμβιβασμών.`, `${recommendation.destination}: remains a strong choice after checking timing, travel effort, cost and the likely trade-offs.`);
  if (lang === "en") return value.replace(/\bperfect(?:ly)?\b/gi, "very well");
  return value
    .replace(/ταιριάζει απόλυτα/gi, "ταιριάζει πολύ καλά")
    .replace(/\bιδανικ(ή|ός|ό)\b/gi, "δυνατ$1")
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
