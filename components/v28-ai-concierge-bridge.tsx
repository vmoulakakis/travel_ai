"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Compass, Sparkle, X } from "@phosphor-icons/react";
import type { EntryMode, Mood, Month, TripRequest } from "@/lib/validation/trip";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";

type Lang = "el" | "en";
type StartDetail = { mode: EntryMode; text?: string; destination?: string; moods?: Mood[] };
type StreamEvent = { type: string; message?: string; result?: V8RecommendationResponse };

const stageText: Record<string, [string, string]> = {
  "understand:start": ["Καταλαβαίνω τι πραγματικά ζητάς", "Understanding what you really need"],
  "catalog:start": ["Ανοίγω τον επαληθευμένο κατάλογο της Ελλάδας", "Opening the verified Greece catalog"],
  "shortlist:ready": ["Κρατάω μόνο τα βιώσιμα matches", "Keeping only viable matches"],
  "stay:start": ["Ελέγχω τα βασικά stay constraints", "Checking the key stay constraints"],
  "weather:start": ["Ελέγχω εποχή και συνθήκες", "Checking season and conditions"],
  "research:start": ["Διασταυρώνω evidence για τους finalists", "Cross-checking evidence for the finalists"],
  "verify:start": ["Προσπαθώ να απορρίψω τις αδύναμες επιλογές", "Trying to reject weak options"],
  "council:start": ["Το AI council υπερασπίζεται την τελική τριάδα", "The AI council is defending the final three"],
};

const say = (lang: Lang, el: string, en: string) => (lang === "el" ? el : en);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400000);
const monthFromDate = (date: Date): Month => {
  const month = date.getUTCMonth() + 1;
  return month === 9 ? "september" : month === 10 ? "october" : month === 11 ? "november" : "flexible";
};

function inferBudget(text: string) {
  const matches = [...text.matchAll(/(?:€|eur\s*)?([1-5]?\d{3,4})(?:\s*€|\s*eur)?/gi)].map(match => Number(match[1])).filter(value => value >= 150 && value <= 5000);
  return matches.length ? matches[matches.length - 1] : 1200;
}

function inferTraveler(text: string): Pick<TripRequest, "travelerType" | "groupSize"> {
  const normalized = text.toLocaleLowerCase("el");
  if (/οικογ|family|kids|παιδ/.test(normalized)) return { travelerType: "family", groupSize: 4 };
  if (/φίλ|παρέα|friends|group/.test(normalized)) return { travelerType: "friends", groupSize: 4 };
  if (/μόνος|μόνη|solo|alone/.test(normalized)) return { travelerType: "solo", groupSize: 1 };
  return { travelerType: "couple", groupSize: 2 };
}

function buildQuickRequest(detail: StartDetail, lang: Lang): TripRequest {
  const text = detail.text ?? "";
  const start = addDays(new Date(), 30);
  const end = addDays(start, 5);
  const traveler = inferTraveler(text);
  const normalized = text.toLocaleLowerCase("el");
  const noCar = /χωρίς\s+(πολύ\s+)?(?:αυτοκίνητο|οδήγηση)|no\s+car|without\s+(much\s+)?driving|little\s+driving/.test(normalized);
  const quiet = /ήσυχ|ηρεμ|quiet|calm|peace/.test(normalized);
  return {
    origin: /θεσσαλον|thessaloniki/.test(normalized) ? "Thessaloniki" : "Athens",
    startDate: iso(start),
    endDate: iso(end),
    month: monthFromDate(start),
    nights: 5,
    budget: inferBudget(text),
    moods: detail.moods?.length ? detail.moods.slice(0, 3) : ["relax", "warmth"],
    travelerType: traveler.travelerType,
    groupSize: traveler.groupSize,
    language: lang,
    distancePreference: noCar ? "easy-hop" : "any",
    pace: quiet ? "slow" : "balanced",
    hotelStyle: "any",
    avoid: quiet ? "crowds" : "none",
    entryMode: detail.mode,
    desiredEnergy: quiet ? "restore" : "balanced",
    socialPreference: quiet ? "quiet" : "balanced",
    noveltyPreference: detail.mode === "surprise" ? "surprise" : "balanced",
    mustHave: /θάλασσ|παραλί|sea|beach/.test(normalized) ? "sea" : "none",
    dateFlexibility: "few-days",
    transportMode: noCar ? "no-car" : "any",
    stayLocationPreference: noCar ? "central" : "balanced",
    ...(detail.destination ? { consideredDestination: detail.destination } : {}),
    ...(text ? { tripText: text.slice(0, 320) } : {}),
  };
}

export function V28AiConciergeBridge({ initialLang = "el" }: { initialLang?: Lang }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [result, setResult] = useState<V8RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  function goToFunnel(detail: StartDetail) {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("mode", detail.mode);
    if (detail.destination) url.searchParams.set("destination", detail.destination);
    url.hash = "discovery";
    window.location.assign(url.toString());
  }

  async function runQuick(detail: StartDetail) {
    if (running.current) return;
    running.current = true;
    setOpen(true);
    setLoading(true);
    setEvents([]);
    setResult(null);
    setError(null);
    const request = buildQuickRequest(detail, initialLang);
    try {
      const response = await fetch("/api/recommend/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok || !response.body) throw new Error("recommendation-unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let complete = false;
      while (!complete) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          const label = stageText[event.type]?.[initialLang === "el" ? 0 : 1];
          if (label) setEvents(current => [...current.filter(item => item !== label), label].slice(-5));
          if (event.type === "final" && event.result) {
            setResult(event.result);
            complete = true;
            await reader.cancel();
            break;
          }
          if (event.type === "continuity" || event.type === "error") throw new Error("recommendation-unavailable");
        }
      }
      if (!complete) throw new Error("recommendation-incomplete");
    } catch {
      setError(say(initialLang, "Ο AI advisor δεν ολοκλήρωσε τη γρήγορη σύγκριση. Μπορείς να συνεχίσεις στο αναλυτικό planner.", "The AI advisor could not finish the quick comparison. You can continue in the detailed planner."));
    } finally {
      running.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<StartDetail>).detail;
      if (!detail) return;
      if (detail.mode === "unknown" && detail.text?.trim()) void runQuick(detail);
      else goToFunnel(detail);
    };
    window.addEventListener("travel:v28-start", handler);
    return () => window.removeEventListener("travel:v28-start", handler);
  }, [initialLang]);

  if (!open) return null;

  return <div className="v28-concierge-backdrop" role="dialog" aria-modal="true" aria-label={say(initialLang, "AI αποτελέσματα", "AI results")}>
    <section className="v28-concierge-panel">
      <header>
        <div className="v28-concierge-title"><span><Sparkle size={17} weight="fill" /></span><div><strong>{say(initialLang, "AI Greece Concierge", "AI Greece Concierge")}</strong><small>{say(initialLang, "Live σύγκριση από τον V26 decision engine", "Live comparison by the V26 decision engine")}</small></div></div>
        <button className="v28-concierge-close" onClick={() => setOpen(false)} aria-label={say(initialLang, "Κλείσιμο", "Close")}><X size={20} /></button>
      </header>

      {loading && <div className="v28-concierge-loading">
        <div className="v28-orbit"><Compass size={28} weight="duotone" /><span /><span /></div>
        <h2>{say(initialLang, "Η ομάδα συγκρίνει την Ελλάδα για εσένα.", "The team is comparing Greece for you.")}</h2>
        <div className="v28-agent-log">
          {events.length === 0 ? <p><Sparkle size={15} /> {say(initialLang, "Ξεκινά η ανάλυση…", "Starting the analysis…")}</p> : events.map((event, index) => <p key={`${event}-${index}`}><Check size={15} weight="bold" /> {event}</p>)}
        </div>
      </div>}

      {!loading && result && <div className="v28-concierge-results">
        <div className="v28-results-intro"><span>{say(initialLang, "TOP AI MATCHES", "TOP AI MATCHES")}</span><h2>{say(initialLang, "Τρεις διαφορετικοί δρόμοι που αξίζει να κοιτάξεις.", "Three different paths worth considering.")}</h2><p>{result.profileSummary}</p></div>
        <div className="v28-quick-grid">
          {result.recommendations.slice(0, 3).map((recommendation, index) => <article key={recommendation.slug}>
            <div className="v28-quick-photo" style={{ backgroundImage: `url('/api/destination-photo?slug=${recommendation.slug}')` }}><span>#{index + 1}</span><strong>{Math.round(recommendation.score)}%</strong></div>
            <div className="v28-quick-copy"><small>{recommendation.explorationRole.replaceAll("_", " ")}</small><h3>{initialLang === "el" ? recommendation.destination : recommendation.destinationEn}</h3><p>{recommendation.why}</p><div><span>{recommendation.effortLabel}</span><span>{recommendation.budgetLabel}</span></div><button onClick={() => goToFunnel({ mode: "idea", destination: recommendation.slug })}>{say(initialLang, "Συνέχισε με αυτή", "Continue with this")} <ArrowRight size={17} /></button></div>
          </article>)}
        </div>
        <div className="v28-results-actions"><button onClick={() => goToFunnel({ mode: "unknown" })}>{say(initialLang, "Θέλω πιο αναλυτικό matching", "I want deeper matching")}</button><button onClick={() => setOpen(false)}>{say(initialLang, "Συνέχισε την εξερεύνηση", "Keep exploring")}</button></div>
      </div>}

      {!loading && error && <div className="v28-concierge-error"><Sparkle size={28} /><h2>{say(initialLang, "Πάμε στο πλήρες planner.", "Let’s use the full planner.")}</h2><p>{error}</p><button onClick={() => goToFunnel({ mode: "unknown" })}>{say(initialLang, "Άνοιξε το AI planner", "Open the AI planner")} <ArrowRight size={18} /></button></div>}
    </section>
  </div>;
}
