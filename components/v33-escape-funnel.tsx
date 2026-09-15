"use client";

import { FormEvent, useMemo, useState } from "react";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";

type Lang = "el" | "en";
type DateWindow = { id: string; labelEl: string; labelEn: string; noteEl: string; noteEn: string; start: string; end: string };
type Need = { id: string; mood: string; energy: string; social: string; avoid: string; labelEl: string; labelEn: string; copyEl: string; copyEn: string };
type StreamRow = { type: string; progress: number; message?: string; payload?: Record<string, unknown> };

const say = (lang: Lang, el: string, en: string) => (lang === "el" ? el : en);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const add = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

function nextWeekday(base: Date, weekday: number) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  let delta = (weekday - d.getUTCDay() + 7) % 7;
  if (delta === 0) delta = 7;
  return add(d, delta);
}

function buildDateWindows(): DateWindow[] {
  const now = new Date();
  const friday = nextWeekday(now, 5);
  const nextFriday = add(friday, 7);
  const nextThursday = add(friday, 6);
  const saturday = nextWeekday(now, 6);
  return [
    { id: "this-weekend", labelEl: "Αυτό το ΣΚ", labelEn: "This weekend", noteEl: "2 νύχτες · γρήγορη απόδραση", noteEn: "2 nights · quick reset", start: iso(friday), end: iso(add(friday, 2)) },
    { id: "next-weekend", labelEl: "Επόμενο ΣΚ", labelEn: "Next weekend", noteEl: "2 νύχτες · περισσότερο περιθώριο", noteEn: "2 nights · more choice", start: iso(nextFriday), end: iso(add(nextFriday, 2)) },
    { id: "long-weekend", labelEl: "Θέλω 3–4 μέρες", labelEn: "I want 3–4 days", noteEl: "Πέμπτη–Κυριακή · πραγματική ανάσα", noteEn: "Thu–Sun · a proper break", start: iso(nextThursday), end: iso(add(nextThursday, 3)) },
    { id: "week", labelEl: "Μία εβδομάδα", labelEn: "One week", noteEl: "7 νύχτες · πλήρης αποφόρτιση", noteEn: "7 nights · full reset", start: iso(saturday), end: iso(add(saturday, 7)) },
  ];
}

const needs: Need[] = [
  { id: "switch-off", mood: "relax", energy: "restore", social: "quiet", avoid: "crowds", labelEl: "Θέλω να σβήσω", labelEn: "I need to switch off", copyEl: "Ήσυχα, εύκολα, χωρίς πρόγραμμα-μαραθώνιο.", copyEn: "Calm, easy and no itinerary marathon." },
  { id: "together", mood: "romantic", energy: "balanced", social: "quiet", avoid: "none", labelEl: "Χρειαζόμαστε χρόνο μαζί", labelEn: "We need time together", copyEl: "Όμορφες στιγμές, φαγητό, βόλτες, λίγη μαγεία.", copyEn: "Beautiful moments, food, walks and a little magic." },
  { id: "sun", mood: "warmth", energy: "restore", social: "balanced", avoid: "none", labelEl: "Χρειάζομαι ήλιο", labelEn: "I need sun", copyEl: "Ζεστότερη αίσθηση και όσο γίνεται λιγότερο ρίσκο εποχής.", copyEn: "Warmer feel with lower seasonal risk." },
  { id: "family", mood: "nature", energy: "balanced", social: "balanced", avoid: "long-travel", labelEl: "Να περάσουμε καλά με τα παιδιά", labelEn: "Make it easy with the kids", copyEl: "Λιγότερη ταλαιπωρία, περισσότερη ουσιαστική εμπειρία.", copyEn: "Less friction, more real family time." },
  { id: "adventure", mood: "adventure", energy: "stimulating", social: "balanced", avoid: "none", labelEl: "Θέλω κάτι που θα θυμάμαι", labelEn: "I want something memorable", copyEl: "Διαφορετικό, ζωντανό, όχι άλλη μία προβλέψιμη απόδραση.", copyEn: "Different, vivid and not another predictable escape." },
  { id: "spoil", mood: "food", energy: "balanced", social: "lively", avoid: "none", labelEl: "Θέλω να καλοπεράσω", labelEn: "I want to feel spoiled", copyEl: "Καλό φαγητό, ωραία ατμόσφαιρα και αίσθηση ότι άξιζε.", copyEn: "Great food, atmosphere and a feeling it was worth it." },
];

function groupSize(type: string) {
  return type === "solo" ? 1 : type === "couple" ? 2 : 4;
}

export function V33EscapeFunnel({ lang = "el" }: { lang?: Lang }) {
  const windows = useMemo(buildDateWindows, []);
  const [windowId, setWindowId] = useState(windows[0]?.id ?? "this-weekend");
  const [needId, setNeedId] = useState(needs[0].id);
  const [travelerType, setTravelerType] = useState("couple");
  const [origin, setOrigin] = useState("Athens");
  const [budget, setBudget] = useState(900);
  const [tripText, setTripText] = useState("");
  const [rows, setRows] = useState<StreamRow[]>([]);
  const [result, setResult] = useState<V8RecommendationResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedWindow = windows.find((x) => x.id === windowId) ?? windows[0];
  const selectedNeed = needs.find((x) => x.id === needId) ?? needs[0];
  const progress = rows.at(-1)?.progress ?? 0;

  async function solve(event: FormEvent) {
    event.preventDefault();
    if (!selectedWindow || !selectedNeed) return;
    setBusy(true); setRows([]); setResult(null); setError(null);
    const startMs = Date.parse(`${selectedWindow.start}T00:00:00Z`);
    const endMs = Date.parse(`${selectedWindow.end}T00:00:00Z`);
    const payload = {
      origin,
      startDate: selectedWindow.start,
      endDate: selectedWindow.end,
      month: "flexible",
      nights: Math.max(1, Math.round((endMs - startMs) / 86_400_000)),
      budget,
      travelerType,
      groupSize: groupSize(travelerType),
      moods: [selectedNeed.mood],
      language: lang,
      distancePreference: "any",
      pace: selectedNeed.energy === "restore" ? "slow" : "balanced",
      hotelStyle: "any",
      avoid: selectedNeed.avoid,
      entryMode: "unknown",
      desiredEnergy: selectedNeed.energy,
      socialPreference: selectedNeed.social,
      noveltyPreference: needId === "adventure" ? "surprise" : "balanced",
      mustHave: needId === "sun" ? "sea" : "none",
      dateFlexibility: "few-days",
      transportMode: "any",
      stayLocationPreference: "balanced",
      tripText: tripText.trim() || say(lang, selectedNeed.copyEl, selectedNeed.copyEn),
    };
    try {
      const response = await fetch("/api/recommend/stream", { method: "POST", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("stream unavailable");
      const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const item = JSON.parse(line) as StreamRow & { result?: V8RecommendationResponse };
          if (item.type === "final" && item.result) setResult(item.result);
          else setRows((current) => [...current, item]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : say(lang, "Δεν ολοκληρώθηκε η ανάλυση.", "Analysis did not complete."));
    } finally { setBusy(false); }
  }

  const shortlist = result?.recommendations.slice(0, 3) ?? [];
  const labels = [say(lang, "Η επιλογή μου", "The one I'd pick"), say(lang, "Η έξυπνη αξία", "Smart value"), say(lang, "Η απρόσμενη", "The wildcard")];

  return <main className="escape-v33">
    <section className="escape-hero-v33">
      <div className="escape-nav-v33"><a href={lang === "en" ? "/en" : "/"} className="escape-brand-v33">AI TRAVEL <span>ESCAPE</span></a><a href={lang === "en" ? "/" : "/en"}>{lang === "en" ? "Ελληνικά" : "English"}</a></div>
      <div className="escape-hero-grid-v33">
        <div><span className="escape-kicker-v33">AI HOLIDAY SOLVER · DATE → FEELING → FIT</span><h1>{say(lang, "Δεν χρειάζεται να ξέρεις πού θέλεις να πας.", "You don't need to know where you want to go.")}</h1><p>{say(lang, "Πες μου πότε μπορείς να φύγεις και τι χρειάζεσαι πραγματικά από αυτή την απόδραση. Θα περιορίσω τον κόσμο στις 3 επιλογές που βγάζουν περισσότερο νόημα για εσένα.", "Tell me when you can leave and what you actually need from this break. I’ll narrow the world to three escapes that make the most sense for you.")}</p></div>
        <div className="escape-orbit-v33"><div className="escape-orbit-core-v33">YOUR<br/>ESCAPE</div><span>DATE</span><span>MOOD</span><span>WEATHER</span><span>VALUE</span></div>
      </div>
    </section>

    <form className="escape-flow-v33" onSubmit={solve}>
      <section className="escape-step-v33"><div className="escape-step-head-v33"><span>01</span><div><h2>{say(lang, "Πότε μπορείς πραγματικά να φύγεις;", "When can you actually get away?")}</h2><p>{say(lang, "Ξεκινάμε από τον χρόνο σου — όχι από κατάλογο ξενοδοχείων.", "We start with your time — not a hotel catalogue.")}</p></div></div><div className="escape-choice-grid-v33">{windows.map((item) => <button type="button" key={item.id} onClick={() => setWindowId(item.id)} className={windowId === item.id ? "is-active" : ""}><strong>{say(lang, item.labelEl, item.labelEn)}</strong><small>{say(lang, item.noteEl, item.noteEn)}</small><span>{item.start} → {item.end}</span></button>)}</div></section>

      <section className="escape-step-v33"><div className="escape-step-head-v33"><span>02</span><div><h2>{say(lang, "Τι πρέπει να σου δώσει αυτή η απόδραση;", "What does this escape need to give you?")}</h2><p>{say(lang, "Όχι “beach/city”. Θέλω το πραγματικό σου need.", "Not “beach/city”. I want the real need behind the trip.")}</p></div></div><div className="escape-need-grid-v33">{needs.map((item) => <button type="button" key={item.id} onClick={() => setNeedId(item.id)} className={needId === item.id ? "is-active" : ""}><strong>{say(lang, item.labelEl, item.labelEn)}</strong><small>{say(lang, item.copyEl, item.copyEn)}</small></button>)}</div></section>

      <section className="escape-step-v33"><div className="escape-step-head-v33"><span>03</span><div><h2>{say(lang, "Δώσε μου μόνο ό,τι αλλάζει την απόφαση.", "Give me only what changes the decision.")}</h2><p>{say(lang, "Μετά το destination choice θα γίνει το ακριβό 360° research.", "The deeper 360° research starts only after you choose a destination.")}</p></div></div><div className="escape-input-grid-v33"><label>{say(lang, "Από πού ξεκινάς", "Starting from")}<input value={origin} onChange={(e) => setOrigin(e.target.value)} required minLength={2}/></label><label>{say(lang, "Παρέα", "Travellers")}<select value={travelerType} onChange={(e) => setTravelerType(e.target.value)}><option value="couple">{say(lang, "Ζευγάρι", "Couple")}</option><option value="family">{say(lang, "Οικογένεια", "Family")}</option><option value="friends">{say(lang, "Φίλοι", "Friends")}</option><option value="solo">Solo</option></select></label><label>Budget €<input type="number" min={150} max={5000} value={budget} onChange={(e) => setBudget(Number(e.target.value))}/></label><label className="escape-free-v33">{say(lang, "Αν θέλεις, πες μου κάτι ακόμη", "Anything else I should know?")}<textarea maxLength={320} value={tripText} onChange={(e) => setTripText(e.target.value)} placeholder={say(lang, "π.χ. χωρίς αυτοκίνητο, όχι πολύ κόσμο, θέλω καλό φαγητό…", "e.g. no car, fewer crowds, excellent food…")}/></label></div><button className="escape-primary-v33" disabled={busy}>{busy ? say(lang, "Οι agents ψάχνουν…", "Agents are investigating…") : say(lang, "Βρες τις 3 αποδράσεις μου →", "Find my 3 escapes →")}</button></section>
    </form>

    {(busy || rows.length > 0) && !result ? <section className="escape-investigation-v33"><div><span>AI MISSION</span><strong>{Math.min(100, progress)}%</strong></div><div className="escape-progress-v33"><i style={{ width: `${Math.min(100, progress)}%` }}/></div><p>{rows.at(-1)?.message || say(lang, "Οι agents αποκλείουν επιλογές που δεν αξίζουν τον χρόνο σου.", "The agents are eliminating options that do not deserve your time.")}</p></section> : null}
    {error ? <section className="escape-error-v33">{error}</section> : null}

    {result ? <section className="escape-results-v33"><div className="escape-result-intro-v33"><span className="escape-kicker-v33">MISSION SHORTLIST</span><h2>{say(lang, "Τρεις επιλογές επέζησαν.", "Three escapes survived.")}</h2><p>{result.profileSummary}</p></div><div className="escape-result-grid-v33">{shortlist.map((item, index) => { const href = `/escape/${item.slug}?start=${encodeURIComponent(selectedWindow.start)}&end=${encodeURIComponent(selectedWindow.end)}&budget=${budget}&travelerType=${travelerType}&mood=${encodeURIComponent(selectedNeed.mood)}&origin=${encodeURIComponent(origin)}&lang=${lang}`; return <article key={item.slug} className={index === 0 ? "is-winner" : ""}><span>{labels[index]}</span><div className="escape-score-v33">{item.score}<small>/100</small></div><h3>{lang === "en" ? item.destinationEn : item.destination}</h3><p>{item.why}</p><div className="escape-trade-v33"><strong>{say(lang, "Γιατί τώρα", "Why now")}</strong><span>{item.seasonNote}</span></div><div className="escape-tags-v33">{item.tags.slice(0, 4).map((tag) => <i key={tag}>{tag}</i>)}</div><a href={href}>{say(lang, "Ναι — χτίσε αυτή την απόδραση", "Yes — build this escape")}</a></article>; })}</div></section> : null}
  </main>;
}
