"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { RecommendationResponse, TripRecommendation } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

type View = "explore" | "processing" | "results";
type Editor = "origin" | "when" | "time" | "budget" | "moods" | "people" | null;

type StayPlace = {
  id: string;
  property_name: string;
  location_label?: string | null;
  address?: string | null;
  hero_image_url?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  currency?: string | null;
  demand_score?: number | null;
  valid_to_max?: string | null;
  offer_count?: number | null;
  outboundEligible: boolean;
};
type StayResponse = {
  mapped: boolean;
  places: StayPlace[];
  disclosure?: string;
  source?: string;
};

const defaultRequest: TripRequest = {
  origin: "Athens",
  month: "october",
  nights: 3,
  budget: 500,
  moods: ["romantic", "food"],
  travelerType: "couple"
};

const moodOptions: Array<{ value: TripRequest["moods"][number]; label: string; glyph: string }> = [
  { value: "relax", label: "slow", glyph: "◌" },
  { value: "romantic", label: "romantic", glyph: "♡" },
  { value: "food", label: "food", glyph: "✦" },
  { value: "warmth", label: "warm", glyph: "☀︎" },
  { value: "city", label: "city", glyph: "▦" },
  { value: "culture", label: "culture", glyph: "◇" },
  { value: "nature", label: "nature", glyph: "⌁" },
  { value: "adventure", label: "adventure", glyph: "↗" }
];

const fallbackArt: Record<string, string> = {
  rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1800&q=88",
  budapest: "https://images.unsplash.com/photo-1549877452-9c387954fbc2?auto=format&fit=crop&w=1800&q=88",
  istanbul: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1800&q=88",
  madrid: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1800&q=88",
  prague: "https://images.unsplash.com/photo-1519671282429-b44660ead0a7?auto=format&fit=crop&w=1800&q=88",
  nafplio: "https://images.unsplash.com/photo-1675870962160-3f7f9adf2a10?auto=format&fit=crop&w=1800&q=88",
  thessaloniki: "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=1800&q=88",
  rhodes: "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=1800&q=88",
  fallback: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1800&q=88"
};

const monthLabel = (month: TripRequest["month"]) => month === "flexible" ? "flexible dates" : `${month[0].toUpperCase()}${month.slice(1)} 2026`;
const moodLabel = (moods: TripRequest["moods"]) => moods.map((m) => moodOptions.find((x) => x.value === m)?.label ?? m).join(" + ");

function Ring({ value, label, note }: { value: number; label: string; note: string }) {
  return <div className="signal-ring" style={{ "--ring": `${Math.max(8, Math.min(100, value))}%` } as CSSProperties}>
    <div><strong>{label}</strong><span>{note}</span></div>
  </div>;
}

function Breakdown({ trip }: { trip: TripRecommendation }) {
  const items = [
    ["time", trip.breakdown.constraints], ["intent", trip.breakdown.intent], ["season", trip.breakdown.season],
    ["effort", trip.breakdown.transport], ["budget", trip.breakdown.budget], ["evidence", trip.breakdown.evidence]
  ] as const;
  return <div className="soft-metrics">{items.map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}</strong></div>)}</div>;
}

function RecommendationCard({ trip, featured, onChoose }: { trip: TripRecommendation; featured?: boolean; onChoose: () => void }) {
  const image = trip.imageUrl || fallbackArt[trip.destinationId] || fallbackArt.fallback;
  return <article className={featured ? "result-card featured-result" : "result-card"}>
    <div className="result-image" style={{ backgroundImage: `linear-gradient(180deg,rgba(10,20,15,.02),rgba(10,20,15,.68)),url(${image})` }}>
      <div className="result-image-top"><span>{trip.role}</span><span>{trip.country}</span></div>
      <div className="result-image-bottom"><small>{trip.confidence.toLowerCase()} confidence</small><h3>{trip.destination}</h3></div>
    </div>
    <div className="result-copy">
      <div className="fit-line"><div className="fit-score"><strong>{trip.score}</strong><span>fit</span></div><div><span className="micro-label">Planning range</span><b>{trip.estimatedBudget.replace(" (planning estimate)", "")}</b></div></div>
      <p className="result-reason">{trip.reason}</p>
      <div className="result-tags">{trip.tags.map((tag) => <span key={tag}>{tag.replaceAll("-", " ")}</span>)}</div>
      <Breakdown trip={trip} />
      <div className="evidence-note"><span>{trip.freshness === "verified" ? "Verified evidence" : trip.freshness === "stale" ? "Refresh needed" : "Planning evidence"}</span><p>{trip.risk}</p></div>
      <button type="button" className="ink-button" onClick={onChoose}>Make {trip.destination} practical <span>→</span></button>
    </div>
  </article>;
}

export function TravelDecisionExperience() {
  const [view, setView] = useState<View>("explore");
  const [editor, setEditor] = useState<Editor>(null);
  const [draft, setDraft] = useState<TripRequest>(defaultRequest);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [selected, setSelected] = useState<TripRecommendation | null>(null);
  const [stays, setStays] = useState<StayResponse | null>(null);
  const [staysLoading, setStaysLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripDna = useMemo(() => ({
    time: draft.nights <= 3 ? [92, "quick escape"] : [76, "more room"],
    budget: draft.budget <= 400 ? [72, "value-led"] : draft.budget <= 800 ? [88, "balanced"] : [94, "open range"],
    intent: [Math.min(96, 68 + draft.moods.length * 9), moodLabel(draft.moods)],
    friction: [draft.nights <= 3 ? 91 : 80, "low effort first"]
  }), [draft]);

  useEffect(() => {
    if (!selected) { setStays(null); return; }
    const controller = new AbortController();
    setStaysLoading(true);
    fetch(`/api/stays?destination_id=${encodeURIComponent(selected.destinationId)}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<StayResponse> : { mapped: false, places: [] } as StayResponse)
      .then(setStays)
      .catch(() => setStays({ mapped: false, places: [] }))
      .finally(() => setStaysLoading(false));
    return () => controller.abort();
  }, [selected]);

  function toggleMood(mood: TripRequest["moods"][number]) {
    const active = draft.moods.includes(mood);
    const next = active ? draft.moods.filter((x) => x !== mood) : [...draft.moods, mood].slice(-3);
    if (next.length) setDraft({ ...draft, moods: next });
  }

  async function runRecommendation(request: TripRequest) {
    setError(null); setSelected(null); setStays(null); setEditor(null); setView("processing");
    try {
      const response = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Recommendation failed");
      setResult(data as RecommendationResponse); setDraft((data as RecommendationResponse).request); setView("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build your decision set."); setView("explore");
    }
  }

  function refine(refinement: TripRequest["refinement"]) {
    const request = { ...draft, refinement }; setDraft(request); void runRecommendation(request);
  }

  const editorTray = <div className={`editor-tray ${editor ? "open" : ""}`} aria-live="polite">
    {editor === "origin" && <div className="editor-inner"><span>Leaving from</span><input autoFocus value={draft.origin} onChange={(e) => setDraft({ ...draft, origin: e.target.value })} onBlur={() => setEditor(null)} /></div>}
    {editor === "when" && <div className="editor-options">{(["september", "october", "november", "flexible"] as const).map((month) => <button type="button" className={draft.month === month ? "active" : ""} key={month} onClick={() => { setDraft({ ...draft, month }); setEditor(null); }}>{monthLabel(month)}</button>)}</div>}
    {editor === "time" && <div className="editor-options">{[2,3,4,5].map((n) => <button type="button" className={draft.nights === n ? "active" : ""} key={n} onClick={() => { setDraft({ ...draft, nights: n }); setEditor(null); }}>{n} nights</button>)}</div>}
    {editor === "budget" && <div className="editor-options">{[300,500,800,1200].map((budget) => <button type="button" className={draft.budget === budget ? "active" : ""} key={budget} onClick={() => { setDraft({ ...draft, budget }); setEditor(null); }}>€{budget} pp</button>)}</div>}
    {editor === "moods" && <div className="editor-options mood-options">{moodOptions.map((mood) => <button type="button" className={draft.moods.includes(mood.value) ? "active" : ""} key={mood.value} onClick={() => toggleMood(mood.value)}><b>{mood.glyph}</b>{mood.label}</button>)}</div>}
    {editor === "people" && <div className="editor-options">{(["solo","couple","family","friends"] as const).map((people) => <button type="button" className={draft.travelerType === people ? "active" : ""} key={people} onClick={() => { setDraft({ ...draft, travelerType: people }); setEditor(null); }}>{people}</button>)}</div>}
  </div>;

  return <div className="travel-v3">
    <header className="v3-nav"><a href="#top" className="v3-brand">Travel AI<span>decision OS</span></a><div className="nav-center">3 trips · chosen for your reality</div><a href="/admin" className="nav-link">system</a></header>

    <main id="top">
      <section className="v3-hero">
        <div className="hero-story">
          <div className="eyebrow">Decision before booking</div>
          <h1>Three trips.<br/><em>Not 300 tabs.</em></h1>
          <p>Tell us the shape of the escape. We test time, budget, season, effort and intent — then keep only three trips worth your attention.</p>
          <div className="trust-row"><span><b>01</b> reality first</span><span><b>02</b> exactly three</span><span><b>03</b> confidence visible</span></div>
        </div>
        <div className="hero-collage" aria-label="Travel inspiration collage">
          <div className="hero-shot hero-shot-main"><span>city energy</span></div>
          <div className="hero-shot hero-shot-small a"><span>closer</span></div>
          <div className="hero-shot hero-shot-small b"><span>warmer</span></div>
          <div className="hero-orbit"><i/><i/><i/><strong>ATH</strong><small>decision radius</small></div>
        </div>
      </section>

      <section className="decision-canvas" aria-label="Trip criteria">
        <div className="canvas-label"><span>Your escape, in one sentence</span><small>Tap any highlighted part to change it.</small></div>
        <div className="escape-sentence">
          <span>I can leave from</span><button type="button" onClick={() => setEditor(editor === "origin" ? null : "origin")}>{draft.origin}</button>
          <span>in</span><button type="button" onClick={() => setEditor(editor === "when" ? null : "when")}>{monthLabel(draft.month)}</button>
          <span>for</span><button type="button" onClick={() => setEditor(editor === "time" ? null : "time")}>{draft.nights} nights</button>
          <span>with about</span><button type="button" onClick={() => setEditor(editor === "budget" ? null : "budget")}>€{draft.budget} pp</button>
          <span>and I want</span><button type="button" onClick={() => setEditor(editor === "moods" ? null : "moods")}>{moodLabel(draft.moods)}</button>
          <span>going as a</span><button type="button" onClick={() => setEditor(editor === "people" ? null : "people")}>{draft.travelerType}</button><span>.</span>
        </div>
        {editorTray}
        <div className="canvas-bottom">
          <div className="dna"><Ring value={tripDna.time[0] as number} label="Time" note={tripDna.time[1] as string}/><Ring value={tripDna.budget[0] as number} label="Budget" note={tripDna.budget[1] as string}/><Ring value={tripDna.intent[0] as number} label="Feel" note={tripDna.intent[1] as string}/><Ring value={tripDna.friction[0] as number} label="Effort" note={tripDna.friction[1] as string}/></div>
          <button type="button" className="decision-cta" onClick={() => void runRecommendation(draft)}><span>Show me my 3</span><b>→</b></button>
        </div>
        {error && <p className="inline-error">{error}</p>}
      </section>

      {view === "processing" && <section className="reality-check"><div className="reality-orbit"><i/><i/><i/><i/></div><div><div className="eyebrow">Reality check</div><h2>Testing the trip, not selling the destination.</h2><div className="check-stream"><span>time + traveler fit</span><span>season + intent</span><span>budget tolerance</span><span>effort + diversity</span><span>evidence confidence</span><span>stay supply when mapped</span></div></div></section>}

      {view === "results" && result && <section className="decision-results">
        <div className="section-heading"><div><div className="eyebrow">Your decision set</div><h2>Three different reasons to go.</h2><p>Destination ranking is user-first. Affiliate supply never changes the order.</p></div><button type="button" className="text-button" onClick={() => { setView("explore"); setSelected(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>reshape the escape ↗</button></div>
        <RecommendationCard trip={result.recommendations[0]} featured onChoose={() => setSelected(result.recommendations[0])}/>
        <div className="alternate-grid">{result.recommendations.slice(1).map((trip) => <RecommendationCard key={trip.destinationId} trip={trip} onChoose={() => setSelected(trip)}/>)}</div>
        <div className="refine-bar"><span>Move the decision:</span>{(["cheaper","warmer","closer","shorter","romantic","adventurous"] as const).map((r) => <button type="button" key={r} onClick={() => refine(r)}>{r}</button>)}</div>
        <p className="system-disclosure">Engine: <b>{result.mode}</b> · destination store: <b>{result.dataSource}</b> · prices shown in destination ranking remain planning estimates.</p>
      </section>}

      {selected && <section className="make-it-real" id="basket">
        <div className="section-heading basket-heading"><div><div className="eyebrow">Make it real · {selected.destination}</div><h2>Now the supply layer can help.</h2></div><p>Commerce appears after the trip decision. Unknown program/property/tracking eligibility means no tracked CTA.</p></div>
        <div className="basket-rail"><div><span>01</span><b>GET THERE</b><small>route evidence</small></div><div className="active"><span>02</span><b>STAY</b><small>feed-mapped supply</small></div><div><span>03</span><b>PACK</b><small>trip-fit only</small></div><div><span>04</span><b>EXPERIENCE</b><small>few, contextual</small></div></div>
        <div className="stay-panel">
          <div className="stay-intro"><span className="live-dot"/> <b>Stay intelligence</b><p>{staysLoading ? "Matching current stay supply…" : stays?.mapped ? `${stays.places.length} relevant place signals surfaced from the Linkwise feed.` : "This destination is not yet mapped to the current Greece stay feed."}</p></div>
          {stays?.mapped && stays.places.length > 0 && <div className="stay-grid">{stays.places.map((place) => <article className="stay-card" key={place.id}>
            <div className="stay-photo" style={{ backgroundImage: `url(${place.hero_image_url || fallbackArt.fallback})` }}><span>{place.location_label || selected.destination}</span></div>
            <div className="stay-copy"><h3>{place.property_name}</h3><p>{place.address || place.location_label}</p><div className="stay-meta"><b>{place.min_price ? `from €${Number(place.min_price).toFixed(0)}` : "price observed"}</b><span>{place.offer_count ?? 1} feed offer{(place.offer_count ?? 1) === 1 ? "" : "s"}</span></div><div className="locked-cta">Supply verified · outbound locked</div></div>
          </article>)}</div>}
          {stays?.disclosure && <p className="feed-disclosure">{stays.disclosure}</p>}
        </div>
      </section>}

      <section className="method-strip"><div><span>FACTS</span><i>→</i><span>ENGINE</span><i>→</i><span>AI</span></div><p>AI explains the decision. Structured evidence decides what it is allowed to say.</p></section>
    </main>
    <footer className="v3-footer"><span>Travel AI · Greece-origin decision intelligence</span><span>Useful decision rate &gt; click rate</span></footer>
  </div>;
}
